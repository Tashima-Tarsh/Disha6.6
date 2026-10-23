# DISHA 6.6 — static architecture and security audit (initial pass)

**Date:** 2026-10-23. **Method:** inspection of 34 selected tracked files. **No code, tests, deployments or integrations were executed.** Severity is a remediation priority based on visible source, **not proof of production exploitability**. Scope and unresolved coverage: [repository-coverage.md](repository-coverage.md).

| ID | Priority | Finding | Exact evidence | Confidence and dynamic verification |
| --- | --- | --- | --- | --- |
| DISHA-01 | **High** | Standalone OSINT API declares scan, graph resolve and CSV ingestion endpoints with no authentication dependency in the inspected `backend/app.py`; its CORS middleware allows all origins. Deployment/network perimeters may mitigate this, but are unverified. | [app.py:33](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/backend/app.py#L33-L34), [app.py:781-869](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/backend/app.py#L781-L869) | High for source observation; external exposure **unknown** |
| DISHA-02 | **High** | OSINT `data_load` accepts client-provided `path` or `directory` and forwards it to file loaders with no canonical allowlist or workspace containment check visible at that entry point. May expose sensitive local data if reachable by untrusted principals. | [app.py:827-848](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/backend/app.py#L827-L848) | High for input flow; validate loaders/perimeter before exploitability claims |
| DISHA-03 | **Medium** | Next.js OSINT scan/load/resolve proxies directly forward JSON without calling the normal `requirePrincipal` helper in those route modules. Global middleware, ingress policy and private deployment must be checked separately. | [scan proxy:1-15](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/app/api/osint/scan/route.ts#L1-L15), [load proxy:1-18](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/app/api/osint/data/load/route.ts#L1-L18), [auth helper](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/lib/server/auth.ts) | High for local source; effective perimeter **unknown** |
| DISHA-04 | **Medium** | The Explorer SSE HTTP authentication middleware explicitly permits all requests when `MCP_API_KEY` is not set; `/mcp` is a 501 placeholder. | [http.ts:17-49](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/services/mcp/src/http.ts#L17-L49) | High for code; network exposure unverified |
| DISHA-05 | **Medium** | Brain workspace path containment compares string prefixes after `resolve()`. Sibling paths sharing the root prefix can pass a string-prefix check; path-relative containment is recommended instead. | [policy.py:56-60](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/security/policy.py#L56-L60) | High for code logic; no untrusted caller exploitation established |
| DISHA-06 | **Medium** | Root `src/entrypoints/mcp.ts` imports `../commands.js`, `../tools.js`, `../Tool.js`, and `src/state/AppStateStore.js`, while the tracked root `src/` contains only five files; this appears to be stranded/copied source. | [mcp.ts:1-29](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/src/entrypoints/mcp.ts#L1-L29) plus recursive tree enumeration | Medium; compilation resolution not tested |
| DISHA-07 | **Medium** | The Explorer HTTP wrapper stores a single mutable `sseTransport` at module scope. Concurrent SSE clients may contend for that transport; sessions are not keyed by client in this file. | [http.ts:17-41](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/services/mcp/src/http.ts#L17-L41) | Medium; concurrency test needed |
| DISHA-08 | **Medium** | README historically described a primarily OSINT/32-collector platform; source contains independent multi-service code, and `backend/app.py` declares **36** collector decorators. This README drift obscures trust boundaries. | [archived README](archive/README.before-source-audit-2026-10-23.md), [app.py decorators](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/backend/app.py#L165-L375) | High; documentation issue |
| DISHA-09 | **Informational** | Brain's `ReasoningBrain` directly uses a heuristic plan rather than provider-backed inference; do not market this component as verified autonomous LLM reasoning. | [reasoning.py:6-16](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/disha/brain/brain/reasoning.py#L6-L16) | High for implementation; runtime behavior not exercised |
| DISHA-10 | **Informational** | `backend/app.py` submits collector futures to a pool but consumes `fut.result()` in planned order; slow earlier collectors can delay later completed results in SSE. | [app.py:781-795](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/backend/app.py#L781-L795) | High for code; latency impact unmeasured |

## Security architecture — observed rather than assumed

- **Brain:** `disha/brain/security/auth.py:8-19` explicitly rejects a missing Brain API token and checks `Authorization: Bearer …`. Most Brain routes attach this dependency; `/health` is intentionally unguarded.
- **Web:** `web/lib/server/auth.ts` supports signed session tokens and related routines. Root `web/app/route.ts` redirects based on an access token, but this does **not** by itself secure every Next.js API route.
- **Standalone OSINT:** permissive CORS plus lack of in-function auth is a materially different trust boundary from the Brain.
- **MCP Explorer:** authentication is optional when `MCP_API_KEY` is absent. `/mcp` cannot be described as implemented Streamable HTTP.
- **Personal data:** graph/breach datasets can be sensitive; review authorization, provenance, consent/legal basis, data minimization, retention, auditing and access isolation before any production use.

## Recommended remediation (not performed)

1. Review the public/private network exposure of each FastAPI and MCP process. Require authentication/authorization for sensitive OSINT and MCP operations and constrain CORS to authorized origins.
2. Apply a canonical workspace/data-root allowlist for OSINT ingestion; separate data-loader permissions from read-only lookup capabilities.
3. Establish route-by-route policy enforcement in the web proxy and reject unauthorized ingestion/execution before forwarding.
4. Replace path string-prefix checks with resolved-path containment such as `Path.relative_to` or `is_relative_to` and test sibling-prefix escapes.
5. Isolate MCP SSE sessions per client and make missing authentication fail closed for remote deployments.
6. Determine whether root `src/entrypoints/mcp.ts` is legacy or intended active code; either restore its actual dependencies under a separately approved development task or document it as inactive.
7. Enforce truthful capability states and integration health; distinguish planned, registered, reachable and operational modules.
8. Add focused unit/integration regression tests and run them under an independently approved testing scope.

## Limits

No application source file was changed. No vulnerability was exploited; no authentication bypass, sensitive-data retrieval or service exposure was tested. Findings are based on code locations and need boundary-specific validation prior to risk acceptance.
