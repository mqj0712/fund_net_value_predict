"""Pydantic schemas for API."""
from datetime import datetime, date
from pydantic import BaseModel, Field


# Fund Schemas
class FundBase(BaseModel):
    """Base fund schema."""

    code: str = Field(..., min_length=6, max_length=10)
    name: str = Field(..., min_length=1, max_length=100)
    type: str | None = None
    company: str | None = None


class FundCreate(FundBase):
    """Fund creation schema."""

    pass


class FundUpdate(BaseModel):
    """Fund update schema."""

    name: str | None = None
    type: str | None = None
    company: str | None = None


class Fund(FundBase):
    """Fund response schema."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# NAV History Schemas
class NavHistoryBase(BaseModel):
    """Base NAV history schema."""

    date: date
    nav: float
    accumulated_nav: float | None = None
    daily_growth: float | None = None


class NavHistory(NavHistoryBase):
    """NAV history response schema."""

    id: int
    fund_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class RealtimeNav(BaseModel):
    """Real-time NAV estimation schema."""

    fund_code: str
    fund_name: str
    current_nav: float
    estimated_nav: float
    change_percent: float
    last_update: datetime
    is_trading_hours: bool
    calculation_method: str = "tiantian_api"  # "holdings_based" or "tiantian_api"
    stock_ratio: float | None = None
    holdings_count: int | None = None


class FundHoldingSchema(BaseModel):
    """Fund holding schema."""

    stock_code: str
    stock_name: str
    holding_percentage: float
    public_date: date

    model_config = {"from_attributes": True}


class FundAssetAllocationSchema(BaseModel):
    """Fund asset allocation schema."""

    stock_ratio: float
    bond_ratio: float
    cash_ratio: float
    other_ratio: float
    public_date: date

    model_config = {"from_attributes": True}


# Portfolio Schemas
class PortfolioBase(BaseModel):
    """Base portfolio schema."""

    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None


class PortfolioCreate(PortfolioBase):
    """Portfolio creation schema."""

    pass


class PortfolioUpdate(BaseModel):
    """Portfolio update schema."""

    name: str | None = None
    description: str | None = None


class Portfolio(PortfolioBase):
    """Portfolio response schema."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Portfolio Item Schemas
class PortfolioItemBase(BaseModel):
    """Base portfolio item schema."""

    fund_id: int
    shares: float = Field(..., gt=0)
    cost_basis: float = Field(..., gt=0)
    purchase_date: date


class PortfolioItemCreate(PortfolioItemBase):
    """Portfolio item creation schema."""

    pass


class PortfolioItemUpdate(BaseModel):
    """Portfolio item update schema."""

    shares: float | None = Field(None, gt=0)
    cost_basis: float | None = Field(None, gt=0)
    purchase_date: date | None = None


class PortfolioItem(PortfolioItemBase):
    """Portfolio item response schema."""

    id: int
    portfolio_id: int
    created_at: datetime
    updated_at: datetime
    fund: Fund | None = None

    model_config = {"from_attributes": True}


class PortfolioDetail(Portfolio):
    """Portfolio with items."""

    items: list[PortfolioItem] = []


class PortfolioPerformance(BaseModel):
    """Portfolio performance metrics."""

    portfolio_id: int
    total_cost: float
    current_value: float
    total_return: float
    return_percent: float
    holdings: list[dict]


# Alert Schemas
class AlertBase(BaseModel):
    """Base alert schema."""

    fund_id: int
    alert_type: str = Field(..., pattern="^(price_above|price_below|change_percent)$")
    threshold: float
    is_active: bool = True


class AlertCreate(AlertBase):
    """Alert creation schema."""

    pass


class AlertUpdate(BaseModel):
    """Alert update schema."""

    threshold: float | None = None
    is_active: bool | None = None


class Alert(AlertBase):
    """Alert response schema."""

    id: int
    last_triggered: datetime | None = None
    created_at: datetime
    updated_at: datetime
    fund: Fund | None = None

    model_config = {"from_attributes": True}


# WebSocket Message Schemas
class WSMessage(BaseModel):
    """WebSocket message schema."""

    type: str
    data: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Pagination
class PaginatedResponse(BaseModel):
    """Paginated response schema."""

    items: list
    total: int
    page: int
    page_size: int
    total_pages: int
