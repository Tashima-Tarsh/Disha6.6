import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseRoot = path.resolve(__dirname, "../database");

const migrations = [
  {
    version: "202607110001",
    name: "core_schema_v1",
    upPath: path.join(databaseRoot, "schema.sql"),
    downPath: path.join(databaseRoot, "rollbacks/202607110001_core_schema_v1.down.sql"),
  },
  {
    version: "202609150001",
    name: "ingestion_mission_durability",
    upPath: path.join(databaseRoot, "202609150001_ingestion_mission_durability.sql"),
    downPath: path.join(databaseRoot, "rollbacks/202609150001_ingestion_mission_durability.down.sql"),
  },
  {
    version: "202609180001",
    name: "dynamic_runtime",
    upPath: path.join(databaseRoot, "202609180001_dynamic_runtime.sql"),
    downPath: path.join(databaseRoot, "rollbacks/202609180001_dynamic_runtime.down.sql"),
  },
  {
    version: "202609180002",
    name: "intelligence_depth",
    upPath: path.join(databaseRoot, "202609180002_intelligence_depth.sql"),
    downPath: path.join(databaseRoot, "rollbacks/202609180002_intelligence_depth.down.sql"),
  },
  {
    version: "202609180003",
    name: "continuous_intelligence",
    upPath: path.join(databaseRoot, "202609180003_continuous_intelligence.sql"),
    downPath: path.join(databaseRoot, "rollbacks/202609180003_continuous_intelligence.down.sql"),
  },
  {
    version: "202609180004",
    name: "retrieval_workflows",
    upPath: path.join(databaseRoot, "202609180004_retrieval_workflows.sql"),
    downPath: path.join(databaseRoot, "rollbacks/202609180004_retrieval_workflows.down.sql"),
  },
  {
    version: "202609180005",
    name: "geospatial_runtime",
    upPath: path.join(databaseRoot, "202609180005_geospatial_runtime.sql"),
    downPath: path.join(databaseRoot, "rollbacks/202609180005_geospatial_runtime.down.sql"),
  },
  {
    version: "202609190001",
    name: "geospatial_rls",
    upPath: path.join(databaseRoot, "202609190001_geospatial_rls.sql"),
    downPath: path.join(databaseRoot, "rollbacks/202609190001_geospatial_rls.down.sql"),
  },
  {
    version: "202609190002",
    name: "continuous_osint",
    upPath: path.join(databaseRoot, "202609190002_continuous_osint.sql"),
    downPath: path.join(databaseRoot, "rollbacks/202609190002_continuous_osint.down.sql"),
  },
  {
    version: "202610030001",
    name: "astra6_tool_integration",
    upPath: path.join(databaseRoot, "202610030001_astra6_tool_integration.sql"),
    downPath: path.join(databaseRoot, "rollbacks/202610030001_astra6_tool_integration.down.sql"),
  },
  {
    version: "202610030002",
    name: "password_credentials",
    upPath: path.join(databaseRoot, "202610030002_password_credentials.sql"),
    downPath: path.join(databaseRoot, "rollbacks/202610030002_password_credentials.down.sql"),
  },
  {
    version: "202610030003",
    name: "canonical_evidence_os",
    upPath: path.join(databaseRoot, "202610030003_canonical_evidence_os.sql"),
    downPath: path.join(databaseRoot, "rollbacks/202610030003_canonical_evidence_os.down.sql"),
  },
  {
    version: "202610030004",
    name: "cyber_defense_attack_surface",
    upPath: path.join(databaseRoot, "202610030004_cyber_defense_attack_surface.sql"),
    downPath: path.join(databaseRoot, "rollbacks/202610030004_cyber_defense_attack_surface.down.sql"),
  },
];

const requiredTables = [
  "schema_migrations",
  "users",
  "password_credentials",
  "refresh_tokens",
  "audit_events",
  "evidence_events",
  "mission_results",
  "source_ingestion_runs",
  "source_records",
  "claim_provenance",
  "missions",
  "mission_analysis_snapshots",
  "mission_approvals",
  "model_call_audit",
  "extension_claim_records",
  "extension_memory_records",
  "source_refresh_policies",
  "runtime_configuration",
  "intelligence_entities",
  "intelligence_events",
  "intelligence_edges",
  "intelligence_event_entities",
  "dynamic_public_sources",
  "intelligence_entity_identifiers",
  "entity_resolution_decisions",
  "evidence_lineage_nodes",
  "evidence_lineage_edges",
  "intelligence_claims",
  "intelligence_hypotheses",
  "intelligence_state_snapshots",
  "intelligence_change_events",
  "analyst_review_queue",
  "analyst_review_actions",
  "intelligence_search_documents",
  "durable_work_items",
  "intelligence_activation_policies",
  "intelligence_activation_runs",
  "geospatial_import_jobs",
  "geospatial_datasets",
  "geospatial_features",
  "geospatial_feature_links",
  "continuous_osint_watches",
  "continuous_osint_runs",
  "astra6_tool_manifests",
  "astra6_connector_health",
  "astra6_connector_runs",
  "astra6_observations",
  "astra6_entities",
  "disha_canonical_observations",
  "disha_canonical_claims",
  "disha_constitutional_entities",
  "disha_constitutional_relationships",
  "disha_evidence_vault_artifacts",
  "disha_evidence_vault_diffs",
  "disha_state_transitions",
  "disha_canonical_contradictions",
  "disha_canonical_corroborations",
  "disha_attack_surface_assets",
  "disha_vulnerabilities_kev",
  "disha_threat_indicators",
  "disha_worker_jobs",
  "disha_worker_heartbeats",
];

