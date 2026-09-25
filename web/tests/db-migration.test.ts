import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");
const webRoot = path.resolve(__dirname, "..");

describe("DISHA database migration contract", () => {
  it("keeps the migration runner valid JavaScript", () => {
    expect(() => execFileSync(process.execPath, ["--check", path.join(webRoot, "scripts/apply-schema.mjs")])).not.toThrow();
    expect(() => execFileSync(process.execPath, ["--check", path.join(webRoot, "scripts/supabase-compatibility.mjs")])).not.toThrow();
    expect(() => execFileSync(process.execPath, ["--check", path.join(webRoot, "scripts/github-oidc-production-migrate.mjs")])).not.toThrow();
  });

  it("keeps the production schema aligned with evidence, mission, and extension persistence", () => {
    const schema = fs.readFileSync(path.join(webRoot, "database/schema.sql"), "utf8");

    expect(schema).toContain("create table if not exists schema_migrations");
    expect(schema).toContain("create table if not exists evidence_events");
    expect(schema).toContain("create table if not exists mission_results");
    expect(schema).toContain("create table if not exists claim_provenance");
    expect(schema).toContain("create table if not exists extension_claim_records");
    expect(schema).toContain("create table if not exists extension_memory_records");
    expect(schema).toContain("analysis_event_id text not null references evidence_events(event_id)");
    expect(schema).toContain("policy_event_id text not null references evidence_events(event_id)");
    expect(schema).toContain("create index if not exists extension_claim_records_mission_idx");
    expect(schema).toContain("create index if not exists extension_memory_records_mission_idx");
  });

  it("adds durable source records, mission lifecycle, approvals, snapshots, and model-call audit", () => {
    const migration = fs.readFileSync(path.join(webRoot, "database/202609150001_ingestion_mission_durability.sql"), "utf8");

    expect(migration).toContain("create table if not exists source_records");
    expect(migration).toContain("create table if not exists missions");
    expect(migration).toContain("create table if not exists mission_analysis_snapshots");
    expect(migration).toContain("create table if not exists mission_approvals");
    expect(migration).toContain("create table if not exists model_call_audit");
    expect(migration).toContain("source_record_hash text not null");
    expect(migration).toContain("snapshot_hash text not null");
  });

  it("keeps rollback files for registered migrations and selects the latest applied migration deterministically", () => {
    const migrationScript = fs.readFileSync(path.join(webRoot, "scripts/apply-schema.mjs"), "utf8");
    const coreRollback = fs.readFileSync(path.join(webRoot, "database/rollbacks/202607110001_core_schema_v1.down.sql"), "utf8");
    const durabilityRollback = fs.readFileSync(path.join(webRoot, "database/rollbacks/202609150001_ingestion_mission_durability.down.sql"), "utf8");

    expect(migrationScript).toContain('version: "202607110001"');
    expect(migrationScript).toContain('version: "202609150001"');
    expect(migrationScript).toContain("downPath");
    expect(migrationScript).toContain("DISHA_CONFIRM_ROLLBACK");
    expect(migrationScript).toContain("order by id desc limit 1");
    expect(coreRollback).toContain("drop table if exists extension_claim_records cascade");
    expect(coreRollback).toContain("drop table if exists evidence_events cascade");
    expect(durabilityRollback).toContain("drop table if exists model_call_audit cascade");
    expect(durabilityRollback).toContain("drop table if exists source_records cascade");
  });

  it("adds pgvector hybrid retrieval, durable work leasing, and change-driven activation persistence", () => {
    const migration = fs.readFileSync(path.join(webRoot, "database/202609180004_retrieval_workflows.sql"), "utf8");
    expect(migration).toContain("create extension if not exists vector with schema extensions");
    expect(migration).toContain("embedding extensions.vector(384)");
    expect(migration).toContain("create table if not exists intelligence_search_documents");
    expect(migration).toContain("using hnsw (embedding extensions.vector_cosine_ops)");
    expect(migration).toContain("create table if not exists durable_work_items");
    expect(migration).toContain("create table if not exists intelligence_activation_policies");
    expect(migration).toContain("create table if not exists intelligence_activation_runs");
  });

  it("adds PostGIS dataset provenance, admitted features, links, and spatial indexes", () => {
    const migration = fs.readFileSync(path.join(webRoot, "database/202609180005_geospatial_runtime.sql"), "utf8");
    expect(migration).toContain("create extension if not exists postgis");
    expect(migration).toContain("create table if not exists geospatial_import_jobs");
    expect(migration).toContain("create table if not exists geospatial_datasets");
    expect(migration).toContain("create table if not exists geospatial_features");
    expect(migration).toContain("geospatial_features_geom_gix");
    expect(migration).toContain("geospatial_features_geog_gix");
    expect(migration).toContain("lgd_mapping_coverage");
  });

  it("locks geospatial tables behind RLS and removes Data API role grants", () => {
    const migration = fs.readFileSync(path.join(webRoot, "database/202609190001_geospatial_rls.sql"), "utf8");
    const runner = fs.readFileSync(path.join(webRoot, "scripts/apply-schema.mjs"), "utf8");
    expect(migration).toContain("geospatial_import_jobs enable row level security");
    expect(migration).toContain("geospatial_datasets enable row level security");
    expect(migration).toContain("geospatial_features enable row level security");
    expect(migration).toContain("geospatial_feature_links enable row level security");
    expect(migration).toContain("from anon");
    expect(migration).toContain("from authenticated");
    expect(runner).toContain("requiredRlsTables");
    expect(runner).toContain("RLS is not enabled on required table(s)");
  });

  it("adds durable continuous OSINT watches, runs, indexes, and RLS", () => {
    const migration = fs.readFileSync(path.join(webRoot, "database/202609190002_continuous_osint.sql"), "utf8");
    const runner = fs.readFileSync(path.join(webRoot, "scripts/apply-schema.mjs"), "utf8");
    const oidc = fs.readFileSync(path.join(webRoot, "scripts/github-oidc-production-migrate.mjs"), "utf8");
    expect(migration).toContain("create table if not exists continuous_osint_watches");
    expect(migration).toContain("create table if not exists continuous_osint_runs");
    expect(migration).toContain("continuous_osint_watches_due_idx");
    expect(migration).toContain("continuous_osint_runs_changed_idx");
    expect(migration).toContain("continuous_osint_watches enable row level security");
    expect(migration).toContain("continuous_osint_runs enable row level security");
    expect(migration).toContain("from anon");
    expect(migration).toContain("from authenticated");
    expect(runner).toContain('"202609190002"');
    expect(runner).toContain('"continuous_osint_watches"');
    expect(runner).toContain('"continuous_osint_runs"');
    expect(oidc).toContain('"202609190002"');
  });

  it("exposes explicit migration commands from the web package", () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(webRoot, "package.json"), "utf8"));

    expect(packageJson.scripts["db:migrate"]).toBe("node scripts/apply-schema.mjs");
    expect(packageJson.scripts["db:verify-schema"]).toBe("node scripts/apply-schema.mjs --verify-only");
    expect(packageJson.scripts["db:rollback"]).toBe("node scripts/apply-schema.mjs --rollback");
    expect(packageJson.scripts["db:supabase-bootstrap"]).toBe("node scripts/supabase-compatibility.mjs");
    expect(packageJson.scripts["db:supabase-verify"]).toBe("node scripts/supabase-compatibility.mjs --verify-only");
    expect(packageJson.scripts["db:production-oidc"]).toBe("node scripts/github-oidc-production-migrate.mjs");
    expect(packageJson.scripts["geo:import"]).toBe("node scripts/geospatial/import-authoritative-geojson.mjs");
    expect(packageJson.scripts.start).toBe("node scripts/start-production.mjs");
    const supabaseBootstrap = fs.readFileSync(path.join(webRoot, "database/providers/supabase.sql"), "utf8");
    expect(supabaseBootstrap).toContain("create extension if not exists vector with schema extensions");
    expect(supabaseBootstrap).toContain("create extension if not exists postgis with schema extensions");
    const supabaseVerifier = fs.readFileSync(path.join(webRoot, "scripts/supabase-compatibility.mjs"), "utf8");
    expect(supabaseVerifier).toContain("supabase_extension_inventory");
  });

  it("binds production migration OIDC to the current Disha6.6 repository identity", () => {
    const functionSource = fs.readFileSync(
      path.join(repoRoot, "supabase/functions/github-production-migrate/index.ts"),
      "utf8",
    );

    expect(functionSource).toContain('const REPOSITORY = "Tashima-Tarsh/Disha6.6"');
    expect(functionSource).toContain(
      'const WORKFLOW_REF = "Tashima-Tarsh/Disha6.6/.github/workflows/db-migrations.yml@refs/heads/main"',
    );
    expect(functionSource).toContain('const REPOSITORY_ID = "1205353755"');
  });

  it("runs database migration before the web service in compose deployments", () => {
    const compose = fs.readFileSync(path.join(repoRoot, "docker-compose.yml"), "utf8");
    const prodCompose = fs.readFileSync(path.join(repoRoot, "docker-compose.prod.yml"), "utf8");

    for (const file of [compose, prodCompose]) {
      expect(file).toContain("web-migrate:");
      expect(file).toContain('command: ["node", "scripts/apply-schema.mjs"]');
      expect(file).toContain("condition: service_completed_successfully");
    }
  });

  it("runs migration rehearsal and approved production migration in GitHub Actions", () => {
    const workflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/db-migrations.yml"), "utf8");

    expect(workflow).toContain("pgvector/pgvector:pg16");
    expect(workflow).toContain("Install PostGIS in pgvector rehearsal container");
    expect(workflow).toContain("postgresql-16-postgis-3");
    expect(workflow).toContain("npm run db:migrate");
    expect(workflow).toContain("npm run db:verify-schema");
    expect(workflow).toContain("npm run db:rollback");
    expect(workflow).not.toContain("environment:\n      name: production");
    expect(workflow).not.toContain("PRODUCTION_DATABASE_URL");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("npm run db:production-oidc");
    expect(workflow).toContain("github-production-migrate-v3");
    expect(workflow).not.toContain("RUN_PRODUCTION_MIGRATIONS");
    expect(workflow).toContain("(github.event_name == 'push' && github.ref == 'refs/heads/main')");
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("Supabase Postgres 17 + PostGIS compatibility");
    expect(workflow).toContain("supabase/setup-cli@v3");
    expect(workflow).toContain("version: 2.117.0");
    expect(workflow).toContain("supabase db start");
    expect(workflow).toContain("SUPABASE_WORKDIR");
    expect(workflow).toContain('cd "$RUNNER_TEMP" && supabase db start');
    expect(workflow).toContain("npm run db:supabase-bootstrap");
    expect(workflow).toContain("npm run db:supabase-verify");

    const supabaseConfig = fs.readFileSync(path.join(repoRoot, "supabase/config.toml"), "utf8");
    expect(supabaseConfig).toContain('project_id = "disha"');
    expect(supabaseConfig).toContain("major_version = 17");
  });
});
