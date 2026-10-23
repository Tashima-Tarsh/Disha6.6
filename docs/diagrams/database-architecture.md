# Database and storage

> **Scope:** source-evidenced subset only; see [repository coverage](../repository-coverage.md). Static declarations are not proof of running services. Diagram nodes lacking source linkage are excluded.

```mermaid
flowchart TB
 O[backend/app.py] --> ODB[OSINT SQLite identifier/edge/fact/breach tables]
 BR[disha/brain/api/routes.py AppContext] --> BStore[Brain SQLiteStore]
 BStore --> Events[Memory, events, cache, telemetry, graph methods]
 W[web/package.json] -.-> PG[pg client dependency]
 W -.-> Redis[redis client dependency]
```

Dashed lines are **manifest dependency declarations**, not established live network connections. A full SQL schema/migration audit was not performed. Two SQLite abstractions are independent in source.
