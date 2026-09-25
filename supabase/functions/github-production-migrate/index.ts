import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.2.12";
import postgres from "npm:postgres@3.4.9";

const AUDIENCE = "disha-supabase-production";
const ISSUER = "https://token.actions.githubusercontent.com";
const REPOSITORY = "Tashima-Tarsh/Disha6.6";
const REPOSITORY_ID = "1205353755";
const REF = "refs/heads/main";
const WORKFLOW_REF = "Tashima-Tarsh/Disha6.6/.github/workflows/db-migrations.yml@refs/heads/main";
const MAX_MIGRATIONS = 32;
const MAX_SQL_BYTES = 2_000_000;
const githubKeys = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

type MigrationInput = { version: string; name: string; checksum: string; sql: string };
type MigrationRequest = {
  action: "apply_and_verify";
  migrations: MigrationInput[];
  requiredTables: string[];
  requiredIndexes: string[];
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function authorize(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("missing_oidc_token");
  const { payload } = await jwtVerify(token, githubKeys, { issuer: ISSUER, audience: AUDIENCE });
  if (payload.repository !== REPOSITORY) throw new Error("repository_not_allowed");
  if (String(payload.repository_id ?? "") !== REPOSITORY_ID) throw new Error("repository_id_not_allowed");
  if (payload.ref !== REF) throw new Error("ref_not_allowed");
  if (payload.workflow_ref !== WORKFLOW_REF) throw new Error("workflow_not_allowed");
  if (payload.event_name !== "push" && payload.event_name !== "workflow_dispatch") throw new Error("event_not_allowed");
  return {
    runId: String(payload.run_id ?? ""),
    runNumber: String(payload.run_number ?? ""),
    actor: String(payload.actor ?? ""),
    workflowSha: String(payload.workflow_sha ?? ""),
  };
}

function validateRequest(value: unknown): MigrationRequest {
  if (!value || typeof value !== "object") throw new Error("invalid_body");
  const body = value as Partial<MigrationRequest>;
  if (body.action !== "apply_and_verify") throw new Error("invalid_action");
  if (!Array.isArray(body.migrations) || body.migrations.length > MAX_MIGRATIONS) throw new Error("invalid_migrations");
  if (!Array.isArray(body.requiredTables) || !Array.isArray(body.requiredIndexes)) throw new Error("invalid_verification_contract");

  for (const migration of body.migrations) {
    if (!migration || typeof migration !== "object") throw new Error("invalid_migration");
    if (!/^\d{12,20}$/.test(String(migration.version))) throw new Error("invalid_migration_version");
    if (!/^[a-z0-9_\-]{1,120}$/i.test(String(migration.name))) throw new Error("invalid_migration_name");
    if (!/^[a-f0-9]{64}$/i.test(String(migration.checksum))) throw new Error("invalid_migration_checksum");
    if (typeof migration.sql !== "string" || new TextEncoder().encode(migration.sql).byteLength > MAX_SQL_BYTES) {
      throw new Error("invalid_migration_sql");
    }
  }

  const requiredTables = body.requiredTables.map(String).filter((item) => /^[a-z0-9_]{1,120}$/i.test(item));
  const requiredIndexes = body.requiredIndexes.map(String).filter((item) => /^[a-z0-9_]{1,120}$/i.test(item));
  if (requiredTables.length !== body.requiredTables.length || requiredIndexes.length !== body.requiredIndexes.length) {
    throw new Error("invalid_verification_identifier");
  }
  return { action: "apply_and_verify", migrations: body.migrations as MigrationInput[], requiredTables, requiredIndexes };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const identity = await authorize(req);
    const request = validateRequest(await req.json());
    const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!databaseUrl) return json({ error: "supabase_db_url_unavailable" }, 500);
    const sql = postgres(databaseUrl, { prepare: false, max: 1, idle_timeout: 5 });
    try {
      const outcome = await sql.begin(async (tx) => {
        await tx.unsafe(`
          create table if not exists public.schema_migrations (
            id bigserial primary key,
            version text not null,
            name text not null,
            direction text not null check (direction in ('up', 'down')),
            checksum text not null,
            applied_at timestamptz not null default now()
          );
          create index if not exists schema_migrations_version_idx
            on public.schema_migrations (version, applied_at desc);
        `);
        await tx`select pg_advisory_xact_lock(hashtext('disha-schema-migrations'))`;
        const appliedRows = await tx`select version, name, checksum from public.schema_migrations where direction = 'up'`;
        const applied = new Map(appliedRows.map((row) => [
          String(row.version),
          { name: String(row.name), checksum: String(row.checksum) },
        ]));
        const appliedNow: string[] = [];
        const alreadyApplied: string[] = [];
        const legacyChecksums: MigrationInput[] = [];

        for (const migration of request.migrations) {
          const existing = applied.get(migration.version);
          if (existing) {
            if (existing.checksum === migration.checksum) {
              alreadyApplied.push(migration.version);
              continue;
            }
            const legacyMarker = `supabase-managed:${migration.name}`;
            if (existing.name === migration.name && existing.checksum === legacyMarker) {
              legacyChecksums.push(migration);
              alreadyApplied.push(migration.version);
              continue;
            }
            throw new Error(`checksum_mismatch:${migration.version}`);
          }
          await tx.unsafe(migration.sql);
          await tx`
            insert into public.schema_migrations (version, name, direction, checksum, applied_at)
            values (${migration.version}, ${migration.name}, 'up', ${migration.checksum}, now())
          `;
          applied.set(migration.version, { name: migration.name, checksum: migration.checksum });
          appliedNow.push(migration.version);
        }

        const tableRows = await tx`select table_name from information_schema.tables where table_schema = 'public'`;
        const indexRows = await tx`select indexname from pg_indexes where schemaname = 'public'`;
        const tables = new Set(tableRows.map((row) => String(row.table_name)));
        const indexes = new Set(indexRows.map((row) => String(row.indexname)));
        const missingTables = request.requiredTables.filter((name) => !tables.has(name));
        const missingIndexes = request.requiredIndexes.filter((name) => !indexes.has(name));
        const missingMigrations = request.migrations.map((migration) => migration.version).filter((version) => !applied.has(version));
        if (missingTables.length || missingIndexes.length || missingMigrations.length) {
          throw new Error(JSON.stringify({ code: "verification_failed", missingTables, missingIndexes, missingMigrations }));
        }

        const reconciledLegacy: string[] = [];
        for (const migration of legacyChecksums) {
          const legacyMarker = `supabase-managed:${migration.name}`;
          const updated = await tx`
            update public.schema_migrations
            set checksum = ${migration.checksum}
            where version = ${migration.version}
              and name = ${migration.name}
              and direction = 'up'
              and checksum = ${legacyMarker}
            returning version
          `;
          if (updated.length !== 1) throw new Error(`legacy_checksum_reconciliation_failed:${migration.version}`);
          reconciledLegacy.push(migration.version);
          applied.set(migration.version, { name: migration.name, checksum: migration.checksum });
        }

        return { appliedNow, alreadyApplied, reconciledLegacy };
      });
      return json({ ok: true, identity, ...outcome, verifiedAt: new Date().toISOString() });
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ type: "github_production_migration", status: "failure", reason }));
    return json({ ok: false, error: reason }, reason.includes("not_allowed") || reason.includes("oidc") ? 403 : 400);
  }
});
