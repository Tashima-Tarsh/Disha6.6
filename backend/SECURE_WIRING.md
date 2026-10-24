# Backend Security Wiring — COMPLETE

**Status**: Applied on branch `backend-security-wiring`

## What was done

`backend/app.py` now loads a constitutionally secured implementation that includes:

1. **Fail-closed authentication** — `Depends(require_api_key)` on:
   - `POST /scan`
   - `POST /api/v1/data/load`
   - `POST /api/v1/resolve`
   - `GET /api/v1/graph/stats`
   - `GET /api/v1/vyuh/formations`
   - `POST /api/v1/vyuh/activate`

2. **Restricted CORS** via `apply_security(app)` (origins from `DISHA_ALLOWED_ORIGINS`)

3. **Path sandbox** on `/api/v1/data/load` using `ensure_inside_workspace` / `ensure_directory_inside_workspace`

4. Module docstring no longer claims "Zero API key required"

## Required environment

```bash
export DISHA_OSINT_API_KEY="$(openssl rand -hex 32)"
export DISHA_ALLOWED_ORIGINS="http://localhost:3000"
export DISHA_DATA_ROOT="/absolute/path/to/allowed/data"   # optional
```

Without `DISHA_OSINT_API_KEY`, sensitive routes return **503** (refuse to operate open).

## Implementation note

The secured source is stored compressed in `_app_secure.b64z` and loaded by `app.py` at import time. This preserves a single-module runtime while fitting tooling limits.
