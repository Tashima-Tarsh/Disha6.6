# DISHA 6.6 — Google Cloud Platform production

GCP is the canonical production target for DISHA 6.6.

## Canonical topology

The production runbook targets a Google Compute Engine host in `asia-south1` and runs the repository's Docker stack on that host:

- Caddy reverse proxy
- Next.js 16 application from `web/`
- PostgreSQL 16 + PostGIS + pgvector
- Redis
- multilingual embeddings service
- DISHA Brain
- durable dynamic worker
- ASTRA identity worker
- ASTRA infrastructure worker

The canonical authenticated landing route is `/investigate`. The historical `/dashboard` route exists only as a compatibility redirect to `/investigate`.

## Deploy

For a configured GCE host:

```bash
bash infra/gcp/deploy-remote.sh
```

The deployment script requires the production `.env`, records the exact Git SHA in `DEPLOYED_COMMIT`, builds the GCP compose stack, applies migrations, starts the services, installs the systemd restart contract, and fails if the web health endpoint never becomes ready.

For host bootstrap after an authenticated checkout has already been provisioned at `/opt/disha`:

```bash
bash infra/gcp/setup-gce.sh
```

The VM startup path requires the private repository to already exist at `/opt/disha`, preserves the existing `.env` across reboots, and restores the checked-out revision. It deliberately does not pull a newer Git revision automatically.

## Update production code

To move production to a new release:

```bash
cd /opt/disha
git fetch origin
git checkout main
git pull --ff-only origin main
git rev-parse HEAD
bash infra/gcp/deploy-remote.sh
cat DEPLOYED_COMMIT
```

The SHA printed before deployment and the value in `DEPLOYED_COMMIT` must match.

## Acceptance checks

```bash
curl -fsS http://127.0.0.1:3000/api/v1/health  # JSON includes the deployed revision
docker compose -f docker-compose.gcp.yml ps
cat DEPLOYED_COMMIT
```

Then verify externally:

- valid authenticated sessions land on `/investigate`,
- `/dashboard` redirects to `/investigate`,
- the deployed Git SHA is the intended release,
- PostgreSQL, Redis, Brain, embeddings, and required workers are healthy.

## Infrastructure alternatives

Cloud Run and Terraform assets remain GCP infrastructure alternatives. They are not the canonical live GCE deployment runbook and must not be used to infer what revision the live service is serving.
