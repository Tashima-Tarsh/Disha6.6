# DISHA 6.6 — Audit remediation status (24 October 2026)

Source audit HEAD at inspection: `99411270` (Full osint vyuha bridge #181).
Remediation on main: #182, #183, #184, and subsequent P1 branches.

## P0 — Critical

| Finding | Status | Evidence |
|--------|--------|----------|
| Web OSINT runner omits Bearer token | **Fixed** | `web/app/api/v1/osint/run/route.ts` sends `Authorization: Bearer` |
| Web expects SSE, Python returns JSON | **Fixed** | Run + legacy scan routes parse JSON, check `res.ok` |
| Python evidence bridge independent hashes | **Mitigated → ingest** | Python emits proposals; **web ledger** re-appends run + per-collector events with authoritative hashes |
| Human review wrong evidenceId | **Fixed** | Orchestrator returns original `ReviewItem.evidenceId`; `getById` on queue |
| Execution bypasses adapter-policy | **Fixed (backend)** | `plan(allow_active=False)` blocks `active_network` (port scan, etc.) |
| Caller-provided reviewer identity | **Fixed** | API uses `X-Disha-Actor-*` / principal; rejects body.actor override; only human may VERIFIED |

## High

| Finding | Status | Notes |
|--------|--------|-------|
| Over-escaped regexes | **Fixed** | `\D` / `\d` in normalizers |
| Sensitive input echoes | **Fixed** | `redact_inputs`, Aadhaar last-4 only |
| HIBP false clean on failure | **Fixed** | `verdict: unknown` |
| `/tools` array vs object | **Fixed** | Accepts `{ collectors }` |
| Postgres silent memory fallback | **Fixed (production)** | `NODE_ENV=production` or `DISHA_REQUIRE_POSTGRES=1` exits if no DB |
| Postgres concurrent append | **Fixed** | Web ledger + package store use `pg_advisory_xact_lock` |
| 532 catalog vs runtime | **Open (P2)** | Catalog is discovery; not operational fleet |
| Dual execution architectures | **Partially closed** | OSINT run now always writes the web mission ledger |

## P1 remaining

1. **Registry reconciliation**: One status field per catalog entry with dated smoke result.
2. **Vyuha → mission**: Formation proposals attached as evidence on active missions only.
3. **Tracked credential-like local status data**: Secret scan + purge of committed status dumps.
4. **E2E CI**: OSINT → ledger → human VERIFIED → chain verify in Actions.

## Acceptance

- [x] Scan without Bearer → 401/503, not false completion
- [x] IP-only scan does not run port scan without `allowActive: true`
- [x] Review API cannot set reviewer via body alone
- [x] Production API does not start without Postgres when required
- [x] OSINT run returns `ledgerEventIds` (parent + one per collector) on the web ledger chain
- [ ] Automated E2E in CI (manual still required)

## Honest product claim

Critical integration and policy defects from the 24 Oct audit are fixed in source. The 532-tool catalog remains a discovery inventory, not a verified operational fleet.
