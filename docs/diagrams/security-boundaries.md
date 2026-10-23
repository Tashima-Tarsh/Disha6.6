# Security and trust boundaries

> **Scope:** source-evidenced subset only; see [repository coverage](../repository-coverage.md). Static declarations are not proof of running services. Diagram nodes lacking source linkage are excluded.

```mermaid
flowchart LR
 USER[Untrusted browser] --> PROXY[Inspected Next.js OSINT proxies]
 PROXY --> API[Standalone OSINT API: auth not visible]
 API --> GRAPH[Potentially sensitive SQLite graph]
 CLIENT[Other web server callers] --> TOKEN[brainFetch bearer header]
 TOKEN --> BRAIN[Brain guarded routes]
 REMOTE[MCP clients] --> SSE[Explorer SSE: auth optional]
```

This is an audit diagram, **not approval to expose any service**. See [security findings](../technical-audit.md).
