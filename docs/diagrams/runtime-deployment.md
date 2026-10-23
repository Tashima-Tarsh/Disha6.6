# Deployment and runtime model

> **Scope:** source-evidenced subset only; see [repository coverage](../repository-coverage.md). Static declarations are not proof of running services. Diagram nodes lacking source linkage are excluded.

```mermaid
flowchart TD
 Browser[Browser] --> Next[Next.js web app: manifest/config]
 Next --> OSINT[FastAPI OSINT service: backend/app.py]
 Next -.-> Brain[FastAPI Brain: possible configured client]
 Std[Local MCP client] --> Explorer[MCP Explorer STDIO]
 Http[Remote MCP client] --> SSE[MCP Explorer SSE]
```

**Not verified:** whether these services deploy together, production hostnames, Compose/Kubernetes routing, secrets, orchestration, health, or actual operational state. Lines describe source-level interaction templates only. The dashed Brain connection is a configurable helper, not a proven active caller.
