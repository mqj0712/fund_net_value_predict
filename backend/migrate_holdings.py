"""Database migration script to add holdings tables.

Run this script to add the new fund_holdings and fund_asset_allocation tables.
"""
import asyncio
from sqlalchemy import text
from app.db.session import engine, Base
from app.models.fund import FundHolding, FundAssetAllocation, Fund


async def migrate():
    """Create new tables."""
    print("Creating new tables...")
    print(f"Tables in metadata: {list(Base.metadata.tables.keys())}")

    async with engine.begin() as conn:
        # Create only the new tables
        await conn.run_sync(Base.metadata.create_all)

    # Verify tables were created
    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table'")
        )
        tables = [row[0] for row in result]
        print(f"Tables in database: {tables}")

    print("Migration completed successfully!")


if __name__ == "__main__":
    asyncio.run(migrate())
