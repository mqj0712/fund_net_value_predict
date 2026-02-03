"""Background task for syncing fund holdings data."""
from datetime import datetime, date as date_type
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.fund import Fund, FundHolding, FundAssetAllocation
from app.core.data_fetcher import data_fetcher
from app.core.cache_manager import cache


async def sync_fund_holdings():
    """Sync fund holdings data for all tracked funds."""
    print("Starting fund holdings sync...")

    async with AsyncSessionLocal() as db:
        try:
            # Get all tracked funds
            query = select(Fund)
            result = await db.execute(query)
            funds = result.scalars().all()

            print(f"Syncing holdings for {len(funds)} funds...")

            for fund in funds:
                try:
                    # Get latest public dates
                    public_dates = await data_fetcher.get_holdings_public_dates(fund.code)
                    if not public_dates:
                        print(f"No public dates found for fund {fund.code}")
                        continue

                    latest_date_str = public_dates[0]
                    # Convert string to date object
                    latest_date = datetime.strptime(latest_date_str, '%Y-%m-%d').date()

                    # Check if we already have this date's data
                    existing_query = select(FundHolding).where(
                        FundHolding.fund_id == fund.id,
                        FundHolding.public_date == latest_date
                    )
                    existing_result = await db.execute(existing_query)
                    existing = existing_result.scalar_one_or_none()

                    if existing:
                        print(f"Holdings for fund {fund.code} already up to date")
                        continue

                    # Fetch holdings
                    holdings = await data_fetcher.get_fund_holdings(fund.code, latest_date_str)
                    if not holdings:
                        print(f"No holdings data found for fund {fund.code}")
                        continue

                    # Delete old holdings for this date (if any)
                    delete_query = select(FundHolding).where(
                        FundHolding.fund_id == fund.id,
                        FundHolding.public_date == latest_date
                    )
                    delete_result = await db.execute(delete_query)
                    old_holdings = delete_result.scalars().all()
                    for old_holding in old_holdings:
                        await db.delete(old_holding)

                    # Save new holdings to database
                    for holding in holdings:
                        db.add(FundHolding(
                            fund_id=fund.id,
                            stock_code=holding["stock_code"],
                            stock_name=holding["stock_name"],
                            holding_percentage=holding["percentage"],
                            public_date=latest_date,
                        ))

                    # Fetch and save asset allocation
                    allocation = await data_fetcher.get_fund_asset_allocation(fund.code, latest_date_str)
                    if allocation:
                        # Check if allocation already exists
                        alloc_query = select(FundAssetAllocation).where(
                            FundAssetAllocation.fund_id == fund.id,
                            FundAssetAllocation.public_date == latest_date
                        )
                        alloc_result = await db.execute(alloc_query)
                        existing_alloc = alloc_result.scalar_one_or_none()

                        if not existing_alloc:
                            db.add(FundAssetAllocation(
                                fund_id=fund.id,
                                stock_ratio=allocation["stock_ratio"],
                                bond_ratio=allocation["bond_ratio"],
                                cash_ratio=allocation["cash_ratio"],
                                other_ratio=allocation["other_ratio"],
                                public_date=latest_date,
                            ))

                    await db.commit()

                    # Invalidate cache
                    cache.delete_pattern(f"fund:{fund.code}:nav:realtime")

                    print(f"Synced holdings for fund {fund.code} ({len(holdings)} holdings)")

                except Exception as e:
                    print(f"Error syncing holdings for {fund.code}: {e}")
                    await db.rollback()
                    continue

            print("Fund holdings sync completed")

        except Exception as e:
            print(f"Error in sync_fund_holdings: {e}")
            await db.rollback()
