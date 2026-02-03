"""Portfolio API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.fund import (
    Portfolio as PortfolioModel,
    PortfolioItem as PortfolioItemModel,
    Fund as FundModel,
)
from app.schemas.fund import (
    Portfolio,
    PortfolioCreate,
    PortfolioUpdate,
    PortfolioDetail,
    PortfolioItem,
    PortfolioItemCreate,
    PortfolioItemUpdate,
    PortfolioPerformance,
)
from app.core.nav_estimator import nav_estimator
from app.core.cache_manager import cache, get_cache_key
from app.config import settings

router = APIRouter()


@router.get("/portfolio", response_model=list[Portfolio])
async def list_portfolios(db: AsyncSession = Depends(get_db)):
    """List all portfolios."""
    query = select(PortfolioModel).order_by(PortfolioModel.created_at.desc())
    result = await db.execute(query)
    portfolios = result.scalars().all()

    return [Portfolio.model_validate(p) for p in portfolios]


@router.post("/portfolio", response_model=Portfolio, status_code=201)
async def create_portfolio(
    portfolio_data: PortfolioCreate, db: AsyncSession = Depends(get_db)
):
    """Create a new portfolio."""
    portfolio = PortfolioModel(**portfolio_data.model_dump())
    db.add(portfolio)
    await db.commit()
    await db.refresh(portfolio)

    return Portfolio.model_validate(portfolio)


@router.get("/portfolio/{portfolio_id}", response_model=PortfolioDetail)
async def get_portfolio(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    """Get portfolio details with holdings."""
    query = (
        select(PortfolioModel)
        .where(PortfolioModel.id == portfolio_id)
        .options(selectinload(PortfolioModel.items).selectinload(PortfolioItemModel.fund))
    )
    result = await db.execute(query)
    portfolio = result.scalar_one_or_none()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    return PortfolioDetail.model_validate(portfolio)


@router.put("/portfolio/{portfolio_id}", response_model=Portfolio)
async def update_portfolio(
    portfolio_id: int,
    portfolio_data: PortfolioUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update portfolio."""
    query = select(PortfolioModel).where(PortfolioModel.id == portfolio_id)
    result = await db.execute(query)
    portfolio = result.scalar_one_or_none()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Update fields
    for field, value in portfolio_data.model_dump(exclude_unset=True).items():
        setattr(portfolio, field, value)

    await db.commit()
    await db.refresh(portfolio)

    # Clear cache
    cache.delete_pattern(f"portfolio:{portfolio_id}")

    return Portfolio.model_validate(portfolio)


@router.delete("/portfolio/{portfolio_id}", status_code=204)
async def delete_portfolio(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    """Delete portfolio."""
    query = select(PortfolioModel).where(PortfolioModel.id == portfolio_id)
    result = await db.execute(query)
    portfolio = result.scalar_one_or_none()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    await db.delete(portfolio)
    await db.commit()

    # Clear cache
    cache.delete_pattern(f"portfolio:{portfolio_id}")

    return None


@router.post("/portfolio/{portfolio_id}/items", response_model=PortfolioItem, status_code=201)
async def add_portfolio_item(
    portfolio_id: int,
    item_data: PortfolioItemCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add fund to portfolio."""
    # Check if portfolio exists
    portfolio_query = select(PortfolioModel).where(PortfolioModel.id == portfolio_id)
    portfolio_result = await db.execute(portfolio_query)
    portfolio = portfolio_result.scalar_one_or_none()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Check if fund exists
    fund_query = select(FundModel).where(FundModel.id == item_data.fund_id)
    fund_result = await db.execute(fund_query)
    fund = fund_result.scalar_one_or_none()

    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    # Create portfolio item
    item = PortfolioItemModel(portfolio_id=portfolio_id, **item_data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)

    # Load fund relationship
    await db.refresh(item, ["fund"])

    # Clear cache
    cache.delete_pattern(f"portfolio:{portfolio_id}")

    return PortfolioItem.model_validate(item)


@router.put("/portfolio/{portfolio_id}/items/{item_id}", response_model=PortfolioItem)
async def update_portfolio_item(
    portfolio_id: int,
    item_id: int,
    item_data: PortfolioItemUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update portfolio item."""
    query = (
        select(PortfolioItemModel)
        .where(
            PortfolioItemModel.id == item_id,
            PortfolioItemModel.portfolio_id == portfolio_id,
        )
        .options(selectinload(PortfolioItemModel.fund))
    )
    result = await db.execute(query)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")

    # Update fields
    for field, value in item_data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)

    # Clear cache
    cache.delete_pattern(f"portfolio:{portfolio_id}")

    return PortfolioItem.model_validate(item)


@router.delete("/portfolio/{portfolio_id}/items/{item_id}", status_code=204)
async def delete_portfolio_item(
    portfolio_id: int, item_id: int, db: AsyncSession = Depends(get_db)
):
    """Remove fund from portfolio."""
    query = select(PortfolioItemModel).where(
        PortfolioItemModel.id == item_id,
        PortfolioItemModel.portfolio_id == portfolio_id,
    )
    result = await db.execute(query)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")

    await db.delete(item)
    await db.commit()

    # Clear cache
    cache.delete_pattern(f"portfolio:{portfolio_id}")

    return None


@router.get("/portfolio/{portfolio_id}/performance", response_model=PortfolioPerformance)
async def get_portfolio_performance(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    """Get portfolio performance metrics."""
    # Check cache
    cache_key = get_cache_key("portfolio", portfolio_id, "performance")
    cached = cache.get(cache_key)
    if cached:
        return cached

    # Get portfolio with items
    query = (
        select(PortfolioModel)
        .where(PortfolioModel.id == portfolio_id)
        .options(selectinload(PortfolioModel.items).selectinload(PortfolioItemModel.fund))
    )
    result = await db.execute(query)
    portfolio = result.scalar_one_or_none()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Calculate performance
    total_cost = 0.0
    current_value = 0.0
    holdings = []

    for item in portfolio.items:
        # Get current NAV
        estimated_nav = await nav_estimator.get_estimated_nav(item.fund.code)
        current_nav = estimated_nav["estimated_nav"] if estimated_nav else item.cost_basis

        item_cost = item.shares * item.cost_basis
        item_value = item.shares * current_nav
        item_return = item_value - item_cost
        item_return_percent = (item_return / item_cost * 100) if item_cost > 0 else 0

        total_cost += item_cost
        current_value += item_value

        holdings.append({
            "fund_code": item.fund.code,
            "fund_name": item.fund.name,
            "shares": item.shares,
            "cost_basis": item.cost_basis,
            "current_nav": current_nav,
            "cost": item_cost,
            "value": item_value,
            "return": item_return,
            "return_percent": item_return_percent,
        })

    total_return = current_value - total_cost
    return_percent = (total_return / total_cost * 100) if total_cost > 0 else 0

    performance = {
        "portfolio_id": portfolio_id,
        "total_cost": total_cost,
        "current_value": current_value,
        "total_return": total_return,
        "return_percent": return_percent,
        "holdings": holdings,
    }

    # Cache the result
    cache.set(cache_key, performance, settings.cache_portfolio_ttl)

    return performance
