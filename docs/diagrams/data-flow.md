# Data-flow map

> **Scope:** source-evidenced subset only; see [repository coverage](../repository-coverage.md). Static declarations are not proof of running services. Diagram nodes lacking source linkage are excluded.

```mermaid
flowchart LR
 Browser[OSINT browser input] --> ScanProxy[Next.js scan proxy]
 ScanProxy --> Scan[FastAPI /scan]
 Scan --> Reg[Collector registry]
 Reg --> SSE[SSE data frames]
 SSE --> ScanProxy
 ScanProxy --> Browser
 Browser --> RProxy[Resolve proxy]
 RProxy --> Resolve[FastAPI /api/v1/resolve]
 Resolve --> LocalDB[OSINT SQLite graph]
```

Return edges are response flow, not additional runtime services. The Python streaming loop waits on collector futures in plan order.
