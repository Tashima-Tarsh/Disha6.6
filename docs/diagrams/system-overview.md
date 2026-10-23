# System overview

> **Scope:** source-evidenced subset only; see [repository coverage](../repository-coverage.md). Static declarations are not proof of running services. Diagram nodes lacking source linkage are excluded.

```mermaid
flowchart TD
 UI[OSINT web page] --> PX[Next.js OSINT proxies]
 PX --> BA[Standalone FastAPI backend]
 BA --> REG[36 source-registered collectors]
 BA --> DB[Local SQLite graph]
 APP[Brain FastAPI app] --> ROUTER[Brain API router]
 ROUTER --> CTX[AppContext]
 CTX --> POL[SecurityPolicy]
 CTX --> STORE[SQLiteStore]
 CTX --> REASON[Heuristic ReasoningBrain]
 M1[Explorer STDIO] --> MCP[Explorer MCP handler server]
 M2[Explorer SSE] --> MCP
```

The Brain and OSINT services have distinct entry points and stores. See [architecture overview](../architecture-overview.md).
