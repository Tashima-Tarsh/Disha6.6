# Getting started

## Web development

Use Node.js 22.x and npm. The app can start without PostgreSQL for local interface work; that mode does not provide a persistent production evidence ledger.

```bash
git clone https://github.com/Tashima-Tarsh/Disha6.6.git
cd Disha6.6
npm ci --prefix web
npm --prefix web run dev
```

Open `http://localhost:3000/login`. [`web/.env.example`](https://github.com/Tashima-Tarsh/Disha6.6/blob/main/web/.env.example) is a local configuration template; set your own development credentials if you copy it. Development authentication has local-only defaults in `web/lib/server/env.ts`; do not copy them into a deployed environment.

## Database-backed development

The SQL migrations need PostgreSQL 16 with **both pgvector and PostGIS** available. Set `DATABASE_URL` to an instance you control, then run:

```bash
npm --prefix web run db:migrate
npm --prefix web run db:verify-schema
```

The disposable GitHub CI database demonstrates a complete apply, verify, rollback and reapply cycle. The production Compose file builds the extensions image in `infra/postgres/Dockerfile`. The basic development Compose PostgreSQL image by itself may require PostGIS installation before these migrations run.

## Configuration

| Variable | When required | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | Durable deployment | PostgreSQL connection for migrations and persistent product data |
| `DISHA_AUTH_MODE` | Production | Configured auth path; `dev-jwt` is rejected in production |
| `DISHA_JWT_SECRET` | Production | Long secret for signed application sessions |
| `DISHA_OIDC_ISSUER`, `DISHA_OIDC_CLIENT_ID`, `DISHA_OIDC_CLIENT_SECRET` | Production with OIDC | Identity provider configuration |
| `DISHA_WORKER_TOKEN` | Production | Credential for internal scheduling and worker endpoints |
| `POSTGRES_PASSWORD` | Production Compose | PostgreSQL user password; use a URL-safe value in the Compose connection string |
| `DISHA_ALLOWED_ORIGINS`, `DISHA_PRODUCTION_URL` | Production Compose | Permitted origins and public application URL |
| `DISHA_BRAIN_API_TOKEN`, `DISHA_RESEARCH_RUNTIME_TOKEN` | Production Compose | Service-to-service authentication |
| `OPENAI_API_KEY` | Optional | Configured external model route; absence must not be presented as an active integration |

Production Compose lists the complete set of required and optional values. Store real secrets outside Git. The example below is illustrative, not an active deployment credential:

```env
DATABASE_URL=postgresql://disha:<password>@<host>:5432/disha
DISHA_AUTH_MODE=oidc
DISHA_JWT_SECRET=<generate-a-long-random-secret>
DISHA_WORKER_TOKEN=<generate-a-long-random-secret>
```

## Verification

```bash
npm --prefix web run lint
npm --prefix web run type-check
npm --prefix web test
npm --prefix web run build
npm run test:python
```

Python tests require the dependencies specified by the repository's Python package and the CI workflow. See [Operations](Operations) for production startup and troubleshooting.
