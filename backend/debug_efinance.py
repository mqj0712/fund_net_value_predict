"""Debug script to understand efinance API responses."""
import asyncio
import efinance as ef


async def debug_efinance():
    """Debug efinance API responses."""
    fund_code = "001186"

    print("=== Testing get_public_dates ===")
    try:
        dates = ef.fund.get_public_dates(fund_code)
        print(f"Type: {type(dates)}")
        print(f"Value: {dates}")
        if hasattr(dates, '__len__'):
            print(f"Length: {len(dates)}")
        if isinstance(dates, list) and dates:
            print(f"First item: {dates[0]} (type: {type(dates[0])})")
    except Exception as e:
        print(f"Error: {e}")

    print("\n=== Testing get_invest_position ===")
    try:
        holdings = ef.fund.get_invest_position(fund_code)
        print(f"Type: {type(holdings)}")
        if holdings is not None:
            print(f"Shape: {holdings.shape if hasattr(holdings, 'shape') else 'N/A'}")
            print(f"Columns: {holdings.columns.tolist() if hasattr(holdings, 'columns') else 'N/A'}")
            print(f"\nFirst few rows:")
            print(holdings.head() if hasattr(holdings, 'head') else holdings)
    except Exception as e:
        print(f"Error: {e}")

    print("\n=== Testing get_types_percentage ===")
    try:
        allocation = ef.fund.get_types_percentage(fund_code)
        print(f"Type: {type(allocation)}")
        if allocation is not None:
            print(f"Shape: {allocation.shape if hasattr(allocation, 'shape') else 'N/A'}")
            print(f"Columns: {allocation.columns.tolist() if hasattr(allocation, 'columns') else 'N/A'}")
            print(f"\nFirst few rows:")
            print(allocation.head() if hasattr(allocation, 'head') else allocation)
    except Exception as e:
        print(f"Error: {e}")

    print("\n=== Testing get_latest_quote ===")
    try:
        stock_codes = ["600519", "000333"]
        quotes = ef.stock.get_latest_quote(stock_codes)
        print(f"Type: {type(quotes)}")
        if quotes is not None:
            print(f"Shape: {quotes.shape if hasattr(quotes, 'shape') else 'N/A'}")
            print(f"Columns: {quotes.columns.tolist() if hasattr(quotes, 'columns') else 'N/A'}")
            print(f"\nData:")
            print(quotes)
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(debug_efinance())
