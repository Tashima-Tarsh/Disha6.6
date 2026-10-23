# Backend architecture — distinct services

## Standalone OSINT backend — `backend/app.py`

Single inspected file provides a FastAPI app, `@collector` decorator registry (**36 declarations**), a scan SSE route, formation handlers and a SQLite identity graph. Explicit HTTP routes are `/scan`, `/tools`, `/`, `/api/v1/vyuh/formations`, `/api/v1/vyuh/activate`, `/api/v1/graph/stats`, `/api/v1/data/load`, `/api/v1/resolve` (**8 decorators**). Registration is not evidence that third-party collectors are installed or available.

Source: [backend/app.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/backend/app.py).

## Brain backend — `disha/brain/`

`disha/brain/app.py` instantiates an EventBus and WebSocketManager, registers `disha/brain/api/routes.py`, and connects alert events to a WebSocket broadcast. **18** method decorators were counted under `/api/v1` in the inspected router. The AppContext constructs SQLiteStore, SecurityPolicy, ReasoningBrain, Executor and additional modules. Brain routes implement token-required API dependencies for sensitive operations.

Source: [app.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/app.py), [api/routes.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/api/routes.py), [auth.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/security/auth.py).

## Boundaries and unresolved integration
These are **separate FastAPI processes in source** with distinct middleware and SQLite implementations. The web package also declares PostgreSQL and Redis dependencies, but running stores were not observed. More than 4,000 tracked entries fall under `disha/`; only selected Brain/MCP files were inspected. Full route/dependency coverage is not claimed.

[See execution traces](data-and-execution-flows.md) · [Audit](technical-audit.md).
