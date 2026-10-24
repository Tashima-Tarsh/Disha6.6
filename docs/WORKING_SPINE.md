# Working constitutional spine (not the 532 catalog)

Disha’s differentiator is **evidence-governed intelligence**, not a giant tool list.
This document is the path that is meant to **work**.

## Unique operating chain

```
source → observation → policy → evidence → human review → decision
```

| Step | Working surface |
|------|-----------------|
| Policy | Backend `allowActive` (default deny for active probes) |
| Observation | `POST /scan` (Python) + `POST /api/v1/osint/run` (Next.js) |
| Evidence | Web `appendEvidenceEvent` → mission hash chain |
| Vyuha (advisory) | `GET/POST /api/v1/vyuha/*` → same ledger |
| Review | packages API `/v1/reviews` — human principal only for VERIFIED |

## Environment

```bash
export DISHA_OSINT_API_KEY=dev-key
export DISHA_API_KEY=dev-key
# optional durable ledger
export DATABASE_URL=postgres://...
export DISHA_REQUIRE_POSTGRES=0   # 1 in production
```

## Offline proof (no network)

```bash
cd backend && python spine_smoke.py
```

Asserts: active port-scan denied by default, redaction, bridge proposal-only, 8 formations mapped.

## Online minimal mission

1. Start backend: `cd backend && DISHA_OSINT_API_KEY=dev-key uvicorn app:app --port 8000`
2. Start web with same key + Next.js.
3. `POST /api/v1/osint/run` with `missionId`, adapter, purpose, input → receive `ledgerEventIds`.
4. `POST /api/v1/vyuha/activate` with `formationId` + `missionId` → more `ledgerEventIds`.
5. Export/verify mission chain via existing evidence export helpers.

## What is intentionally not “working fleet”

The **532 upstream catalog** is a discovery index. Most entries are unconfigured.
Do not market them as live collectors. The **~36 Python collectors** and **8 constitutional adapters** are the real code surface; only passive public ones run without extra install keys.

## Formation honesty

Vyuha activation is **proposal_only**. It never elevates to VERIFIED. Mapped collectors that are shell tools (Sherlock, etc.) return not_installed if binaries are missing — that is correct behavior.
