"""Test script for holdings-based NAV estimation.

This script tests the new holdings-based NAV estimation feature.
"""
import asyncio
from app.core.data_fetcher import data_fetcher
from app.core.nav_estimator import nav_estimator


async def test_holdings_fetch():
    """Test fetching fund holdings."""
    print("\n=== Testing Holdings Fetch ===")
    fund_code = "001186"  # Example fund code

    # Test getting public dates
    print(f"\nFetching public dates for fund {fund_code}...")
    dates = await data_fetcher.get_holdings_public_dates(fund_code)
    print(f"Found {len(dates)} public dates")
    if dates:
        print(f"Latest date: {dates[0]}")

    # Test getting holdings
    print(f"\nFetching holdings for fund {fund_code}...")
    holdings = await data_fetcher.get_fund_holdings(fund_code)
    print(f"Found {len(holdings)} holdings")
    if holdings:
        print("\nTop 5 holdings:")
        for i, holding in enumerate(holdings[:5], 1):
            print(f"{i}. {holding['stock_name']} ({holding['stock_code']}): {holding['percentage']:.2f}%")

    # Test getting asset allocation
    print(f"\nFetching asset allocation for fund {fund_code}...")
    allocation = await data_fetcher.get_fund_asset_allocation(fund_code)
    if allocation:
        print(f"Stock ratio: {allocation['stock_ratio']*100:.2f}%")
        print(f"Bond ratio: {allocation['bond_ratio']*100:.2f}%")
        print(f"Cash ratio: {allocation['cash_ratio']*100:.2f}%")
        print(f"Other ratio: {allocation['other_ratio']*100:.2f}%")

    # Test getting stock prices
    if holdings:
        print(f"\nFetching stock prices for top 3 holdings...")
        stock_codes = [h['stock_code'] for h in holdings[:3]]
        prices = await data_fetcher.get_stock_prices(stock_codes)
        for code, price_info in prices.items():
            print(f"{code}: Current={price_info['current_price']}, Change={price_info['change_percent']:.2f}%")


async def test_nav_estimation():
    """Test NAV estimation with fallback."""
    print("\n=== Testing NAV Estimation ===")
    fund_code = "001186"

    print(f"\nEstimating NAV for fund {fund_code}...")
    result = await nav_estimator.get_estimated_nav(fund_code)

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
    """Run all tests."""
    try:
        await test_holdings_fetch()
        await test_nav_estimation()
    finally:
        await data_fetcher.close()


if __name__ == "__main__":
    asyncio.run(main())
