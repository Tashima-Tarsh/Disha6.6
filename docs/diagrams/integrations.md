# Tools and integrations

> **Scope:** source-evidenced subset only; see [repository coverage](../repository-coverage.md). Static declarations are not proof of running services. Diagram nodes lacking source linkage are excluded.

```mermaid
flowchart TD
 Scan[backend/app.py /scan] --> Registry[36 registered collector declarations]
 Registry --> External[External services / optional binaries: activation unverified]
 STD[Explorer STDIO entry] --> Server[Explorer MCP handlers]
 SSE[Explorer SSE HTTP entry] --> Server
 SSE --> Stub[POST /mcp returns 501]
```

Only collector registration and MCP handler wiring were inspected. No third-party endpoint or optional executable was tested. The integration tree contains 1,233 tracked files, **not** 1,233 verified integrations.
