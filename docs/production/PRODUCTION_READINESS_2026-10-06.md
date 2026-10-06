# Production readiness audit — 2026-10-06

## Decision

The repository has one production web application: `web/`. Imported and legacy trees are not deployment roots.

## Remediated in this change

- Canonical post-login destination is `/investigate`.
- `/dashboard` no longer renders the old command surface; it redirects to `/investigate`.
- Legacy authentication code no longer hard-codes `/dashboard`.
- The repository root Dockerfile now builds the same Next.js application as `web/Dockerfile`.
- The obsolete `infra/Dockerfile.prod`, which referenced nonexistent root `frontend/` and `backend/` directories, is removed.
- Fast CI remains available as a full manual validation workflow while GitHub-hosted jobs are failing before any step starts.
- The OSINT worker release gate remains available by manual dispatch for deliberate container validation.
- Automatic PR/push triggers are disabled to prevent runner/account-level failures from generating repeated CI notifications.

## Current production blockers / follow-up controls

These are architecture controls, not cosmetic backlog:

- Protect `main` once a reliable runner is available. Do not require a check that the current GitHub-hosted runner cannot start.
- GCP/GCE is the canonical live hosting target. Verify `/opt/disha/DEPLOYED_COMMIT` matches the intended release before declaring a rollout complete.
- Disable or repair the repository Codespaces prebuild configuration separately if its independent failure notification is unwanted; it is not product CI.
- Run the full container smoke suite on the exact release commit.
- Exercise PostgreSQL backup and restore in the production environment.
- Add SLOs, external health monitoring, and alert routing.
- Keep production source parsers and dashboard-safe data feeds truthful: incomplete provider/parser coverage must remain partial/unconfigured rather than fabricated.
- Review governed extension/runtime dependencies and egress policy for the production environment.

## Deployment invariant

A production release is acceptable only when the deployed revision, runtime health, migrations, Redis, worker state, and post-login route all match the same release commit.
