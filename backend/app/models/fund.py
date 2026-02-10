"""Fund database model."""
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Date, Index
from sqlalchemy.orm import relationship

from app.db.session import Base


class Fund(Base):
    """Fund model."""

    __tablename__ = "funds"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(String(50))
    company = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    nav_history = relationship("NavHistory", back_populates="fund", cascade="all, delete-orphan")
    portfolio_items = relationship("PortfolioItem", back_populates="fund", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="fund", cascade="all, delete-orphan")
    holdings = relationship("FundHolding", back_populates="fund", cascade="all, delete-orphan")
    asset_allocations = relationship("FundAssetAllocation", back_populates="fund", cascade="all, delete-orphan")
    kline_history = relationship("KlineHistory", back_populates="fund", cascade="all, delete-orphan")


class NavHistory(Base):
    """NAV history model."""

    __tablename__ = "nav_history"

    id = Column(Integer, primary_key=True, index=True)
    fund_id = Column(Integer, ForeignKey("funds.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    nav = Column(Float, nullable=False)
    accumulated_nav = Column(Float)
    daily_growth = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    fund = relationship("Fund", back_populates="nav_history")

    class Config:
        """Pydantic config."""

        from_attributes = True


class Portfolio(Base):
    """Portfolio model."""

    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    items = relationship("PortfolioItem", back_populates="portfolio", cascade="all, delete-orphan")


class PortfolioItem(Base):
    """Portfolio item model."""

    __tablename__ = "portfolio_items"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    fund_id = Column(Integer, ForeignKey("funds.id"), nullable=False)
    shares = Column(Float, nullable=False)
    cost_basis = Column(Float, nullable=False)
    purchase_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    portfolio = relationship("Portfolio", back_populates="items")
    fund = relationship("Fund", back_populates="portfolio_items")


class PortfolioTransaction(Base):
    """Portfolio transaction model."""

    __tablename__ = "portfolio_transactions"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    fund_id = Column(Integer, ForeignKey("funds.id"), nullable=False, index=True)
    transaction_type = Column(String(20), nullable=False)  # buy, sell, adjust
    shares = Column(Float, nullable=False)  # Positive for buy, negative for sell
    price = Column(Float, nullable=False)  # Transaction price per share
    transaction_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    notes = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    portfolio = relationship("Portfolio")
    fund = relationship("Fund")


class Alert(Base):
    """Alert model."""

    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    fund_id = Column(Integer, ForeignKey("funds.id"), nullable=False)
    alert_type = Column(String(20), nullable=False)  # price_above, price_below, change_percent
    threshold = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    last_triggered = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    fund = relationship("Fund", back_populates="alerts")


class FundHolding(Base):
    """Fund stock holding model."""

    __tablename__ = "fund_holdings"

    id = Column(Integer, primary_key=True, index=True)
    fund_id = Column(Integer, ForeignKey("funds.id"), nullable=False, index=True)
    stock_code = Column(String(10), nullable=False)
    stock_name = Column(String(100), nullable=False)
    holding_percentage = Column(Float, nullable=False)
    public_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    fund = relationship("Fund", back_populates="holdings")


class FundAssetAllocation(Base):
    """Fund asset allocation model."""

    __tablename__ = "fund_asset_allocation"

    id = Column(Integer, primary_key=True, index=True)
    fund_id = Column(Integer, ForeignKey("funds.id"), nullable=False, index=True)
    stock_ratio = Column(Float, nullable=False)
    bond_ratio = Column(Float, nullable=False)
    cash_ratio = Column(Float, nullable=False)
    other_ratio = Column(Float, nullable=False)
    public_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    fund = relationship("Fund", back_populates="asset_allocations")


class KlineHistory(Base):
    """K-line history data model for technical analysis."""

    __tablename__ = "kline_history"

    id = Column(Integer, primary_key=True, index=True)
    fund_id = Column(Integer, ForeignKey("funds.id"), nullable=False, index=True)

    # Basic OHLCV data
    trade_date = Column(DateTime, nullable=False, index=True)
    open_price = Column(Float, nullable=False)
    high_price = Column(Float, nullable=False)
    low_price = Column(Float, nullable=False)
    close_price = Column(Float, nullable=False)
    volume = Column(Float, default=0)
    amount = Column(Float, default=0)

    # Moving Averages
    ma5 = Column(Float)
    ma10 = Column(Float)
    ma20 = Column(Float)
    ma60 = Column(Float)

    # MACD
    macd_dif = Column(Float)
    macd_dea = Column(Float)
    macd_hist = Column(Float)

    # KDJ
    kdj_k = Column(Float)
    kdj_d = Column(Float)
    kdj_j = Column(Float)

    # RSI
    rsi6 = Column(Float)
    rsi12 = Column(Float)
    rsi24 = Column(Float)

    # Bollinger Bands
    boll_upper = Column(Float)
    boll_mid = Column(Float)
    boll_lower = Column(Float)

    # Period (daily/weekly/monthly/1min/5min/15min/30min/60min)
    period = Column(String(10), nullable=False, index=True, default="daily")

    change_pct = Column(Float)
    turnover = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    fund = relationship("Fund")

    # Composite indexes
    __table_args__ = (
        Index("idx_fund_date_period", "fund_id", "trade_date", "period"),
    )
