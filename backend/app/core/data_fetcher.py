"""Data fetcher for external APIs."""
import re
import json
from datetime import datetime, date
import httpx
from typing import Any

import efinance as ef
import pandas as pd
import akshare as ak

from app.core.technical_analysis import TechnicalAnalyzer


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
            fund_info = ef.fund.get_base_info(fund_code)
            if fund_info is None or fund_info.empty:
                return None

            info = fund_info.to_dict('records')[0] if not fund_info.empty else {}

            return {
                "code": fund_code,
                "name": info.get("基金名称", ""),
                "type": info.get("基金类型", ""),
                "company": info.get("基金公司", ""),
            }
        except Exception as e:
            print(f"Error fetching fund info for {fund_code}: {e}")
            return await self._get_fund_info_from_tiantian(fund_code)

    async def _get_fund_info_from_tiantian(self, fund_code: str) -> dict[str, Any] | None:
        """Fallback: get basic fund info from Tiantian API."""
        try:
            url = f"{self.tiantian_base_url}/{fund_code}.js"
            response = await self.client.get(url)
            response.raise_for_status()

            match = re.search(r'jsonpgz\((.*)\)', response.text)
            if not match:
                return None

            data = json.loads(match.group(1))

            name = data.get("name")
            if not name:
                return None

            return {
                "code": fund_code,
                "name": name,
                "type": "",
                "company": "",
            }
        except Exception as e:
            print(f"Error fetching fund info from Tiantian for {fund_code}: {e}")
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
                        "daily_growth": float(row['涨跌幅']) if '涨跌幅' in row and pd.notna(row['涨跌幅']) else None,
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

    async def get_etf_kline(
        self,
        fund_code: str,
        period: str = "daily",
        start_date: date | None = None,
        end_date: date | None = None,
        calculate_indicators: bool = True
    ) -> list[dict[str, Any]]:
        """Get ETF K-line data with technical indicators.

        Args:
            fund_code: ETF code such as "159246"
            period: Time period - daily/weekly/monthly/1min/5min/15min/30min/60min
            start_date: Start date filter
            end_date: End date filter
            calculate_indicators: Whether to calculate technical indicators

        Returns:
            List of K-line data dictionaries
        """
        try:
            period_map = {
                "daily": 101,
                "weekly": 102,
                "monthly": 103,
            }

            if period in ["1min", "5min", "15min", "30min", "60min"]:
                # Use efinance for minute data
                min_map = {
                    "1min": 1,
                    "5min": 5,
                    "15min": 15,
                    "30min": 30,
                    "60min": 60
                }
                klt = min_map[period]
                df = ef.stock.get_quote_history(fund_code, klt=klt)
            else:
                # Use efinance for daily/weekly/monthly
                klt = period_map.get(period, 101)
                df = ef.stock.get_quote_history(fund_code, klt=klt)

            if df is None or df.empty:
                return []

            # Rename columns to standard names
            column_mapping = {
                "股票代码": "code",
                "股票名称": "name",
                "K线日期": "date",
                "日期": "date",
                "开盘": "open",
                "收盘": "close",
                "最高": "high",
                "最低": "low",
                "成交量": "volume",
                "成交额": "amount",
                "涨跌幅": "change_pct",
                "涨跌额": "change_amt",
                "换手率": "turnover",
            }

            df = df.rename(columns={k: v for k, v in column_mapping.items() if k in df.columns})

            # Ensure required columns exist
            required_cols = ["open", "close", "high", "low"]
            for col in required_cols:
                if col not in df.columns:
                    print(f"Warning: Missing required column '{col}' in K-line data")
                    return []

            # Convert date column
            if "date" in df.columns:
                df["date"] = pd.to_datetime(df["date"])

            # Filter by date range
            if start_date:
                df = df[df["date"] >= pd.Timestamp(start_date)]
            if end_date:
                df = df[df["date"] <= pd.Timestamp(end_date)]

            # Calculate technical indicators if requested
            if calculate_indicators:
                df = TechnicalAnalyzer.calculate_all(df)

            # Convert to list of dicts
            records = []
            for _, row in df.iterrows():
                record = {
                    "date": row["date"].isoformat() if pd.notna(row["date"]) else "",
                    "open": float(row["open"]) if pd.notna(row["open"]) else 0.0,
                    "close": float(row["close"]) if pd.notna(row["close"]) else 0.0,
                    "high": float(row["high"]) if pd.notna(row["high"]) else 0.0,
                    "low": float(row["low"]) if pd.notna(row["low"]) else 0.0,
                }

                if "volume" in row and pd.notna(row["volume"]):
                    record["volume"] = float(row["volume"])
                if "amount" in row and pd.notna(row["amount"]):
                    record["amount"] = float(row["amount"])
                if "change_pct" in row and pd.notna(row["change_pct"]):
                    record["change_pct"] = float(row["change_pct"])

                # Add technical indicators
                indicator_cols = [col for col in row.index if col.startswith((
                    "MA", "MACD", "KDJ", "RSI", "BOLL"
                ))]
                for col in indicator_cols:
                    if pd.notna(row[col]):
                        record[col] = float(row[col])

                records.append(record)

            return records

        except Exception as e:
            print(f"Error fetching K-line data for {fund_code}: {e}")
            import traceback
            traceback.print_exc()
            return []


# Global data fetcher instance
data_fetcher = DataFetcher()
