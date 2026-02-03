"""Data fetcher for external APIs."""
import re
import json
from datetime import datetime, date
import httpx
from typing import Any

import efinance as ef


class DataFetcher:
    """Fetch fund data from external sources."""

    def __init__(self):
        """Initialize data fetcher."""
        self.client = httpx.AsyncClient(timeout=30.0)
        self.tiantian_base_url = "https://fundgz.1234567.com.cn/js"

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()

    async def get_fund_info(self, fund_code: str) -> dict[str, Any] | None:
        """Get fund basic information using efinance."""
        try:
            # Use efinance to get fund info
            fund_info = ef.fund.get_base_info(fund_code)
            if fund_info is None or fund_info.empty:
                return None

            # Convert to dict
            info = fund_info.to_dict('records')[0] if not fund_info.empty else {}

            return {
                "code": fund_code,
                "name": info.get("基金名称", ""),
                "type": info.get("基金类型", ""),
                "company": info.get("基金公司", ""),
            }
        except Exception as e:
            print(f"Error fetching fund info for {fund_code}: {e}")
            return None

    async def get_historical_nav(
        self, fund_code: str, start_date: date | None = None, end_date: date | None = None
    ) -> list[dict[str, Any]]:
        """Get historical NAV data using efinance."""
        try:
            # Use efinance to get historical data
            df = ef.fund.get_quote_history(fund_code)
            if df is None or df.empty:
                return []

            # Filter by date range if provided
            if start_date:
                df = df[df['日期'] >= start_date.strftime('%Y-%m-%d')]
            if end_date:
                df = df[df['日期'] <= end_date.strftime('%Y-%m-%d')]

            # Convert to list of dicts
            records = []
            for _, row in df.iterrows():
                try:
                    records.append({
                        "date": datetime.strptime(row['日期'], '%Y-%m-%d').date(),
                        "nav": float(row['单位净值']),
                        "accumulated_nav": float(row['累计净值']) if '累计净值' in row else None,
                        "daily_growth": float(row['日增长率'].rstrip('%')) if '日增长率' in row and row['日增长率'] else None,
                    })
                except (ValueError, KeyError) as e:
                    print(f"Error parsing row: {e}")
                    continue

            return records
        except Exception as e:
            print(f"Error fetching historical NAV for {fund_code}: {e}")
            return []

    async def get_realtime_nav(self, fund_code: str) -> dict[str, Any] | None:
        """Get real-time NAV estimation from Tiantian Fund JSONP API."""
        try:
            url = f"{self.tiantian_base_url}/{fund_code}.js"
            response = await self.client.get(url)
            response.raise_for_status()

            # Parse JSONP response
            # Format: jsonpgz({"fundcode":"001186","name":"...","jzrq":"2024-01-30",...});
            content = response.text
            match = re.search(r'jsonpgz\((.*)\)', content)
            if not match:
                return None

            data = json.loads(match.group(1))

            return {
                "fund_code": data.get("fundcode"),
                "fund_name": data.get("name"),
                "nav_date": data.get("jzrq"),  # 净值日期
                "current_nav": float(data.get("dwjz", 0)),  # 当日净值
                "estimated_nav": float(data.get("gsz", 0)),  # 估算净值
                "estimated_growth": float(data.get("gszzl", 0)),  # 估算增长率
                "update_time": data.get("gztime"),  # 更新时间
            }
        except Exception as e:
            print(f"Error fetching realtime NAV for {fund_code}: {e}")
            return None

    async def search_funds(self, query: str) -> list[dict[str, Any]]:
        """Search funds by name or code."""
        try:
            # Use efinance to search funds
            # Note: efinance doesn't have a direct search function,
            # so we'll need to implement a simple search
            # For now, return empty list and implement later
            return []
        except Exception as e:
            print(f"Error searching funds: {e}")
            return []

    async def get_fund_holdings(self, fund_code: str, date: str | None = None) -> list[dict[str, Any]]:
        """Get fund stock holdings with percentages."""
        try:
            # Use efinance to get fund holdings
            df = ef.fund.get_invest_position(fund_code, dates=date)
            if df is None or df.empty:
                return []

            # Convert to list of dicts
            holdings = []
            for _, row in df.iterrows():
                holdings.append({
                    "stock_code": str(row.get("股票代码", "")),
                    "stock_name": str(row.get("股票简称", "")),
                    "percentage": float(row.get("持仓占比", 0)),
                    "date": str(row.get("公开日期", date)),
                })

            return holdings
        except Exception as e:
            print(f"Error fetching fund holdings for {fund_code}: {e}")
            return []

    async def get_fund_asset_allocation(self, fund_code: str, date: str | None = None) -> dict[str, Any]:
        """Get fund asset allocation percentages."""
        try:
            # Use efinance to get asset allocation
            df = ef.fund.get_types_percentage(fund_code, dates=date)
            if df is None or df.empty:
                return {}

            # Get the most recent record
            row = df.iloc[0] if not df.empty else {}

            # Parse percentages (they might be strings with % or numbers)
            def parse_percentage(val):
                if val == '--' or val is None or val == '':
                    return 0.0
                try:
                    if isinstance(val, str):
                        return float(val.replace('%', ''))
                    return float(val)
                except:
                    return 0.0

            return {
                "stock_ratio": parse_percentage(row.get("股票比重", 0)) / 100.0,
                "bond_ratio": parse_percentage(row.get("债券比重", 0)) / 100.0,
                "cash_ratio": parse_percentage(row.get("现金比重", 0)) / 100.0,
                "other_ratio": parse_percentage(row.get("其他比重", 0)) / 100.0,
                "date": date,
            }
        except Exception as e:
            print(f"Error fetching asset allocation for {fund_code}: {e}")
            return {}

    async def get_holdings_public_dates(self, fund_code: str) -> list[str]:
        """Get dates when fund holdings were publicly disclosed."""
        try:
            # Use efinance to get public dates
            dates = ef.fund.get_public_dates(fund_code)
            if dates is None:
                return []

            # Check if it's a list or DataFrame
            if isinstance(dates, list):
                return [str(d) for d in dates]
            elif hasattr(dates, 'empty') and not dates.empty:
                return [str(d) for d in dates.tolist()]
            else:
                return []
        except Exception as e:
            print(f"Error fetching public dates for {fund_code}: {e}")
            return []

    async def get_stock_prices(self, stock_codes: list[str]) -> dict[str, dict[str, Any]]:
        """Get current prices for multiple stocks."""
        try:
            if not stock_codes:
                return {}

            # Use efinance to get latest quotes
            df = ef.stock.get_latest_quote(stock_codes)
            if df is None or df.empty:
                return {}

            # Convert to dict
            prices = {}
            for _, row in df.iterrows():
                stock_code = str(row.get("代码", ""))
                prices[stock_code] = {
                    "current_price": float(row.get("最新价", 0)),
                    "prev_close": float(row.get("昨日收盘", 0)),
                    "change_percent": float(row.get("涨跌幅", 0)),
                }

            return prices
        except Exception as e:
            print(f"Error fetching stock prices: {e}")
            return {}


# Global data fetcher instance
data_fetcher = DataFetcher()
