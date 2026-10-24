# DISHA 6.6 — Audit remediation status (24 October 2026)

Source audit HEAD at inspection: `99411270` (Full osint vyuha bridge #181).
Remediation applied on main via #182, #183, and this branch.

## P0 — Critical

| Finding | Status | Evidence |
|--------|--------|----------|
| Web OSINT runner omits Bearer token | **Fixed** | `web/app/api/v1/osint/run/route.ts` sends `Authorization: Bearer` |
| Web expects SSE, Python returns JSON | **Fixed** | Run + legacy scan routes parse JSON, check `res.ok` |
| Python evidence bridge independent hashes | **Mitigated** | Sequential `previousHash` in batch; marked `proposal_only_not_persisted`; Node ledger re-hashes on ingest |
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
| 532 catalog vs runtime | **Open (P1/P2)** | Catalog is discovery; not operational fleet — workbench honesty remains |
| Dual execution architectures | **Open** | Web bus + Python backend coexist; governance improved on both edges |

## P1 remaining (not code-complete in this pass)

1. **Ingest path**: Web OSINT results → single TypeScript ledger append (canonical chain).
2. **Registry reconciliation**: One status field per catalog entry with dated smoke result.
3. **Vyuha → mission**: Formation proposals attached as evidence on active missions only.
4. **Postgres concurrent append**: Transaction + advisory lock around `getLatestHash` + `INSERT` (schema ready).
5. **Tracked credential-like local status data**: Secret scan + purge of committed status dumps.

## Acceptance for merged P0/P1

- [x] Scan without Bearer → 401/503, not false completion
- [x] IP-only scan does not run port scan without `allowActive: true`
- [x] Review API cannot set reviewer via body alone
- [x] Production API does not start without Postgres when required
- [ ] End-to-end mission: OSINT → ledger → human VERIFIED → `verifyIntegrity` passes (manual / CI still needed)

## Honest product claim

Disha has a constitutional spine and the critical integration defects from the 24 Oct audit are addressed in source. It is **not** yet a certified production intelligence OS: the 532-tool catalog is not a verified fleet, and full chain-of-custody across every UI path still needs an integration test suite.
