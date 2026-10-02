# Production remediation review — 2 October 2026

Baseline: `d8901a73bdb737cb5690965489db946b9e282722` on `main`.
Working branch: `codex/production-security-remediation`.

## Delivered fixes

| Boundary | Problem found | Change |
| --- | --- | --- |
| Edge transport | Hardcoded hosting origin, unauthenticated OSINT execution, invented records/status, consumed response-body reuse | Configured HTTPS origin, streamed unmodified responses, preserved auth failures, no fabricated evidence |
| Authentication | Shared password allowed selecting privileged email; weak session revocation | Database-backed individual password accounts, scrypt, stored roles, lockout, account create/reset/disable CLI |
| Sessions | Logout did not revoke server sessions; refresh races | Access checks active session state; transactional single-use rotation and rollback; logout/password reset revoke sessions |
| OIDC | Missing identity-token/nonce/session binding checks | Verified signed ID token, issuer/audience/nonce/subject/email, PKCE-bound state, allowlist and safe return URLs |
| Browser writes | Missing CSRF headers and refresh handling | Same-origin client helper, CSRF acquisition, bounded refresh coordinated across tabs |
| OTP | Replayable challenge without real delivery | Production disabled until a real delivery implementation exists; no visible OTP login |
| Environment | Invalid configuration could be cached before validation | Strict parsing with empty optional values normalized; cache only after all checks; production persistence required |
| Network | SSRF address and DNS rebinding gaps | Public-address validation, DNS-pinned connections, response/time limits, redirect credential stripping |
| Files | Lexical path validation allowed symlink escape and application-file access | Dedicated production data directory, secret/symlink rejection and no-follow writes |
| Missions | Reused client mission IDs could replace ownership | Atomic reservation, conflicts reject, owner fields no longer overwritten |
| Evidence | SQL null/empty conversion broke hashes; report self-reference | Null-preserving storage, digest-proven historical recovery, reproducible report payload |
| Durable work | Unstarted jobs expired in large batches; duplicate IDs without dedupe keys | Lease jobs as they are executed, unique IDs, handled heartbeat failures |
| Python WebSocket | Unauthenticated alert subscription | Bearer and browser-origin checks before accept |
| Product truthfulness | Fake surveillance records, map fallback entities, decorative telemetry | Real source workspace and provenance export, actual per-query status, genuine empty/unavailable states |
| Interface | Login clipping and unconfigured buttons; WebGL could break rendering | Responsive dark login, configured sign-in controls, accessible account form, error/loading pages and lightweight optional artwork |
| Runtime ownership | Five root CLI remnants referenced missing modules; old MCP manifest advertised unrelated source | Retained under `legacy/root-cli-residue`; canonical web/brain boundary clarified |
| Deployment | Edge and image release could bypass verification; uppercase image-owner tags; missing origin setting | Explicit verified deploy, migration gates, normalized image owner, locked Wrangler, origin readiness and domain smoke |

## Verification evidence

- Node **22.23.3** clean production build: passed. An initial failure was a corrupted retained Turbopack cache; removing generated `.next` and rebuilding succeeded.
- Web unit/regression tests: **255 passed**, including embedded PostgreSQL account/session/evidence transactions. Two obsolete tests asserting the old fixed screenshot layout were removed; the old demo-engine tests now import an isolated test fixture, not application code.
- Python active suites: **42 passed** under Python 3.12. The GitHub workflow verifies Python 3.11. Two dependency/test-configuration warnings remain (pytest asyncio configuration and Starlette/httpx deprecation).
- Lint, active type check, full web type check: passed without lint errors/warnings.
- `npm audit`: **0 reported vulnerabilities** in the final installed lockfile. This is not proof of absence of undisclosed vulnerabilities.
- Source syntax inventory: **3,516** JavaScript/TypeScript, Python, JSON/JSONC/JSONL and YAML files parsed successfully, including retained source. No conflict markers were found in those files. Whitespace check passed. Retained Go programs were not compiled. See `source-syntax-inventory.csv`; parsing does not verify imports, behavior or third-party dependencies.
- A read-only live source probe returned timeouts/DNS failures in this execution environment with zero substituted evidence. External source connectivity remains a deployment check.
- The existing public login page was observed loading. It still showed the earlier deployed UI; no release was performed by this review.
- The built local server returned login HTML, protected API rejection, and 503 for unconfigured dependencies. Server-page redirects may be streamed in a 200 response because the loading boundary starts rendering before authentication completes.

The browser service blocked loopback preview navigation. Local visual interaction and mobile screenshots could not be verified through that browser. No screenshot or source-string test is being presented as an end-to-end authenticated deployment test.

## Coverage and limits

This repository contains thousands of retained third-party/research files. Syntax scanning is distinct from manual semantic review. Manual review and regression work focused on the active web runtime, Python boundary, data persistence, authentication, network/file access and release configuration. Archived upstream programs are retained, not certified or silently added to production. See the source inventory for file-level parsing coverage; it is not a claim that every file is defect-free.

Postgres/PostGIS/pgvector container migrations, image publication, Cloudflare route changes, live account provisioning, external OIDC, provider credentials, source connectivity, disaster recovery, load testing and production browser flows still require the actual deployment environment. CI includes the migration rehearsal. Embedded PostgreSQL tests validate SQL/storage behavior but do not replace multi-host load/race testing or PostGIS execution.

DISHA currently uses an operator-managed shared workspace for admitted public intelligence and a dedicated file area; it is not represented as a tenant-isolated hosted SaaS. Mission ownership and account roles are enforced at API boundaries. Deploy separate environments where organizations require isolation. Source observations and deterministic assessments are not factual proof or a substitute for analyst review.

Use `docs/operations/production-setup.md` for the exact release, domain and password procedure. No production password or provider credential is embedded in this change.
