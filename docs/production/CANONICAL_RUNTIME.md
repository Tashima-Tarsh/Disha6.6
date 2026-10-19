# DISHA 6.6 — Canonical Local Runtime

DISHA 6.6 is currently maintained in this checkout as a local Windows and Docker runtime. Cloud-production claims from older material are not authoritative for this machine.

## Local Baseline

- Dashboard: `http://127.0.0.1:3000`
- Brain API: `http://127.0.0.1:8000`
- Postgres: `127.0.0.1:5432`
- Redis: `127.0.0.1:6379`
- Runtime storage target: `D:` drive

## Truth Rule

The OSINT registry is a catalog until a local smoke test proves execution. Reports must distinguish:

- cataloged upstream
- installed executable
- service reachable
- credential required
- local smoke pass
- unconfigured

Any claim not proven in the current local environment remains `[VERIFY REQUIRED]`.

## Active Runtime Components

- `web/`: Next.js dashboard and API routes.
- `disha/brain/`: FastAPI brain service.
- `data/osint/`: OSINT catalog and runtime status files.
- `scripts/osint/`: discovery, smoke, and reporting scripts.
- `docker-compose.yml`: local Docker orchestration.

## Verification

Use:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-local.ps1
```

Use the full profile only when optional services are needed:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-local.ps1 -Full
```
