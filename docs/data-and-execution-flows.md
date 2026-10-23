# Frontend, backend, data and execution flows

> Static reconstruction from inspected source only. No service was started.

## 1. OSINT scan stream — directly traced

```mermaid
sequenceDiagram
  participant U as Browser user
  participant P as web/app/osint/page.tsx
  participant N as web/app/api/osint/scan/route.ts
  participant F as backend/app.py
  participant R as collector REGISTRY
  U->>P: Request scan (UI)
  P->>N: POST JSON /api/osint/scan
  N->>F: POST JSON /scan
  F->>R: plan(inputs), submit collectors to pool
  loop For each submitted collector result
    R-->>F: result (or error wrapper)
    F-->>N: SSE data: result
    N-->>P: forwarded stream chunks
  end
  P-->>U: Updates results
```

Evidence: `web/app/osint/page.tsx:41-97`, `web/app/api/osint/scan/route.ts:8-36`, `backend/app.py:781-795`. The OSINT backend uses a thread pool for submitted work, but waits on futures in registration order in the streaming generator. That is not equivalent to delivering results in completion order. No runtime performance claim is made.

## 2. OSINT graph and dataset ingestion

- The UI calls `/api/osint/resolve` and `/api/osint/data/load` (`web/app/osint/page.tsx:98-127`).
- Next.js forwards to `backend/app.py` endpoints `/api/v1/resolve` and `/api/v1/data/load` respectively (proxy files and `backend/app.py:827-870`).
- `backend/app.py:700-748` implements a SQLite graph breadth-first traversal of identifiers, edges, facts, and breach hits.
- The Python service's local SQLite schema/persistence is **not** the same abstraction as `disha/brain/database/store.py`.

The content and provenance of datasets were **not** validated. This document does not approve ingestion of third-party personal information or expose instructions for acquiring illicit data.

## 3. Brain command path — source-level reconstruction

```mermaid
sequenceDiagram
  participant C as API client
  participant A as disha/brain/app.py
  participant R as api/routes.py
  participant X as AppContext
  participant P as SecurityPolicy
  participant E as Executor
  participant D as SQLiteStore
  C->>A: /api/v1/command
  A->>R: registered router
  R->>R: require_api_token dependency
  R->>X: application context
  X->>P: risk classification
  X->>E: execution pathway (conditional)
  E->>D: storage/event access (where invoked)
  R-->>C: command response
```

The sequence simplifies conditional branches; for precise behavior inspect `disha/brain/api/routes.py:415-477`. `AppContext` constructs `ReasoningBrain`, `Executor`, `MemoryBrain`, `RiskEngine`, `DecisionEngine` and `SQLiteStore` at module load (`routes.py:43-79`). A created object is not proof every operation is triggered on every request.

## 4. MCP entry points

```mermaid
flowchart TD
 A[disha/services/mcp/src/index.ts] -->|stdio, createServer| C[Explorer server.ts]
 B[disha/services/mcp/src/http.ts] -->|SSE, createServer| C
 B -->|POST /mcp| D[501 Not implemented]
 Z[src/entrypoints/mcp.ts] -.->|Separate implementation; missing imports in tracked src tree| U[Unverified build]
```

Do not conflate static MCP tool-list definitions with working connector sessions.

## 5. Deployment/data architecture and runtime uncertainty

- `web/package.json` declares Next.js 16.3.6, React 19.3, `pg`, `redis`, and related dependencies.
- `disha/brain/requirements.txt` declares FastAPI, Pydantic, httpx, scikit-learn, and pytest.
- The repository tracks Docker/Compose manifests, Kubernetes configuration, SQL migrations, and infrastructure definitions. They were enumerated but **not audited or executed**.
- No claims are made about active production services, actual database instances, secrets, health or readiness of the integration fleet.
