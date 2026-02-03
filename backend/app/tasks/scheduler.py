"""Task scheduler for background jobs."""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings
from app.tasks.data_sync import sync_nav_data
from app.tasks.alert_checker import check_alerts
from app.tasks.holdings_sync import sync_fund_holdings


# Create scheduler
scheduler = AsyncIOScheduler()


def start_scheduler():
    """Start the background task scheduler."""
    # Add data sync job
    scheduler.add_job(
        sync_nav_data,
        trigger=IntervalTrigger(minutes=settings.sync_interval_minutes),
        id="sync_nav_data",
        name="Sync NAV data",
        replace_existing=True,
    )

    # Add alert checker job
    scheduler.add_job(
        check_alerts,
        trigger=IntervalTrigger(seconds=settings.alert_check_interval_seconds),
        id="check_alerts",
        name="Check alerts",
        replace_existing=True,
    )

    # Add holdings sync job (daily)
    scheduler.add_job(
        sync_fund_holdings,
        trigger=IntervalTrigger(hours=24),
        id="sync_fund_holdings",
        name="Sync fund holdings",
        replace_existing=True,
    )

    # Start scheduler
    scheduler.start()
    print("Background task scheduler started")


def stop_scheduler():
    """Stop the background task scheduler."""
    scheduler.shutdown()
    print("Background task scheduler stopped")