const requiredIndexes = [
  "refresh_tokens_active_session_idx",
  "refresh_tokens_user_idx",
  "evidence_events_mission_chain_idx",
  "mission_results_user_updated_idx",
  "source_ingestion_runs_source_idx",
  "source_ingestion_runs_run_id_idx",
  "source_records_source_idx",
  "source_records_run_idx",
  "missions_user_updated_idx",
  "missions_status_idx",
  "mission_analysis_snapshots_mission_idx",
  "mission_approvals_mission_idx",
  "model_call_audit_mission_idx",
  "claim_provenance_source_idx",
  "extension_claim_records_mission_idx",
  "extension_claim_records_extension_idx",
  "extension_memory_records_mission_idx",
  "source_refresh_policies_due_idx",
  "runtime_configuration_updated_idx",
  "intelligence_entities_type_idx",
  "intelligence_events_time_idx",
  "intelligence_edges_from_idx",
  "intelligence_edges_to_idx",
  "intelligence_event_entities_entity_idx",
  "dynamic_public_sources_enabled_idx",
  "intelligence_entity_identifiers_lookup_idx",
  "entity_resolution_decisions_candidate_idx",
  "evidence_lineage_nodes_content_idx",
  "evidence_lineage_nodes_source_idx",
  "evidence_lineage_edges_child_idx",
  "evidence_lineage_edges_parent_idx",
  "intelligence_claims_subject_predicate_idx",
  "intelligence_claims_lineage_idx",
  "intelligence_hypotheses_subject_idx",
  "intelligence_state_snapshots_state_idx",
  "intelligence_state_snapshots_hash_idx",
  "intelligence_change_events_time_idx",
  "intelligence_change_events_materiality_idx",
  "intelligence_change_events_state_idx",
  "analyst_review_queue_status_idx",
  "analyst_review_queue_priority_idx",
  "analyst_review_queue_change_idx",
  "analyst_review_actions_review_idx",
  "intelligence_search_documents_tsv_idx",
  "intelligence_search_documents_vector_idx",
  "intelligence_search_documents_entity_ids_idx",
  "intelligence_search_documents_time_idx",
  "durable_work_items_dedupe_idx",
  "durable_work_items_lease_idx",
  "durable_work_items_expiry_idx",
  "intelligence_activation_runs_change_idx",
  "intelligence_activation_runs_time_idx",
  "geospatial_import_jobs_source_idx",
  "geospatial_datasets_source_idx",
  "geospatial_datasets_status_idx",
  "geospatial_features_geom_gix",
  "geospatial_features_geog_gix",
  "geospatial_features_centroid_gix",
  "geospatial_features_dataset_idx",
  "geospatial_features_lgd_idx",
  "geospatial_features_name_idx",
  "geospatial_feature_links_ref_idx",
  "continuous_osint_watches_dedupe_idx",
  "continuous_osint_watches_due_idx",
  "continuous_osint_watches_user_idx",
  "continuous_osint_runs_watch_idx",
  "continuous_osint_runs_changed_idx",
  "continuous_osint_runs_status_idx",
  "astra6_tool_manifests_enabled_idx",
  "astra6_connector_health_latest_idx",
  "astra6_connector_runs_tool_idx",
  "astra6_connector_runs_mission_idx",
  "astra6_connector_runs_user_idx",
  "astra6_connector_runs_status_idx",
  "astra6_observations_run_idx",
  "astra6_observations_entity_idx",
  "astra6_observations_tool_idx",
  "astra6_entities_canonical_idx",
  "astra6_entities_last_seen_idx",
  "disha_canonical_observations_source_idx",
  "disha_canonical_observations_hash_idx",
  "disha_canonical_claims_subject_predicate_idx",
  "disha_canonical_claims_review_idx",
  "disha_constitutional_entities_type_idx",
  "disha_constitutional_relationships_src_tgt_idx",
  "disha_evidence_vault_uri_version_idx",
  "disha_evidence_vault_diffs_uri_idx",
  "disha_state_transitions_target_idx",
  "disha_canonical_contradictions_conflict_type_idx",
  "disha_canonical_corroborations_claim_idx",
];

const requiredRlsTables = [
  "geospatial_import_jobs",
  "geospatial_datasets",
  "geospatial_features",
  "geospatial_feature_links",
  "continuous_osint_watches",
  "continuous_osint_runs",
  "astra6_tool_manifests",
  "astra6_connector_health",
  "astra6_connector_runs",
  "astra6_observations",
  "astra6_entities",
  "disha_canonical_observations",
  "disha_canonical_claims",
  "disha_constitutional_entities",
  "disha_constitutional_relationships",
  "disha_evidence_vault_artifacts",
  "disha_evidence_vault_diffs",
  "disha_state_transitions",
  "disha_canonical_contradictions",
  "disha_canonical_corroborations",
];

