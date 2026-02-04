"""WebSocket handlers for real-time updates."""
import asyncio
import json
from datetime import datetime
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect

from app.db.session import AsyncSessionLocal
from app.core.nav_estimator import nav_estimator
from app.schemas.fund import WSMessage
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect

from app.core.nav_estimator import nav_estimator
from app.schemas.fund import WSMessage


class ConnectionManager:
    """Manage WebSocket connections."""

    def __init__(self):
        """Initialize connection manager."""
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str):
        """Connect a client to a channel."""
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        """Disconnect a client from a channel."""
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)
            if not self.active_connections[channel]:
                del self.active_connections[channel]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to a specific client."""
        await websocket.send_json(message)

    async def broadcast(self, message: dict, channel: str):
        """Broadcast message to all clients in a channel."""
        if channel not in self.active_connections:
            return

        disconnected = set()
        for connection in self.active_connections[channel]:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)

        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection, channel)


# Global connection manager
manager = ConnectionManager()


async def realtime_nav_handler(websocket: WebSocket, fund_code: str):
    """Handle real-time NAV updates for a fund."""
    channel = f"fund:{fund_code}"
    await manager.connect(websocket, channel)

    try:
        # Send initial data
        async with AsyncSessionLocal() as db:
            nav_data = await nav_estimator.get_estimated_nav(fund_code, db_session=db)
        if nav_data:
            message = WSMessage(
                type="nav_update",
                data=nav_data,
                timestamp=datetime.utcnow(),
            )
            await manager.send_personal_message(message.model_dump(mode='json'), websocket)

        # Keep connection alive and send updates
        while True:
            try:
                # Wait for client message or timeout
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)

                # If client sends "ping", respond with "pong"
                if data == "ping":
                    await websocket.send_text("pong")

            except asyncio.TimeoutError:
                # Send periodic update
                async with AsyncSessionLocal() as db:
                    nav_data = await nav_estimator.get_estimated_nav(fund_code, db_session=db)
                if nav_data:
                    message = WSMessage(
                        type="nav_update",
                        data=nav_data,
                        timestamp=datetime.utcnow(),
                    )
                    await manager.send_personal_message(message.model_dump(mode='json'), websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, channel)


async def portfolio_handler(websocket: WebSocket, portfolio_id: int):
    """Handle real-time portfolio updates."""
    channel = f"portfolio:{portfolio_id}"
    await manager.connect(websocket, channel)

    try:
        while True:
            try:
                # Wait for client message or timeout
                data = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)

                if data == "ping":
                    await websocket.send_text("pong")

            except asyncio.TimeoutError:
                # Send periodic update
                message = WSMessage(
                    type="portfolio_update",
                    data={"portfolio_id": portfolio_id, "timestamp": datetime.utcnow().isoformat()},
                    timestamp=datetime.utcnow(),
                )
                await manager.send_personal_message(message.model_dump(mode='json'), websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, channel)


async def alerts_handler(websocket: WebSocket):
    """Handle alert notifications."""
    channel = "alerts"
    await manager.connect(websocket, channel)

    try:
        while True:
            try:
                # Wait for client message
                data = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)

                if data == "ping":
                    await websocket.send_text("pong")

            except asyncio.TimeoutError:
                # Keep connection alive
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, channel)


async def broadcast_alert(alert_data: dict):
    """Broadcast alert to all connected clients."""
    message = WSMessage(
        type="alert",
        data=alert_data,
        timestamp=datetime.utcnow(),
    )
    await manager.broadcast(message.model_dump(mode='json'), "alerts")
