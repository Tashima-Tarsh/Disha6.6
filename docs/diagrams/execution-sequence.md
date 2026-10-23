# Representative execution sequence

> **Scope:** source-evidenced subset only; see [repository coverage](../repository-coverage.md). Static declarations are not proof of running services. Diagram nodes lacking source linkage are excluded.

```mermaid
sequenceDiagram
 participant UI as OSINT web page
 participant NX as Next.js /api/osint/scan
 participant PY as backend/app.py POST /scan
 participant COL as Collector registry
 UI->>NX: POST selected fields
 NX->>PY: POST JSON
 PY->>COL: plan(v) / submit
 loop Registrations in planned order
   COL-->>PY: Future result
   PY-->>NX: SSE data frame
   NX-->>UI: Streaming chunk
 end
 PY-->>UI: Final done frame via proxy
```

No runtime throughput, error rate or successful provider response has been verified.
