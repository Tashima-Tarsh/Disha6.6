# Frontend architecture — inspected subset

Source files `web/app/route.ts`, `web/app/osint/page.tsx`, `web/app/api/osint/{scan,resolve,data/load,tools,vyuh/activate}/route.ts`, `web/lib/server/auth.ts`, `web/lib/server/brain-client.ts`, and `web/package.json` were inspected.

## Framework and routing
- The web package declares Next.js **16.3.6**, React **19.3.0**, TypeScript, Zod, Redis, and `pg`.
- The root `web/app/route.ts` reads the access cookie and redirects to `/investigate` if its token is accepted or `/login` otherwise.
- `web/app/osint/page.tsx` is a client component that issues HTTP requests, consumes SSE output, updates local React state, and exposes identifier-resolution and formation controls.

## Observed API connections
| From | Through | To |
| --- | --- | --- |
| OSINT page | `/api/osint/scan` | Standalone Python `POST /scan` |
| OSINT page | `/api/osint/resolve` | Python `POST /api/v1/resolve` |
| OSINT page | `/api/osint/data/load` | Python `POST /api/v1/data/load` |
| OSINT page | `/api/osint/vyuh/activate` | Python `POST /api/v1/vyuh/activate` |
| Other server modules (untraced) | `brainFetch()` | Configured Brain API URL with bearer token |

Other pages and 136 tracked files under `web/app/api/` were **enumerated only**, not comprehensively content inspected. The total number of production-reachable pages, route handlers, and dashboard integrations remains **unknown**.

## Security boundary
The inspected OSINT proxies do not call the visible `requirePrincipal` helper. Determine whether middleware/ingress enforces auth before treating them as secure. See [audit](technical-audit.md).

[Return to README](../README.md).
