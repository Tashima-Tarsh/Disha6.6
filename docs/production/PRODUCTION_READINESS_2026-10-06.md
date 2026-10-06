# Production readiness audit — 2026-10-06

## Decision

The repository has one production web application: `web/`. Imported and legacy trees are not deployment roots.

## Remediated in this change

- Canonical post-login destination is `/investigate`.
- `/dashboard` no longer renders the old command surface; it redirects to `/investigate`.
- Legacy authentication code no longer hard-codes `/dashboard`.
- The repository root Dockerfile now builds the same Next.js application as `web/Dockerfile`.
- The obsolete `infra/Dockerfile.prod`, which referenced nonexistent root `frontend/` and `backend/` directories, is removed.
- Fast CI is restored for relevant non-draft pull requests only.
- The OSINT worker gate is restored for worker-packaging pull requests only.
- Neither gate runs a duplicate post-merge push workflow on `main`.

## Current production blockers / follow-up controls

These are architecture controls, not cosmetic backlog:

- Protect `main` and require the Fast CI check before merge. At audit time the branch had no required status checks.
- Verify the actual hosting account/service. Repository documentation alone is not proof that Render, Cloud Run, or another provider is serving the latest `main` commit.
- Disable or repair the repository Codespaces prebuild configuration separately if its independent failure notification is unwanted; it is not product CI.
- Run the full container smoke suite on the exact release commit.
- Exercise PostgreSQL backup and restore in the production environment.
- Add SLOs, external health monitoring, and alert routing.
- Keep production source parsers and dashboard-safe data feeds truthful: incomplete provider/parser coverage must remain partial/unconfigured rather than fabricated.
- Review governed extension/runtime dependencies and egress policy for the production environment.

## Deployment invariant

A production release is acceptable only when the deployed revision, runtime health, migrations, Redis, worker state, and post-login route all match the same release commit.
