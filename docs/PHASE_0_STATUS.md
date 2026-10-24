# Phase 0 Status — Constitutional Hardening

**Last updated**: 24 October 2026

## Completed and merged

- [x] CONSTITUTION.md (supreme document)
- [x] Full rearchitecture + uniqueness documentation
- [x] Canonical contracts package (`packages/contracts`)
- [x] `backend/auth.py` (fail-closed API key)
- [x] `backend/path_sandbox.py` (proper relative containment)
- [x] Brain path containment fixed (`relative_to`)
- [x] MCP authentication now fails closed + session isolation
- [x] OSINT proxy (`web/app/api/osint/scan/route.ts`) forwards auth and refuses to operate without key

## Remaining (documented in backend/SECURE_WIRING.md)

- [ ] Wire `Depends(require_api_key)` onto every sensitive route in `backend/app.py`
- [ ] Replace open CORS with explicit origins
- [ ] Apply path sandbox inside `/api/v1/data/load`
- [ ] Apply same auth pattern to other OSINT proxy routes (load, resolve, etc.)

## How to finish Phase 0

Follow the exact steps in `backend/SECURE_WIRING.md`.  
Once those four items are done, Phase 0 is complete and the system has no critical open trust boundaries.

## Next Phase

Phase 1 — Evidence Ledger v3 + Adapter Bus implementation.
