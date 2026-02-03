"""Background task for periodic data synchronization."""
from datetime import date, timedelta
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.fund import Fund, NavHistory
from app.core.data_fetcher import data_fetcher
from app.core.cache_manager import cache


async def sync_nav_data():
    """Sync NAV data for all tracked funds."""
    print("Starting NAV data sync...")

    async with AsyncSessionLocal() as db:
        try:
            # Get all tracked funds
            query = select(Fund)
            result = await db.execute(query)
            funds = result.scalars().all()

            print(f"Syncing data for {len(funds)} funds...")

            for fund in funds:
                try:
                    # Get last 7 days of data
                    end_date = date.today()
                    start_date = end_date - timedelta(days=7)

                    # Fetch historical data
                    historical_data = await data_fetcher.get_historical_nav(
                        fund.code, start_date, end_date
                    )

                    # Upsert NAV records
                    for record in historical_data:
                        # Check if record exists
                        existing_query = select(NavHistory).where(
                            NavHistory.fund_id == fund.id,
                            NavHistory.date == record["date"],
                        )
                        existing_result = await db.execute(existing_query)
                        existing = existing_result.scalar_one_or_none()

                        if existing:
                            # Update existing record
                            existing.nav = record["nav"]
                            existing.accumulated_nav = record.get("accumulated_nav")
                            existing.daily_growth = record.get("daily_growth")
                        else:
                            # Create new record
                            nav_history = NavHistory(
                                fund_id=fund.id,
                                date=record["date"],
                                nav=record["nav"],
                                accumulated_nav=record.get("accumulated_nav"),
                                daily_growth=record.get("daily_growth"),
                            )
                            db.add(nav_history)

                    await db.commit()

                    # Invalidate cache
                    cache.delete_pattern(f"fund:{fund.code}:nav:history")

                    print(f"Synced data for fund {fund.code}")

                except Exception as e:
                    print(f"Error syncing fund {fund.code}: {e}")
                    continue

            print("NAV data sync completed")

        except Exception as e:
            print(f"Error in sync_nav_data: {e}")
            await db.rollback()