const mode = process.argv.includes("--verify-only") ? "verify" : process.argv.includes("--rollback") ? "rollback" : "migrate";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  logMigration({ status: "failure", mode, reason: "DATABASE_URL is required" });
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

try {
  logMigration({ status: "start", mode, migrationCount: migrations.length });
  if (mode === "migrate") await migrate();
  if (mode === "rollback") await rollbackLatest();
  if (mode !== "rollback") await verifySchema();
  logMigration({ status: "success", mode, migrationCount: migrations.length });
} catch (error) {
  logMigration({ status: "failure", mode, reason: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
} finally {
  await pool.end();
}

async function migrate() {
  await withMigrationClient(async (client) => {
    await ensureMigrationTable(client);
    const applied = await appliedVersions(client);
    for (const migration of migrations) {
      if (applied.has(migration.version)) continue;
      const sql = await fs.readFile(migration.upPath, "utf8");
      await client.query(sql);
      await client.query(
        `insert into schema_migrations (version, name, direction, checksum, applied_at)
         values ($1, $2, 'up', $3, now())`,
        [migration.version, migration.name, sha256(sql)],
      );
      logMigration({ status: "applied", mode: "migrate", version: migration.version, name: migration.name });
    }
  });
}

async function rollbackLatest() {
  if (process.env.DISHA_CONFIRM_ROLLBACK !== "I_UNDERSTAND_DATA_LOSS") {
    throw new Error("Rollback requires DISHA_CONFIRM_ROLLBACK=I_UNDERSTAND_DATA_LOSS");
  }

  await withMigrationClient(async (client) => {
    await ensureMigrationTable(client);
    const applied = await client.query(
      "select version from schema_migrations where direction = 'up' order by id desc limit 1",
    );
    const latest = applied.rows[0]?.version;
    if (!latest) throw new Error("No applied migration is available to roll back");
    const migration = migrations.find((item) => item.version === latest);
    if (!migration) throw new Error(`No rollback file registered for migration ${latest}`);

    const sql = await fs.readFile(migration.downPath, "utf8");
    await client.query(sql);
    await client.query(
      `insert into schema_migrations (version, name, direction, checksum, applied_at)
       values ($1, $2, 'down', $3, now())`,
      [migration.version, migration.name, sha256(sql)],
    );
    await client.query("delete from schema_migrations where version = $1 and direction = 'up'", [migration.version]);
    logMigration({ status: "rolled_back", mode: "rollback", version: migration.version, name: migration.name });
  });
}

async function verifySchema() {
  const tables = await pool.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_name = any($1::text[])`,
    [requiredTables],
  );
  const presentTables = new Set(tables.rows.map((row) => row.table_name));
  const missingTables = requiredTables.filter((table) => !presentTables.has(table));
  if (missingTables.length) throw new Error(`Missing required table(s): ${missingTables.join(", ")}`);

  const indexes = await pool.query(
    `select indexname from pg_indexes
     where schemaname = 'public' and indexname = any($1::text[])`,
    [requiredIndexes],
  );
  const presentIndexes = new Set(indexes.rows.map((row) => row.indexname));
  const missingIndexes = requiredIndexes.filter((index) => !presentIndexes.has(index));
  if (missingIndexes.length) throw new Error(`Missing required index(es): ${missingIndexes.join(", ")}`);

  const rls = await pool.query(
    `select c.relname
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = any($1::text[])
       and c.relrowsecurity = true`,
    [requiredRlsTables],
  );
  const protectedTables = new Set(rls.rows.map((row) => row.relname));
  const missingRls = requiredRlsTables.filter((table) => !protectedTables.has(table));
  if (missingRls.length) throw new Error(`RLS is not enabled on required table(s): ${missingRls.join(", ")}`);

  const applied = await pool.query(
    "select version from schema_migrations where direction = 'up'",
  );
  const appliedVersions = new Set(applied.rows.map((row) => row.version));
  const missingMigrations = migrations.filter((migration) => !appliedVersions.has(migration.version));
  if (missingMigrations.length) {
    throw new Error(`Missing applied migration(s): ${missingMigrations.map((migration) => migration.version).join(", ")}`);
  }
}

async function withMigrationClient(callback) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext('disha-schema-migrations'))");
    await callback(client);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureMigrationTable(client) {
  await client.query(`
    create table if not exists schema_migrations (
      id bigserial primary key,
      version text not null,
      name text not null,
      direction text not null check (direction in ('up', 'down')),
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);
  await client.query("create index if not exists schema_migrations_version_idx on schema_migrations (version, applied_at desc)");
}

async function appliedVersions(client) {
  const result = await client.query("select version from schema_migrations where direction = 'up'");
  return new Set(result.rows.map((row) => row.version));
}

function logMigration(fields) {
  console.info(JSON.stringify({
    type: "db_migration",
    ts: new Date().toISOString(),
    ...fields,
  }));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
