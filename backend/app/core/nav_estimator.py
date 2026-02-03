"""NAV estimator for real-time calculations."""
from datetime import datetime, time, date
from typing import Any
from sqlalchemy import select

from app.core.data_fetcher import data_fetcher
from app.core.cache_manager import cache, get_cache_key
from app.config import settings


class NavEstimator:
    """Calculate and estimate NAV values."""

    @staticmethod
    def is_trading_hours() -> bool:
        """Check if current time is within trading hours (9:30-15:00 Beijing time)."""
        now = datetime.now()
        # Simplified check - assumes local time is Beijing time
        # In production, should use proper timezone handling
        trading_start = time(9, 30)
        trading_end = time(15, 0)
        current_time = now.time()

        # Check if it's a weekday
        if now.weekday() >= 5:  # Saturday = 5, Sunday = 6
            return False

        return trading_start <= current_time <= trading_end

    async def get_estimated_nav(self, fund_code: str, db_session=None) -> dict[str, Any] | None:
        """Get estimated NAV based on actual holdings and real-time stock prices."""
        # Check cache first
        cache_key = get_cache_key("fund", fund_code, "nav", "realtime")
        cached = cache.get(cache_key)
        if cached:
            return cached

        # Get previous day's NAV
        previous_nav = await self._get_previous_nav(fund_code, db_session)
        if not previous_nav:
            # Fallback to Tiantian Fund API if no historical data
            return await self._get_tiantian_estimate(fund_code)

        # Get fund holdings
        holdings = await data_fetcher.get_fund_holdings(fund_code)
        if not holdings:
            # Fallback to Tiantian Fund API if no holdings data
            return await self._get_tiantian_estimate(fund_code)

        # Get asset allocation
        allocation = await data_fetcher.get_fund_asset_allocation(fund_code)
        stock_ratio = allocation.get("stock_ratio", 0.95)  # Default 95% if not available

        # Get current stock prices
        stock_codes = [h["stock_code"] for h in holdings]
        stock_prices = await data_fetcher.get_stock_prices(stock_codes)

        # Calculate weighted change
        weighted_change = 0.0
        total_weight = 0.0
        for holding in holdings:
            stock_code = holding["stock_code"]
            holding_pct = holding["percentage"] / 100.0  # Convert to decimal

            if stock_code in stock_prices:
                price_change_pct = stock_prices[stock_code]["change_percent"] / 100.0
                weighted_change += holding_pct * price_change_pct
                total_weight += holding_pct

        # Normalize if total weight is not 100%
        if total_weight > 0 and total_weight < 1.0:
            weighted_change = weighted_change / total_weight

        # Calculate estimated NAV
        # Only apply stock portion change (weighted by stock_ratio)
        estimated_nav = previous_nav * (1 + weighted_change * stock_ratio)
        change_percent = weighted_change * stock_ratio * 100

        # Get fund name
        fund_name = await self._get_fund_name(fund_code, db_session)

        # Build result
        result = {
            "fund_code": fund_code,
            "fund_name": fund_name,
            "current_nav": previous_nav,
            "estimated_nav": estimated_nav,
            "change_percent": change_percent,
            "last_update": datetime.now(),
            "is_trading_hours": self.is_trading_hours(),
            "calculation_method": "holdings_based",
            "stock_ratio": stock_ratio,
            "holdings_count": len(holdings),
        }

        # Cache result
        cache.set(cache_key, result, settings.cache_realtime_nav_ttl)

        return result

    async def _get_previous_nav(self, fund_code: str, db_session=None) -> float | None:
        """Get previous day's NAV from database."""
        if not db_session:
            return None

        try:
            from app.models.fund import Fund as FundModel, NavHistory as NavHistoryModel

            # Get fund
            fund_query = select(FundModel).where(FundModel.code == fund_code)
            fund_result = await db_session.execute(fund_query)
            fund = fund_result.scalar_one_or_none()

            if not fund:
                return None

            # Get most recent NAV
            nav_query = (
                select(NavHistoryModel)
                .where(NavHistoryModel.fund_id == fund.id)
                .order_by(NavHistoryModel.date.desc())
                .limit(1)
            )
            nav_result = await db_session.execute(nav_query)
            nav_history = nav_result.scalar_one_or_none()

            return nav_history.nav if nav_history else None
        except Exception as e:
            print(f"Error getting previous NAV: {e}")
            return None

    async def _get_fund_name(self, fund_code: str, db_session=None) -> str:
        """Get fund name from database or API."""
        if not db_session:
            # Try to get from API
            fund_info = await data_fetcher.get_fund_info(fund_code)
            return fund_info.get("name", fund_code) if fund_info else fund_code

        try:
            from app.models.fund import Fund as FundModel

            fund_query = select(FundModel).where(FundModel.code == fund_code)
            fund_result = await db_session.execute(fund_query)
            fund = fund_result.scalar_one_or_none()

            return fund.name if fund else fund_code
        except Exception as e:
            print(f"Error getting fund name: {e}")
            return fund_code

    async def _get_tiantian_estimate(self, fund_code: str) -> dict[str, Any] | None:
        """Fallback to Tiantian Fund API estimate."""
        try:
            # Fetch real-time data
            realtime_data = await data_fetcher.get_realtime_nav(fund_code)
            if not realtime_data:
                return None

            # Calculate estimation
            is_trading = self.is_trading_hours()
            current_nav = realtime_data["current_nav"]
            estimated_nav = realtime_data["estimated_nav"] if is_trading else current_nav
            change_percent = realtime_data["estimated_growth"] if is_trading else 0.0

            result = {
                "fund_code": fund_code,
                "fund_name": realtime_data["fund_name"],
                "current_nav": current_nav,
                "estimated_nav": estimated_nav,
                "change_percent": change_percent,
                "last_update": datetime.now(),
                "is_trading_hours": is_trading,
                "calculation_method": "tiantian_api",
                "stock_ratio": None,
                "holdings_count": None,
            }

            return result
        except Exception as e:
            print(f"Error getting Tiantian estimate: {e}")
            return None


# Global estimator instance
nav_estimator = NavEstimator()
