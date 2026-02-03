"""Alert API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.fund import Alert as AlertModel, Fund as FundModel
from app.schemas.fund import Alert, AlertCreate, AlertUpdate

router = APIRouter()


@router.get("/alerts", response_model=list[Alert])
async def list_alerts(db: AsyncSession = Depends(get_db)):
    """List all alerts."""
    query = (
        select(AlertModel)
        .options(selectinload(AlertModel.fund))
        .order_by(AlertModel.created_at.desc())
    )
    result = await db.execute(query)
    alerts = result.scalars().all()

    return [Alert.model_validate(a) for a in alerts]


@router.post("/alerts", response_model=Alert, status_code=201)
async def create_alert(alert_data: AlertCreate, db: AsyncSession = Depends(get_db)):
    """Create a new alert."""
    # Check if fund exists
    fund_query = select(FundModel).where(FundModel.id == alert_data.fund_id)
    fund_result = await db.execute(fund_query)
    fund = fund_result.scalar_one_or_none()

    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    # Create alert
    alert = AlertModel(**alert_data.model_dump())
    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    # Load fund relationship
    await db.refresh(alert, ["fund"])

    return Alert.model_validate(alert)


@router.put("/alerts/{alert_id}", response_model=Alert)
async def update_alert(
    alert_id: int, alert_data: AlertUpdate, db: AsyncSession = Depends(get_db)
):
    """Update alert."""
    query = (
        select(AlertModel)
        .where(AlertModel.id == alert_id)
        .options(selectinload(AlertModel.fund))
    )
    result = await db.execute(query)
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Update fields
    for field, value in alert_data.model_dump(exclude_unset=True).items():
        setattr(alert, field, value)

    await db.commit()
    await db.refresh(alert)

    return Alert.model_validate(alert)


@router.delete("/alerts/{alert_id}", status_code=204)
async def delete_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    """Delete alert."""
    query = select(AlertModel).where(AlertModel.id == alert_id)
    result = await db.execute(query)
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    await db.delete(alert)
    await db.commit()

    return None


@router.post("/alerts/{alert_id}/toggle", response_model=Alert)
async def toggle_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    """Toggle alert active status."""
    query = (
        select(AlertModel)
        .where(AlertModel.id == alert_id)
        .options(selectinload(AlertModel.fund))
    )
    result = await db.execute(query)
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_active = not alert.is_active
    await db.commit()
    await db.refresh(alert)

    return Alert.model_validate(alert)
