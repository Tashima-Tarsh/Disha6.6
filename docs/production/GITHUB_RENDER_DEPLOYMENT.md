# disha6.6 production deployment

## Canonical application

The production application is the Next.js service under `web/`. The canonical authenticated landing route is `/investigate`. The historical `/dashboard` URL is compatibility-only and redirects to `/investigate`.

The repository root `Dockerfile` and `web/Dockerfile` both build the same `web/` application so a platform cannot silently deploy an unrelated legacy application merely because it builds from the repository root.

## CI and release policy

- Pull requests touching production code run Fast CI.
- OSINT worker container builds run only when worker packaging changes.
- These workflows do not run again on every merge to `main`, avoiding duplicate post-merge failure notifications.
- Release image publishing remains tag/manual driven through `.github/workflows/release.yml`.
- GitHub Codespaces prebuilds are separate from product CI. Disable or repair the repository Codespaces prebuild configuration separately if its notifications are not wanted.

## Render

Do not assume a Render service exists merely because this repository contains Render documentation. A Render deployment is production only when the target Render workspace contains a DISHA service wired to this repository and `main`, with the build/start commands and environment below verified in that workspace.

Recommended native Render commands:

Build:

```bash
cd web && npm ci && npm run build
```

Start:

```bash
./scripts/render-start-web.sh
```

The start wrapper applies database migrations before serving traffic and launches the durable worker used by the single-service Render topology.

## Required web environment variables

At minimum, verify these in the actual production platform:

- `DISHA_AUTH_MODE`
- `DISHA_JWT_SECRET`
- `DISHA_WORKER_TOKEN`
- `DATABASE_URL`
- `REDIS_URL`
- `DISHA_BRAIN_URL`
- `DISHA_BRAIN_API_TOKEN`
- `DISHA_RESEARCH_RUNTIME_URL`
- `DISHA_RESEARCH_RUNTIME_TOKEN`
- `DISHA_ALLOWED_ORIGINS`
- `NEXT_PUBLIC_APP_URL`

Password-mode deployments also require the approved password/account variables. OIDC deployments require the Meri Pehchaan client and redirect configuration.

Secrets belong in the deployment platform, never in git.

## Production acceptance

A deploy is not accepted merely because the home page responds. Verify all of the following against the deployed revision:

1. The deployed Git SHA equals the intended release commit.
2. `/` sends a valid authenticated session to `/investigate`.
3. `/dashboard` redirects to `/investigate`.
4. `/api/v1/health` is healthy.
5. Database migrations completed.
6. Redis-backed temporary investigation state is available.
7. Required worker classes are running.
8. The browser is not serving a previous static build from another service, branch, or CDN.
