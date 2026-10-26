from __future__ import annotations

import hmac

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
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
    # Require authentication via query param ?token=... or Authorization header
    token = websocket.query_params.get("token")
    if not token:
        auth_header = websocket.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
        elif auth_header:
            token = auth_header.strip()

    if not settings.api_token or not token or not hmac.compare_digest(token, settings.api_token):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
