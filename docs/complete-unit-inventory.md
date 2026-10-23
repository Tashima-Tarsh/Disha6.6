# Architectural unit inventory — evidence-backed subset

**Source tree:** `4b7caad2612199a0870bc7b60396d93fc307f38a`. **Scope:** 34 inspected files, **not** a complete repository-wide unit census; see [coverage](repository-coverage.md). Counts below are registration declarations or distinct traced components, not live service counts.

## Counted and traced units

| Unit ID | Category | Unit / responsibility | Source | Classification |
| --- | --- | --- | --- | --- |
| UI-01 | Web page | OSINT input, scan streaming, resolution, ingestion actions | [web/app/osint/page.tsx](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/app/osint/page.tsx) | Implemented in source; rendered runtime untested |
| WEB-01 | HTTP proxy | Scan SSE forwarding to Python /scan | [web/app/api/osint/scan/route.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/app/api/osint/scan/route.ts) | Explicit call path |
| WEB-02 | HTTP proxy | Identifier resolution | [web/app/api/osint/resolve/route.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/app/api/osint/resolve/route.ts) | Explicit call path |
| WEB-03 | HTTP proxy | CSV data loading | [web/app/api/osint/data/load/route.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/app/api/osint/data/load/route.ts) | Explicit call path |
| WEB-04 | HTTP proxy | Collector inventory | [web/app/api/osint/tools/route.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/app/api/osint/tools/route.ts) | Explicit call path |
| WEB-05 | HTTP proxy | Formation activation | [web/app/api/osint/vyuh/activate/route.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/app/api/osint/vyuh/activate/route.ts) | Explicit call path |
| WEB-06 | Web gateway | Session-cookie redirect on root route | [web/app/route.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/app/route.ts) | Implemented |
| WEB-07 | Server utility | Token parsing and session functions | [web/lib/server/auth.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/lib/server/auth.ts) | Implemented; not proven used on all APIs |
| WEB-08 | HTTP client | Adds DISHA Brain bearer token | [web/lib/server/brain-client.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/lib/server/brain-client.ts) | Implemented helper; caller graph incomplete |
| WEB-09 | Workflow engine | Chat/http/sleep/set node interpreter | [web/lib/server/agent/workflow.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/lib/server/agent/workflow.ts) | Implemented source; entry-point reachability unknown |
| WEB-10 | Agent graph | Stateful investigation graph abstraction | [web/lib/server/agent/langchain-pipeline.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/lib/server/agent/langchain-pipeline.ts) | Implemented source; runtime not verified |
| WEB-11 | Memory graph | Redis and Brain-assisted entity relationships | [web/lib/server/agent/memoryGraph.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/lib/server/agent/memoryGraph.ts) | Implemented helper; persistence/runtime untested |
| WEB-12 | MCP adapter | OSINT tool client | [web/lib/server/openosint-mcp-client.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/lib/server/openosint-mcp-client.ts) | Implemented class; activation unverified |
| OSINT-01 | FastAPI application | Standalone endpoints and middleware | [backend/app.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/backend/app.py#L33) | Code-defined |
| OSINT-02 | Tool registry | **36** explicit `@collector` decorators | [backend/app.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/backend/app.py#L165-L375) | Static registrations only; external availability unverified |
| OSINT-03 | Data service | SQLite identifier/edge/fact/breach tables, BFS resolver | [backend/app.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/backend/app.py#L700-L850) | Implemented local code |
| OSINT-04 | Formation controller | List and activate formations | [backend/app.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/backend/app.py#L453-L460) | API declarations |
| BRAIN-01 | FastAPI application | Brain router registration and websocket alerts | [disha/brain/app.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/app.py) | Implemented |
| BRAIN-02 | API controller | **18** `@router` method decorators under `/api/v1` | [disha/brain/api/routes.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/api/routes.py) | Static registration count |
| BRAIN-03 | Context | Constructs persistence/policy/graph/reasoning instances | [disha/brain/api/routes.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/api/routes.py#L43-L79) | Constructed at import; runtime untested |
| BRAIN-04 | Policy | Risk classification and filesystem boundaries | [disha/brain/security/policy.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/security/policy.py) | Implemented; boundary concern |
| BRAIN-05 | Auth dependency | Require configured bearer token | [disha/brain/security/auth.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/security/auth.py) | Implemented dependency |
| BRAIN-06 | Persistence | SQLiteStore for events, cache, memory and graph | [disha/brain/database/store.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/database/store.py) | Methods implemented |
| BRAIN-07 | Planner | Heuristic planning through `_heuristic_plan()` | [disha/brain/brain/reasoning.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/brain/reasoning.py) | **Deterministic, not LLM backed** |
| BRAIN-08 | Executor | Local tool dispatch subject to policy | [disha/brain/brain/executor.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/brain/executor.py) | Implemented; runtime untested |
| BRAIN-09 | Risk | Risk assessment logic | [disha/brain/brain/risk_engine.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/brain/risk_engine.py) | Implemented; caller context traced |
| BRAIN-10 | Integration health | Optional-module status probes | [disha/brain/modules/registry.py](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/modules/registry.py) | Implemented; health not verified |
| MCP-01 | Explorer factory | MCP tool/resources/prompts handlers | [disha/services/mcp/src/server.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/services/mcp/src/server.ts) | Explicit protocol handlers |
| MCP-02 | STDIO | Explorer local stdio transport | [disha/services/mcp/src/index.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/services/mcp/src/index.ts) | Entry point defined |
| MCP-03 | HTTP/SSE | Explorer SSE transport; HTTP /mcp stub | [disha/services/mcp/src/http.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/services/mcp/src/http.ts) | **SSE implemented in source; /mcp 501** |
| MCP-04 | Separate root MCP | Alternate MCP entry point importing untracked siblings | [src/entrypoints/mcp.ts](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/src/entrypoints/mcp.ts) | Source present, build status uncertain |

## Counting integrity

- **36** OSINT collector decorators are counted once each, even when names refer to external tools whose executables may be absent.
- **8** standalone backend route decorators and **18** Brain router decorators were matched in inspected files; additional middleware or mounted routes are not included.
- The table above lists **31 named architectural entries** that were inspected, not all units in Disha6.6.
- A runtime count of agents, MCP tools, adapters, total endpoints, active integrations, pages, or microservices is **unknown** until all registration and reachability sites are examined. Do not promote directory counts into working-tool statistics.

## Architectural boundaries

OSINT's local SQLite graph and Brain's SQLiteStore are distinct source implementations. The web package also lists a `pg` client and has SQL migrations; do not infer that all services use one database.

The Explorer MCP server and root `src/entrypoints/mcp.ts` must be inventoried separately. The latter imports files absent from the tracked `src/` paths; consult the static audit before describing it as an active service.
