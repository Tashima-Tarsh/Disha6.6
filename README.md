# DISHA 6.6

Evidence-first local intelligence and OSINT workbench for Windows.

This checkout is configured for a local Docker runtime on the `D:` drive. It must not claim that a tool, dataset, cloud service, or investigation source is working until the current machine has verified it.

## Local Targets

| Surface | Address | Rule |
| :--- | :--- | :--- |
| Dashboard | `http://127.0.0.1:3000` | Localhost only |
| Brain API | `http://127.0.0.1:8000` | Localhost only, full profile |
| Postgres | `127.0.0.1:5432` | Localhost only |
| Redis | `127.0.0.1:6379` | Localhost only |

## What Is Real In This Checkout

- The application source is present under `web/`, `src/`, and `disha/brain/`.
- The OSINT registry is present under `data/osint/`.
- Docker Desktop is expected at `D:\OSINT-UPSTREAM\containers\DockerDesktop`.
- Docker data is expected to stay under the existing Docker Desktop D-drive data root.
- GCP deployment material has been removed from the active local setup.
- Demo JSON payloads have been removed from the active tree.

Any upstream marked `EXECUTABLE_VERIFIED` still needs a fresh local smoke test before it should be treated as working on this machine. If the executable is not found, the truthful status is `UNCONFIGURED`.

## Start Locally

Run from PowerShell:

```powershell
cd D:\Disha6.6
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1 -Rebuild
```

For the optional full profile, including the Brain API on `127.0.0.1:8000`:

```powershell
cd D:\Disha6.6
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1 -Full -Rebuild
```

The start script creates `.env` if missing, seeds a local password-auth account, and prints the generated password.

Default local account:

```text
Email: admin@local.disha
Password: printed by scripts/start-local.ps1 and stored in .env as DISHA_USER_PASSWORD
```

## Verify Truth

```powershell
cd D:\Disha6.6
powershell -ExecutionPolicy Bypass -File .\scripts\verify-local.ps1
```

Full profile verification:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-local.ps1 -Full
```

Generate the OSINT report:

```powershell
npm run osint:report
```

The report now separates catalog claims from local smoke proof. A repository being present in `data/osint/upstream-registry.json` is not the same as being executable.

## Repository Boundaries

| Area | Purpose |
| :--- | :--- |
| `web/` | Next.js dashboard and API gateway |
| `disha/brain/` | FastAPI brain service |
| `src/` | TypeScript CLI/runtime rules |
| `data/osint/` | OSINT catalog, lock, and runtime status files |
| `scripts/osint/` | Discovery, smoke, report, and catalog tooling |
| `tests/`, `web/tests/` | Verification suites; keep these because they prove behavior |

## Accuracy Rule

Use these labels honestly:

- `LOCAL_SMOKE_PASS`: executable or service was tested successfully on this machine.
- `UNCONFIGURED`: executable, credential, or local service is missing.
- `CREDENTIAL_REQUIRED`: external account/API key is required.
- `REFERENCE_ONLY`: dataset, GUI, library, or upstream reference that is not a local executable.
- `[VERIFY REQUIRED]`: claim exists in repository material but has not been proven in the current local run.

No fake operational data. No synthetic "working" status. No cloud-production claim unless a live deployment is independently verified.
