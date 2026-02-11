"""Fund API endpoints."""
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.fund import Fund as FundModel, NavHistory as NavHistoryModel, FundHolding as FundHoldingModel, UserFundPreference as UserFundPreferenceModel
from app.schemas.fund import (
    Fund,
    FundCreate,
    FundUpdate,
    NavHistory,
    RealtimeNav,
    PaginatedResponse,
    FundHoldingSchema,
    FundAssetAllocationSchema,
    UserFundPreference,
    UserFundPreferenceCreate,
    UserFundPreferenceUpdate,
)
from app.core.data_fetcher import data_fetcher
from app.core.nav_estimator import nav_estimator
from app.core.cache_manager import cache, get_cache_key
from app.config import settings

router = APIRouter()


@router.get("/funds", response_model=PaginatedResponse)
async def list_funds(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all tracked funds with pagination."""
    # Get total count
    count_query = select(func.count()).select_from(FundModel)
    total = await db.scalar(count_query)

    # Get paginated funds
    offset = (page - 1) * page_size
    query = select(FundModel).offset(offset).limit(page_size).order_by(FundModel.created_at.desc())
    result = await db.execute(query)
    funds = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size

    return {
        "items": [Fund.model_validate(fund) for fund in funds],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/funds/search")
async def search_funds(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    """Search funds by name or code."""
    # Search in database first
    query = select(FundModel).where(
        (FundModel.code.like(f"%{q}%")) | (FundModel.name.like(f"%{q}%"))
    )
    result = await db.execute(query)
    funds = result.scalars().all()

    return [Fund.model_validate(fund) for fund in funds]


# User Fund Preference Endpoints - must be defined before /funds/{code} to avoid route conflicts
@router.get("/funds/preferences", response_model=list[UserFundPreference])
async def get_user_fund_preferences(
    user_id: str = Query(..., description="User identifier"),
    db: AsyncSession = Depends(get_db),
):
    """Get all fund preferences for a user."""
    query = select(UserFundPreferenceModel).options(selectinload(UserFundPreferenceModel.fund))
    query = query.where(UserFundPreferenceModel.user_id == user_id)
    query = query.order_by(UserFundPreferenceModel.sort_order.asc(), UserFundPreferenceModel.created_at.desc())
    result = await db.execute(query)
    preferences = result.scalars().all()

    return [UserFundPreference.model_validate(pref) for pref in preferences]


@router.post("/funds/preferences", response_model=UserFundPreference, status_code=201)
async def set_fund_preference(
    preference_data: UserFundPreferenceCreate,
    user_id: str = Query(..., description="User identifier"),
    db: AsyncSession = Depends(get_db),
):
    """Create or update a fund preference for a user."""
    # Check if fund exists
    fund_query = select(FundModel).where(FundModel.id == preference_data.fund_id)
    fund_result = await db.execute(fund_query)
    fund = fund_result.scalar_one_or_none()

    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    # Check if preference already exists
    query = select(UserFundPreferenceModel).where(
        UserFundPreferenceModel.user_id == user_id,
        UserFundPreferenceModel.fund_id == preference_data.fund_id
    )
    result = await db.execute(query)
    existing_pref = result.scalar_one_or_none()

    if existing_pref:
        # Update existing preference
        if preference_data.is_visible is not None:
            existing_pref.is_visible = preference_data.is_visible
        if preference_data.sort_order is not None:
            existing_pref.sort_order = preference_data.sort_order
        await db.commit()
        await db.refresh(existing_pref)
        return UserFundPreference.model_validate(existing_pref)
    else:
        # Create new preference
        preference = UserFundPreferenceModel(
            user_id=user_id,
            **preference_data.model_dump()
        )
        db.add(preference)
        await db.commit()
        await db.refresh(preference)
        return UserFundPreference.model_validate(preference)


@router.put("/funds/preferences/batch", status_code=204)
async def batch_update_fund_preferences(
    updates: list[dict],
    user_id: str = Query(..., description="User identifier"),
    db: AsyncSession = Depends(get_db),
):
    """Batch update fund preference sort orders."""
    for update in updates:
        fund_id = update.get("fund_id")
        sort_order = update.get("sort_order")

        if fund_id is None or sort_order is None:
            continue

        query = select(UserFundPreferenceModel).where(
            UserFundPreferenceModel.user_id == user_id,
            UserFundPreferenceModel.fund_id == fund_id
        )
        result = await db.execute(query)
        pref = result.scalar_one_or_none()

        if pref:
            pref.sort_order = sort_order

    await db.commit()
    return None


@router.delete("/funds/preferences/{fund_id}", status_code=204)
async def delete_fund_preference(
    fund_id: int,
    user_id: str = Query(..., description="User identifier"),
    db: AsyncSession = Depends(get_db),
):
    """Delete a fund preference for a user."""
    query = select(UserFundPreferenceModel).where(
        UserFundPreferenceModel.user_id == user_id,
        UserFundPreferenceModel.fund_id == fund_id
    )
    result = await db.execute(query)
    preference = result.scalar_one_or_none()

    if not preference:
        raise HTTPException(status_code=404, detail="Preference not found")

    await db.delete(preference)
    await db.commit()

    return None


@router.get("/funds/{code}", response_model=Fund)
async def get_fund(code: str, db: AsyncSession = Depends(get_db)):
    query = select(FundModel).where(FundModel.code == code)
    result = await db.execute(query)
    fund = result.scalar_one_or_none()
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    return Fund.model_validate(fund)


@router.post("/funds", response_model=Fund, status_code=201)
async def create_fund(fund_data: FundCreate, db: AsyncSession = Depends(get_db)):
    """Add a fund to tracking list."""
    # Check if fund already exists
    query = select(FundModel).where(FundModel.code == fund_data.code)
    result = await db.execute(query)
    existing_fund = result.scalar_one_or_none()

    if existing_fund:
        raise HTTPException(status_code=400, detail="Fund already exists")

    # Fetch fund info from external API if not provided
    if not fund_data.name or not fund_data.type:
        fund_info = await data_fetcher.get_fund_info(fund_data.code)
        if fund_info:
            fund_data.name = fund_data.name or fund_info["name"]
            fund_data.type = fund_data.type or fund_info["type"]
            fund_data.company = fund_data.company or fund_info["company"]

    # Create fund
    fund = FundModel(**fund_data.model_dump())
    db.add(fund)
    await db.commit()
    await db.refresh(fund)

    # Fetch initial historical data
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=365)  # Last year
        historical_data = await data_fetcher.get_historical_nav(
            fund_data.code, start_date, end_date
        )

        # Save historical data
        for record in historical_data:
            nav_history = NavHistoryModel(
                fund_id=fund.id,
                date=record["date"],
                nav=record["nav"],
                accumulated_nav=record.get("accumulated_nav"),
                daily_growth=record.get("daily_growth"),
            )
            db.add(nav_history)

        await db.commit()
    except Exception as e:
        print(f"Error fetching historical data: {e}")

    return Fund.model_validate(fund)


@router.delete("/funds/{code}", status_code=204)
async def delete_fund(code: str, db: AsyncSession = Depends(get_db)):
    """Remove a fund from tracking list."""
    query = select(FundModel).where(FundModel.code == code)
    result = await db.execute(query)
    fund = result.scalar_one_or_none()

    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    await db.delete(fund)
    await db.commit()

    # Clear cache
    cache.delete_pattern(f"fund:{code}")

    return None


@router.put("/funds/{code}", response_model=Fund)
async def update_fund(code: str, fund_data: FundUpdate, db: AsyncSession = Depends(get_db)):
    """Update fund details (rename, update type, company, etc.)."""
    query = select(FundModel).where(FundModel.code == code)
    result = await db.execute(query)
    fund = result.scalar_one_or_none()

    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    # Update fields if provided
    if fund_data.name is not None:
        fund.name = fund_data.name
    if fund_data.type is not None:
        fund.type = fund_data.type
    if fund_data.company is not None:
        fund.company = fund_data.company

    await db.commit()
    await db.refresh(fund)

    # Clear cache
    cache.delete_pattern(f"fund:{code}")

    return Fund.model_validate(fund)


@router.get("/funds/{code}/nav/history", response_model=list[NavHistory])
async def get_nav_history(
    code: str,
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Get historical NAV data for a fund."""
    # Get fund
    fund_query = select(FundModel).where(FundModel.code == code)
    fund_result = await db.execute(fund_query)
    fund = fund_result.scalar_one_or_none()

    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    # Check cache
    cache_key = get_cache_key("fund", code, "nav", "history", str(start_date), str(end_date))
    cached = cache.get(cache_key)
    if cached:
        return cached

    # Build query
    query = select(NavHistoryModel).where(NavHistoryModel.fund_id == fund.id)

    if start_date:
        query = query.where(NavHistoryModel.date >= start_date)
    if end_date:
        query = query.where(NavHistoryModel.date <= end_date)

    query = query.order_by(NavHistoryModel.date.asc())

    result = await db.execute(query)
    history = result.scalars().all()

    response = [NavHistory.model_validate(h) for h in history]

    # Cache the result
    cache.set(cache_key, response, settings.cache_history_ttl)

    return response


@router.get("/funds/{code}/nav/realtime", response_model=RealtimeNav)
async def get_realtime_nav(code: str, db: AsyncSession = Depends(get_db)):
    """Get real-time NAV estimation for a fund."""
    # Check if fund exists
    query = select(FundModel).where(FundModel.code == code)
    result = await db.execute(query)
    fund = result.scalar_one_or_none()

    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    # Get estimated NAV with db session
    estimated_nav = await nav_estimator.get_estimated_nav(code, db_session=db)

    if not estimated_nav:
        raise HTTPException(status_code=503, detail="Unable to fetch real-time data")

    return RealtimeNav(**estimated_nav)


@router.get("/funds/{code}/holdings", response_model=list[FundHoldingSchema])
async def get_fund_holdings(
    code: str,
    date: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Get fund holdings for a specific date."""
    # Get fund
    fund_query = select(FundModel).where(FundModel.code == code)
    fund_result = await db.execute(fund_query)
    fund = fund_result.scalar_one_or_none()

    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    # Build query
    query = select(FundHoldingModel).where(FundHoldingModel.fund_id == fund.id)

    if date:
        query = query.where(FundHoldingModel.public_date == date)
    else:
        # Get most recent holdings
        subquery = (
            select(func.max(FundHoldingModel.public_date))
            .where(FundHoldingModel.fund_id == fund.id)
        )
        latest_date = await db.scalar(subquery)
        if latest_date:
            query = query.where(FundHoldingModel.public_date == latest_date)

    query = query.order_by(FundHoldingModel.holding_percentage.desc())

    result = await db.execute(query)
    holdings = result.scalars().all()

    return [FundHoldingSchema.model_validate(h) for h in holdings]
