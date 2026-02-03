# Holdings-Based NAV Estimation Implementation

## Overview

This implementation adds accurate NAV estimation based on actual fund holdings and real-time stock prices, replacing the simple pre-calculated estimates from Tiantian Fund API.

## Changes Made

### 1. Database Models (`backend/app/models/fund.py`)

Added two new models:

- **FundHolding**: Stores individual stock holdings with percentages
  - `fund_id`: Foreign key to Fund
  - `stock_code`: Stock ticker code
  - `stock_name`: Stock name
  - `holding_percentage`: Percentage of fund NAV
  - `public_date`: Date when holdings were disclosed

- **FundAssetAllocation**: Stores asset allocation percentages
  - `fund_id`: Foreign key to Fund
  - `stock_ratio`: Percentage allocated to stocks
  - `bond_ratio`: Percentage allocated to bonds
  - `cash_ratio`: Percentage allocated to cash
  - `other_ratio`: Percentage allocated to other assets
  - `public_date`: Date when allocation was disclosed

### 2. Schemas (`backend/app/schemas/fund.py`)

Added new schemas:

- **FundHoldingSchema**: Response schema for fund holdings
- **FundAssetAllocationSchema**: Response schema for asset allocation
- **RealtimeNav**: Enhanced with:
  - `calculation_method`: "holdings_based" or "tiantian_api"
  - `stock_ratio`: Stock allocation percentage (optional)
  - `holdings_count`: Number of holdings (optional)

### 3. Data Fetcher (`backend/app/core/data_fetcher.py`)

Added new methods using efinance library:

- `get_fund_holdings(fund_code, date)`: Fetch fund stock holdings
- `get_fund_asset_allocation(fund_code, date)`: Fetch asset allocation
- `get_holdings_public_dates(fund_code)`: Get disclosure dates
- `get_stock_prices(stock_codes)`: Get real-time stock prices

### 4. NAV Estimator (`backend/app/core/nav_estimator.py`)

Completely rewritten `get_estimated_nav()` method:

**Algorithm:**
1. Get previous day's NAV from database
2. Fetch fund's stock holdings with percentages
3. Fetch fund's asset allocation (stock/bond/cash ratios)
4. Get real-time prices for all stocks in holdings
5. Calculate weighted price change: `Σ(holding_percentage × stock_price_change)`
6. Apply stock ratio: `estimated_nav = previous_nav × (1 + weighted_change × stock_ratio)`
7. Cache result with 1-minute TTL

**Fallback Strategy:**
- If no historical NAV data → use Tiantian Fund API
- If no holdings data → use Tiantian Fund API
- If stock prices unavailable → use Tiantian Fund API

### 5. API Endpoints (`backend/app/api/v1/endpoints/funds.py`)

Added new endpoint:

- `GET /funds/{code}/holdings`: Get fund holdings
  - Optional `date` parameter to get historical holdings
  - Returns list of holdings sorted by percentage

Updated endpoint:

- `GET /funds/{code}/nav/realtime`: Now passes db_session to estimator

### 6. Background Tasks

**New Task** (`backend/app/tasks/holdings_sync.py`):
- `sync_fund_holdings()`: Syncs holdings data for all tracked funds
- Runs daily (24-hour interval)
- Fetches latest holdings and asset allocation
- Stores in database for NAV calculation

**Scheduler** (`backend/app/tasks/scheduler.py`):
- Added holdings sync job to scheduler

## Installation & Migration

### 1. Run Database Migration

```bash
cd backend
python migrate_holdings.py
```

This creates the new `fund_holdings` and `fund_asset_allocation` tables.

### 2. Test the Implementation

```bash
cd backend
python test_holdings.py
```

This tests:
- Fetching fund holdings from efinance
- Fetching asset allocation
- Fetching stock prices
- NAV estimation with fallback

### 3. Start the Application

The application will automatically:
- Create database tables on startup (if not exists)
- Start the holdings sync background task
- Use holdings-based estimation when data is available

## API Usage

### Get Real-time NAV Estimation

```bash
curl http://localhost:8000/api/v1/funds/001186/nav/realtime
```

Response:
```json
{
  "fund_code": "001186",
  "fund_name": "富国文体健康股票",
  "current_nav": 1.2345,
  "estimated_nav": 1.2456,
  "change_percent": 0.89,
  "last_update": "2024-01-30T14:30:00",
  "is_trading_hours": true,
  "calculation_method": "holdings_based",
  "stock_ratio": 0.95,
  "holdings_count": 45
}
```

### Get Fund Holdings

```bash
curl http://localhost:8000/api/v1/funds/001186/holdings
```

Response:
```json
[
  {
    "stock_code": "600519",
    "stock_name": "贵州茅台",
    "holding_percentage": 8.5,
    "public_date": "2024-01-15"
  },
  ...
]
```

## Advantages

1. **More Accurate**: Based on actual positions and real-time prices
2. **Transparent**: Shows which stocks drive NAV changes
3. **Educational**: Reveals fund composition
4. **Reliable**: Falls back to Tiantian API when needed
5. **Cached**: 1-minute cache for performance

## Limitations

1. **Holdings Staleness**: Holdings disclosed quarterly/semi-annually
2. **Non-Stock Assets**: Bonds/cash assumed stable intraday
3. **Stock Price Delays**: Real-time prices may have slight delays
4. **API Dependencies**: Requires efinance library

## Performance

- **Cache TTL**: 1 minute for estimated NAV
- **Holdings Cache**: 24 hours (updated daily)
- **API Response Time**: < 500ms (with cache)
- **Background Sync**: Daily at scheduled time

## Monitoring

Check logs for:
- Holdings sync status: "Synced holdings for fund {code}"
- Calculation method: "holdings_based" vs "tiantian_api"
- Errors: "Error syncing holdings for {code}"

## Future Enhancements

1. Add holdings change tracking over time
2. Implement sector exposure analysis
3. Add holdings comparison between funds
4. Create holdings visualization in frontend
5. Add alerts for significant holdings changes
