# DISHA Database Migration Runbook

DISHA production uses PostgreSQL as the durable store for evidence events, missions, source ingestion runs, claim provenance, and governed extension claims.

## Local migration

Start Postgres, then run:

```bash
DATABASE_URL=postgresql://disha:postgres@localhost:5432/disha npm --prefix web run db:migrate
DATABASE_URL=postgresql://disha:postgres@localhost:5432/disha npm --prefix web run db:verify-schema
```

The migration command writes structured JSON logs with `type=db_migration`, status, mode, timestamp, and migration version when applicable.

## CI migration check

`.github/workflows/db-migrations.yml` uses a disposable PostgreSQL 16 instance with pgvector and PostGIS to apply, verify, roll back, reapply and verify the schema. The production Compose contract job validates the Compose configuration and builds the PostgreSQL extensions image. CI does not connect to a production database.

## Production Compose behavior

`docker-compose.prod.yml` builds the database from `infra/postgres/Dockerfile` and persists it in the `postgres_data` volume. The one-shot `web-migrate` service runs the repository migrations. The `web` service waits on:

```yaml
web-migrate:
  condition: service_completed_successfully
```

This prevents the web runtime from starting against an unmigrated database. Set a URL-safe `POSTGRES_PASSWORD` and the other required production environment values, then run `docker compose -f docker-compose.prod.yml up --build -d`. Back up the database volume off host before upgrades; a Git repository does not provide durable database storage.

## Versioning model

Applied migrations are recorded in `schema_migrations` with:

- `version`
- `name`
- `direction`
- `checksum`
- `applied_at`

The current baseline migration is `202607110001_core_schema_v1`.

## Rollback

Rollback is intentionally guarded because the current baseline rollback drops application tables.

Before production rollback:

1. Take a managed Postgres snapshot or logical backup.
2. Stop web traffic or put the service in maintenance mode.
3. Confirm the target release is compatible with the rolled-back schema.
4. Run:

```bash
DISHA_CONFIRM_ROLLBACK=I_UNDERSTAND_DATA_LOSS \
DATABASE_URL=postgresql://disha:postgres@localhost:5432/disha \
npm --prefix web run db:rollback
```

5. Verify the database and application release together.

CI rehearses rollback on an empty disposable Postgres database. This proves the rollback script is syntactically valid and can reverse/re-apply the current migration sequence. It does not replace a production backup restore drill.

Future migrations should prefer additive changes and narrow rollback SQL so rollbacks do not require dropping the baseline schema.
