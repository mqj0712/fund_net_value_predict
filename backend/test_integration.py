"""Integration test for holdings-based NAV estimation with database.

This script tests the complete flow including database operations.
"""
import asyncio
from datetime import date
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.fund import Fund, FundHolding, FundAssetAllocation, NavHistory
from app.core.data_fetcher import data_fetcher
from app.core.nav_estimator import nav_estimator
from app.tasks.holdings_sync import sync_fund_holdings


async def setup_test_fund():
    """Create a test fund in the database."""
    print("\n=== Setting up test fund ===")
    fund_code = "001186"

    async with AsyncSessionLocal() as db:
        # Check if fund exists
        query = select(Fund).where(Fund.code == fund_code)
        result = await db.execute(query)
        fund = result.scalar_one_or_none()

        if not fund:
            # Create fund
            fund_info = await data_fetcher.get_fund_info(fund_code)
            fund = Fund(
                code=fund_code,
                name=fund_info["name"] if fund_info else "Test Fund",
                type=fund_info.get("type") if fund_info else None,
                company=fund_info.get("company") if fund_info else None,
            )
            db.add(fund)
            await db.commit()
            await db.refresh(fund)
            print(f"Created fund: {fund.name} ({fund.code})")
        else:
            print(f"Fund already exists: {fund.name} ({fund.code})")

        # Add some NAV history
        nav_query = select(NavHistory).where(NavHistory.fund_id == fund.id)
        nav_result = await db.execute(nav_query)
        existing_nav = nav_result.scalar_one_or_none()

        if not existing_nav:
            # Add a sample NAV record
            nav = NavHistory(
                fund_id=fund.id,
                date=date.today(),
                nav=3.0110,
                accumulated_nav=3.0110,
                daily_growth=0.0,
            )
            db.add(nav)
            await db.commit()
            print(f"Added NAV history: {nav.nav}")
        else:
            print(f"NAV history already exists: {existing_nav.nav}")

        return fund


async def test_holdings_sync():
    """Test syncing fund holdings."""
    print("\n=== Testing Holdings Sync ===")
    await sync_fund_holdings()

    # Verify holdings were saved
    async with AsyncSessionLocal() as db:
        query = select(FundHolding).limit(5)
        result = await db.execute(query)
        holdings = result.scalars().all()

        if holdings:
            print(f"\nFound {len(holdings)} holdings in database:")
            for holding in holdings:
                print(f"  - {holding.stock_name} ({holding.stock_code}): {holding.holding_percentage:.2f}%")
        else:
            print("No holdings found in database")

        # Check asset allocation
        alloc_query = select(FundAssetAllocation).limit(1)
        alloc_result = await db.execute(alloc_query)
        allocation = alloc_result.scalar_one_or_none()

        if allocation:
            print(f"\nAsset allocation:")
            print(f"  Stock ratio: {allocation.stock_ratio*100:.2f}%")
            print(f"  Bond ratio: {allocation.bond_ratio*100:.2f}%")
            print(f"  Cash ratio: {allocation.cash_ratio*100:.2f}%")
        else:
            print("No asset allocation found in database")


async def test_nav_estimation_with_db():
    """Test NAV estimation with database session."""
    print("\n=== Testing NAV Estimation with Database ===")
    fund_code = "001186"

    async with AsyncSessionLocal() as db:
        # Get estimated NAV with db session
        result = await nav_estimator.get_estimated_nav(fund_code, db_session=db)

        if result:
            print(f"\nFund: {result['fund_name']} ({result['fund_code']})")
            print(f"Current NAV: {result['current_nav']:.4f}")
            print(f"Estimated NAV: {result['estimated_nav']:.4f}")
            print(f"Change: {result['change_percent']:.2f}%")
            print(f"Calculation method: {result['calculation_method']}")
            if result['calculation_method'] == 'holdings_based':
                print(f"Stock ratio: {result['stock_ratio']*100:.2f}%")
                print(f"Holdings count: {result['holdings_count']}")
            print(f"Trading hours: {result['is_trading_hours']}")
        else:
            print("Failed to estimate NAV")


async def main():
    """Run all integration tests."""
    try:
        # Setup
        await setup_test_fund()

        # Test holdings sync
        await test_holdings_sync()

        # Test NAV estimation
        await test_nav_estimation_with_db()

        print("\n=== All tests completed ===")

    finally:
        await data_fetcher.close()


if __name__ == "__main__":
    asyncio.run(main())
