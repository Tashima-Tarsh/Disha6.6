# Production gaps — DISHA 6.6 (25 Oct 2026)

Honest checklist. “Complete working” for the **executable OSINT surface** ≠ claiming a 532-tool fleet.

## What works as code today

| Surface | Reality |
|---------|---------|
| ~36 Python collectors | Runnable code; network/live need outbound net; shell tools need binaries on PATH |
| Policy gate `allowActive` | Active probes default deny |
| Web OSINT + Vyuha → ledger | Parent + child evidence events with IDs |
| Review principal binding | Human-only VERIFIED |
| Postgres fail-closed | Production requires DATABASE_URL |
| Privacy split | `inputsDisplay` (UI PII) vs `inputsRedacted` (logs/evidence) |
| Offline spine smoke | `python backend/spine_smoke.py` |
| **E2E CI** | `.github/workflows/e2e-spine.yml` — smoke + API TestClient + ledger chain |

## Gaps blocking production certification

### P0 — remaining

1. ~~**E2E CI**~~ — **Done** (`e2e-spine.yml`: smoke, API auth/policy/PII, mission→VERIFIED→integrity)
2. **Secrets management** — no API keys in git; rotate `DISHA_*_API_KEY`; vault or cloud secret manager.
3. **Rate limits / abuse** — scan endpoints can be used to probe third parties; quota per principal.
4. **Audit log of UI access** — who viewed `inputsDisplay` PII (screen) must be logged separately from evidence.
5. **TLS + network isolation** — backend not public without reverse proxy; CORS locked to known origins.

### P1 — operational completeness

6. **Shell tool install path** — document/install holehe, sherlock, maigret, phoneinfoga or drop from “ready” claims.
7. **Upstream catalog honesty** — UI labels: ready / not_installed / catalog_only.
8. **Durable evidence retention** — backups, retention policy, export for third-party verify.
9. **Observability** — structured logs (redacted), metrics, health that fails if DB down.
10. **Auth model** — real IdP (OIDC) instead of shared Bearer for multi-user ops.

### P2 — product depth

11. Unify web ledger vs packages constitutional API into one deployment story.
12. Vyuha UI wired to `/api/v1/vyuha/*`.
13. India breach corpus data files present and versioned.
14. Legal/ToS for OSINT use (jurisdiction, consent, BSA chain claims).

## Catalog truth

| Claim | Correct form |
|-------|----------------|
| “532 tools work” | **False** unless each is installed, tested, and status=`ready` |
| “Executable collectors” | **~36** with `/tools` reporting `ready` or `not_installed` |
| “Actionable” | Has code path + inputs + returns result or structured `not_installed` |

## Privacy rules implemented

| Channel | Secrets | Identity PII |
|---------|---------|--------------|
| On-screen API `inputsDisplay` | Redacted | **Visible** (authorized operator) |
| Logs / print / evidence | Redacted | **Redacted** |

## Minimum production bar

- [x] `spine_smoke.py` green in CI  
- [x] Ledger chain OBSERVED → human VERIFIED → integrity in CI  
- [ ] Postgres required; full live stack integrity after sample mission  
- [ ] No shared key in repo; TLS termination  
- [ ] UI uses `inputsDisplay` only behind auth; never logs it  
- [ ] `/tools` shown to operators so “not_installed” is never sold as live  
