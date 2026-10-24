# Backend Security Wiring

## Quick apply (recommended)

From the repository root:

```bash
python scripts/apply_backend_security.py
```

This rewrites `backend/app.py` in place to:

1. **Fail-closed authentication** on sensitive routes
2. **Restricted CORS** via `apply_security(app)`
3. **Path sandbox** on `/api/v1/data/load`
4. Remove "Zero API key required" claim

## Protected routes

- `POST /scan`
- `POST /api/v1/data/load`
- `POST /api/v1/resolve`
- `GET /api/v1/graph/stats`
- `GET /api/v1/vyuh/formations`
- `POST /api/v1/vyuh/activate`

## Environment

```bash
export DISHA_OSINT_API_KEY="$(openssl rand -hex 32)"
export DISHA_ALLOWED_ORIGINS="http://localhost:3000"
export DISHA_DATA_ROOT="/absolute/path/to/allowed/data"  # optional
```

Without `DISHA_OSINT_API_KEY`, sensitive routes return **503**.

## Dependencies

Requires `backend/secure_bootstrap.py` (already on main).
