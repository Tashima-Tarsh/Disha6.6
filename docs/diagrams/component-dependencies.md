# Component dependencies

> **Scope:** source-evidenced subset only; see [repository coverage](../repository-coverage.md). Static declarations are not proof of running services. Diagram nodes lacking source linkage are excluded.

```mermaid
flowchart LR
 App[disha/brain/app.py] -->|imports router| Routes[disha/brain/api/routes.py]
 Routes -->|imports/constructs| Store[SQLiteStore]
 Routes -->|imports/constructs| Policy[SecurityPolicy]
 Routes -->|imports/constructs| Reason[ReasoningBrain]
 Routes -->|imports/constructs| Exec[Executor]
 Exec -->|depends on| Store
 Exec -->|depends on| Policy
 Std[Explorer index.ts] -->|imports createServer| M[MCP Explorer server.ts]
 Http[Explorer http.ts] -->|imports createServer| M
```

These are **imports/construction**, not network operations.
