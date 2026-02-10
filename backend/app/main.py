"""FastAPI application entry point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import init_db
from app.api.v1.endpoints import funds, portfolio, alerts, kline
from app.api.websocket import realtime_nav_handler, portfolio_handler, alerts_handler
from app.tasks.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("Starting up...")
    await init_db()
    print("Database initialized")
    start_scheduler()
    print("Scheduler started")

    yield

    # Shutdown
    print("Shutting down...")
    stop_scheduler()
    print("Scheduler stopped")


# Create FastAPI app
app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(funds.router, prefix=f"{settings.api_v1_prefix}", tags=["funds"])
app.include_router(portfolio.router, prefix=f"{settings.api_v1_prefix}", tags=["portfolio"])
app.include_router(alerts.router, prefix=f"{settings.api_v1_prefix}", tags=["alerts"])
app.include_router(kline.router, prefix="/api/v1/kline", tags=["kline"])


# WebSocket endpoints
@app.websocket("/ws/realtime/{fund_code}")
async def websocket_realtime_nav(websocket: WebSocket, fund_code: str):
    """WebSocket endpoint for real-time NAV updates."""
    await realtime_nav_handler(websocket, fund_code)


@app.websocket("/ws/portfolio/{portfolio_id}")
async def websocket_portfolio(websocket: WebSocket, portfolio_id: int):
    """WebSocket endpoint for portfolio updates."""
    await portfolio_handler(websocket, portfolio_id)


@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """WebSocket endpoint for alert notifications."""
    await alerts_handler(websocket)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.version}


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Fund NAV Estimation API",
        "version": settings.version,
        "docs": "/docs",
    }
