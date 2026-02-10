"""K-line data API endpoints."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Any

from app.db.session import get_db
from app.core.data_fetcher import data_fetcher
from app.models.fund import Fund, KlineHistory

router = APIRouter()


@router.get("/{fund_code}")
async def get_kline(
    fund_code: str,
    period: str = Query("daily", description="Period: daily/weekly/monthly/1min/5min/15min/30min/60min"),
    start_date: str = Query(None, description="Start date YYYY-MM-DD"),
    end_date: str = Query(None, description="End date YYYY-MM-DD"),
    indicators: bool = Query(True, description="Whether to calculate technical indicators"),
    db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    """
    Get ETF K-line data with technical indicators.

    - fund_code: ETF code (e.g., 159246)
    - period: Time period selection
    - start_date/end_date: Date range filter
    - indicators: Whether to calculate technical indicators (MA, MACD, KDJ, RSI, BOLL)
    """
    # Validate fund exists
    result = await db.execute(select(Fund).where(Fund.code == fund_code))
    fund = result.scalar_one_or_none()

    if not fund:
        raise HTTPException(status_code=404, detail=f"Fund {fund_code} not found")

    # Parse dates
    sd = None
    ed = None
    try:
        if start_date:
            sd = datetime.strptime(start_date, "%Y-%m-%d").date()
        if end_date:
            ed = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format. Use YYYY-MM-DD: {e}")

    # Get K-line data
    data = await data_fetcher.get_etf_kline(
        fund_code=fund_code,
        period=period,
        start_date=sd,
        end_date=ed,
        calculate_indicators=indicators
    )

    if not data:
        raise HTTPException(status_code=404, detail="K-line data not found for the specified period")

    return {
        "fund_code": fund_code,
        "fund_name": fund.name,
        "period": period,
        "start_date": start_date or data[0].get("date", ""),
        "end_date": end_date or data[-1].get("date", ""),
        "data_count": len(data),
        "indicators_enabled": indicators,
        "kline_data": data
    }


@router.get("/{fund_code}/summary")
async def get_kline_summary(
    fund_code: str,
    period: str = Query("daily", description="Period: daily/weekly/monthly"),
    db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    """Get K-line summary statistics for quick overview."""
    # Validate fund
    result = await db.execute(select(Fund).where(Fund.code == fund_code))
    fund = result.scalar_one_or_none()

    if not fund:
        raise HTTPException(status_code=404, detail=f"Fund {fund_code} not found")

    # Get recent K-line data (last 30 periods)
    data = await data_fetcher.get_etf_kline(
        fund_code=fund_code,
        period=period,
        calculate_indicators=True
    )

    if not data or len(data) == 0:
        raise HTTPException(status_code=404, detail="No K-line data available")

    # Get last 30 records
    recent_data = data[-30:]

    # Calculate summary statistics
    closes = [d["close"] for d in recent_data]
    latest = recent_data[-1]
    previous = recent_data[-2] if len(recent_data) >= 2 else latest

    change = latest["close"] - previous["close"]
    change_pct = (change / previous["close"]) * 100 if previous["close"] != 0 else 0

    _max = max(closes)
    _min = min(closes)
    avg = sum(closes) / len(closes)

    # Technical signals
    ma5 = latest.get("MA5")
    ma20 = latest.get("MA20")
    ma60 = latest.get("MA60")

    trend = "neutral"
    if ma5 and ma20:
        if ma5 > ma20:
            trend = "bullish"
        else:
            trend = "bearish"

    macd_signal = "neutral"
    if latest.get("MACD_DIF") and latest.get("MACD_DEA"):
        if latest["MACD_DIF"] > latest["MACD_DEA"]:
            macd_signal = "bullish"
        else:
            macd_signal = "bearish"

    rsi_signal = "neutral"
    rsi6 = latest.get("RSI6")
    if rsi6:
        if rsi6 > 70:
            rsi_signal = "overbought"
        elif rsi6 < 30:
            rsi_signal = "oversold"

    return {
        "fund_code": fund_code,
        "fund_name": fund.name,
        "period": period,
        "latest": {
            "date": latest["date"],
            "open": latest["open"],
            "high": latest["high"],
            "low": latest["low"],
            "close": latest["close"],
            "change": round(change, 4),
            "change_pct": round(change_pct, 2),
        },
        "statistics": {
            "high_30": round(_max, 4),
            "low_30": round(_min, 4),
            "avg_30": round(avg, 4),
            "data_points": len(data),
        },
        "indicators": {
            "MA5": round(ma5, 4) if ma5 else None,
            "MA20": round(ma20, 4) if ma20 else None,
            "MA60": round(ma60, 4) if ma60 else None,
            "MACD_DIF": round(latest.get("MACD_DIF", 0), 4),
            "MACD_HIST": round(latest.get("MACD_HIST", 0), 4),
            "KDJ_K": round(latest.get("KDJ_K", 0), 2),
            "RSI6": round(rsi6, 2) if rsi6 else None,
        },
        "signals": {
            "trend": trend,
            "macd": macd_signal,
            "rsi": rsi_signal,
        }
    }
