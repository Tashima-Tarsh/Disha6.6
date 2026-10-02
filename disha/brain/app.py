from __future__ import annotations

import secrets

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import context, router
from .config import settings
from .event_bus import EventBus
from .monitoring.service import MonitoringService
from .websocket.manager import WebSocketManager

event_bus = EventBus()
websocket_manager = WebSocketManager()
context.monitoring = MonitoringService(event_bus)
event_bus.subscribe("alerts", websocket_manager.broadcast)

app = FastAPI(title=settings.app_name, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.websocket(settings.websocket_path)
async def alerts_socket(websocket: WebSocket) -> None:
    supplied = websocket.headers.get("authorization", "")
    if not settings.api_token or not secrets.compare_digest(supplied, f"Bearer {settings.api_token}"):
        await websocket.close(code=1008)
        return
    origin = websocket.headers.get("origin")
    if origin and origin not in settings.allowed_origins:
        await websocket.close(code=1008)
        return
    await websocket_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
