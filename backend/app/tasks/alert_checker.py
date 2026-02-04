"""Background task for alert checking."""
from datetime import datetime
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.fund import Alert, Fund
from app.core.nav_estimator import nav_estimator
from app.api.websocket import broadcast_alert


async def check_alerts():
    """Check all active alerts and trigger if conditions are met."""
    async with AsyncSessionLocal() as db:
        try:
            # Get all active alerts
            query = select(Alert).where(Alert.is_active == True)
            result = await db.execute(query)
            alerts = result.scalars().all()

            for alert in alerts:
                try:
                    # Get fund
                    fund_query = select(Fund).where(Fund.id == alert.fund_id)
                    fund_result = await db.execute(fund_query)
                    fund = fund_result.scalar_one_or_none()

                    if not fund:
                        continue

                    # Get current NAV
                    nav_data = await nav_estimator.get_estimated_nav(fund.code, db_session=db)
                    if not nav_data:
                        continue

                    current_nav = nav_data["estimated_nav"]
                    change_percent = nav_data["change_percent"]

                    # Check alert condition
                    triggered = False

                    if alert.alert_type == "price_above" and current_nav > alert.threshold:
                        triggered = True
                    elif alert.alert_type == "price_below" and current_nav < alert.threshold:
                        triggered = True
                    elif alert.alert_type == "change_percent" and abs(change_percent) > alert.threshold:
                        triggered = True

                    if triggered:
                        # Update last_triggered
                        alert.last_triggered = datetime.utcnow()
                        await db.commit()

                        # Broadcast alert
                        alert_data = {
                            "alert_id": alert.id,
                            "fund_code": fund.code,
                            "fund_name": fund.name,
                            "alert_type": alert.alert_type,
                            "threshold": alert.threshold,
                            "current_value": current_nav if alert.alert_type != "change_percent" else change_percent,
                            "message": f"Alert triggered for {fund.name}",
                        }
                        await broadcast_alert(alert_data)

                        print(f"Alert {alert.id} triggered for fund {fund.code}")

                except Exception as e:
                    print(f"Error checking alert {alert.id}: {e}")
                    continue

        except Exception as e:
            print(f"Error in check_alerts: {e}")
