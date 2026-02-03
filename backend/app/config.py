"""Application configuration."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    # API Settings
    api_v1_prefix: str = "/api/v1"
    project_name: str = "Fund NAV Estimation API"
    version: str = "0.1.0"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Database
    database_url: str = "sqlite+aiosqlite:///./fund.db"

    # Cache Settings
    cache_fund_info_ttl: int = 3600  # 1 hour
    cache_realtime_nav_ttl: int = 60  # 1 minute
    cache_history_ttl: int = 21600  # 6 hours
    cache_portfolio_ttl: int = 300  # 5 minutes

    # Data Sync
    sync_interval_minutes: int = 30
    alert_check_interval_seconds: int = 60

    # Redis (optional)
    redis_url: str | None = None
    use_redis: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
