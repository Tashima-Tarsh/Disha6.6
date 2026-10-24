# Phase 0 Security Changes

**Branch**: `phase-0-security-hardening`  
**Governing documents**: CONSTITUTION.md, docs/SECURITY_HARDENING_PLAN.md

---

## Changes in this commit

### 1. New authentication module — `backend/auth.py`
- Mandatory Bearer token (`DISHA_OSINT_API_KEY` or `OSINT_API_KEY`)
- Fail closed: if the key is not configured, sensitive endpoints refuse to operate
- No optional open mode

### 2. New path sandbox — `backend/path_sandbox.py`
- Uses `Path.resolve()` + `relative_to()` (never string prefix)
- Configurable via `DISHA_DATA_ROOT`
- Raises `PermissionError` on any escape attempt

### 3. Canonical contracts package — `packages/contracts/`
- `VerificationState`
- `EvidenceEvent` (hash-chained)
- `Adapter` / `AdapterResult`
- `PolicyDecision`
- `MissionState`

These contracts are now the rigid spine of the system.

---

## Required environment variables (after merge)

```bash
export DISHA_OSINT_API_KEY="your-strong-random-key"
export DISHA_DATA_ROOT="/absolute/path/to/allowed/data"   # optional, defaults to backend/data
```

---

## Remaining Phase 0 work (next commits)

- [ ] Wire `require_api_key` into every sensitive route in `backend/app.py`
- [ ] Replace open CORS with explicit origins
- [ ] Apply path sandbox to `/api/v1/data/load`
- [ ] Force authentication on `web/app/api/osint/*` proxies
- [ ] Make MCP authentication fail-closed
- [ ] Fix Brain path containment to use the same relative check

---

## Constitutional compliance

This commit advances Articles V (Trust Boundaries) and VII (Uniqueness Mandate).
