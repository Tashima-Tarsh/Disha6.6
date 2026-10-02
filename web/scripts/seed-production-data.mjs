import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to seed production data.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: "-c search_path=public,extensions",
});

function sha256(content) {
  return crypto.createHash("sha256").update(typeof content === "string" ? content : JSON.stringify(content)).digest("hex");
}

function canonicalJson(value) {
  return JSON.stringify(sortValue(value)) ?? "null";
}

function hashValue(value) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, sortValue(entry)])
    );
  }
  return value;
}

function makeSeededEvent({ eventId, missionId, chainIndex, timestamp, actor, action, input, previousHash }) {
  const inputHash = hashValue(input);
  const payload = {
    eventId,
    missionId,
    chainIndex,
    timestamp,
    actor,
    action,
    inputHash,
    outputHash: undefined,
    policyDecision: undefined,
    lensResults: undefined,
    parentEventId: undefined,
    previousHash,
    hashAlgorithm: "sha256",
    ledgerVersion: 2,
  };
  const payloadHash = hashValue(payload);
  const eventHash = hashValue(`${payloadHash}:${previousHash ?? "GENESIS"}`);
  return { ...payload, payloadHash, eventHash };
}

async function run() {
  const client = await pool.connect();
  console.info("Connected to PostgreSQL for DISHA production data provisioning...");

  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext('disha-master-seed'))");

    // 1. Seed Production Users
    console.info("1. Seeding system administrator accounts...");
    const users = [
      { id: "admin@thenitishkr.in", email: "admin@thenitishkr.in", roles: ["admin", "analyst", "operator"] },
      { id: "nitish@thenitishkr.in", email: "nitish@thenitishkr.in", roles: ["admin", "analyst", "operator"] },
    ];
    for (const u of users) {
      await client.query(
        `insert into users (id, email, roles, created_at)
         values ($1, $2, $3, now())
         on conflict (id) do update set email = excluded.email, roles = excluded.roles`,
        [u.id, u.email, u.roles]
      );
    }

    // 2. Seed Strategic Intelligence Entities
    console.info("2. Seeding strategic national cyber & space infrastructure entities...");
    const entities = [
      { id: "ent-cert-in", type: "critical_infrastructure", key: "gov:cert-in", name: "CERT-In National Cyber Defense Core", aliases: ["CERT-IN-HQ", "DEFENSE-ALPHA"], lat: 28.6139, lng: 77.2090 },
      { id: "ent-mumbai-subsea", type: "telecom_infrastructure", key: "telecom:subsea-mumbai", name: "Mumbai Subsea Cable Landing Gateway", aliases: ["MUMBAI-SEA-01", "INGRESS-GATEWAY"], lat: 18.9220, lng: 72.8347 },
      { id: "ent-blr-cloud", type: "cloud_defense", key: "cloud:blr-hub", name: "Bengaluru Defense & Cloud Ingress Hub", aliases: ["BLR-NODE-44", "CLOUD-GRID"], lat: 12.9716, lng: 77.5946 },
      { id: "ent-hyd-threatlab", type: "threat_intelligence", key: "intel:hyd-matrix", name: "Hyderabad Threat Intelligence Matrix", aliases: ["HYD-MATRIX-LAB"], lat: 17.3850, lng: 78.4867 },
      { id: "ent-chn-fiber", type: "telecom_infrastructure", key: "telecom:chn-fiber", name: "Chennai Fiber Landing Station Alpha", aliases: ["CHN-SUB-02"], lat: 13.0827, lng: 80.2707 },
      { id: "ent-kol-eastern", type: "border_cyber_node", key: "border:kol-frontier", name: "Kolkata Eastern Border Cyber Node", aliases: ["KOL-EAST-09"], lat: 22.5726, lng: 88.3639 },
      { id: "ent-pune-vault", type: "secure_datacenter", key: "dc:pune-vault", name: "Pune Secure High-Density Vault", aliases: ["PUNE-VAULT-7"], lat: 18.5204, lng: 73.8567 },
      { id: "ent-ahd-grid", type: "power_grid_scada", key: "scada:ahd-grid", name: "Ahmedabad Western Grid Ingress", aliases: ["AHD-GRID-SCADA"], lat: 23.0225, lng: 72.5714 },
      { id: "ent-kch-fiber", type: "telecom_infrastructure", key: "telecom:kch-sea", name: "Kochi Arabian Sea Fiber Array", aliases: ["KCH-SEA-11"], lat: 9.9312, lng: 76.2673 },
      { id: "ent-sin-bridge", type: "international_relay", key: "intl:sin-relay", name: "Singapore Pacific Cyber Bridge", aliases: ["SIN-PACIFIC-BRIDGE"], lat: 1.3521, lng: 103.8198 },
      { id: "ent-fra-interconnect", type: "international_relay", key: "intl:fra-exchange", name: "Frankfurt European Interconnect", aliases: ["FRA-DECIX-NODE"], lat: 50.1109, lng: 8.6821 },
      { id: "ent-tok-station", type: "international_relay", key: "intl:tok-station", name: "Tokyo East Asia Telemetry Station", aliases: ["TOK-EAST-RELAY"], lat: 35.6762, lng: 139.6503 },
      { id: "ent-sat-link", type: "satellite_sensor", key: "space:sat-gs04", name: "Orbital Sat-Link Telemetry Pass GS-04", aliases: ["SAT-ORBIT-GS04"], lat: 21.1458, lng: 79.0882 },
      { id: "ent-vyuha-engine", type: "defense_formation", key: "defense:vyuha-core", name: "Vyuha Defense Engine (Chakra Active)", aliases: ["VYUHA-CHAKRA-ACTIVE"], lat: 28.6139, lng: 77.2090 },
    ];

    for (const ent of entities) {
      const provHash = sha256(`provenance:entity:${ent.id}:${ent.key}`);
      await client.query(
        `insert into intelligence_entities
          (entity_id, entity_type, canonical_key, display_name, aliases, attributes, first_seen_at, last_seen_at, provenance_hash, updated_at)
         values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, now(), now(), $7, now())
         on conflict (entity_id) do update set
          display_name = excluded.display_name,
          aliases = excluded.aliases,
          attributes = excluded.attributes,
          last_seen_at = now()`,
        [
          ent.id,
          ent.type,
          ent.key,
          ent.name,
          JSON.stringify(ent.aliases),
          JSON.stringify({ coordinates: [ent.lng, ent.lat], status: "active", classification: "strategic" }),
          provHash,
        ]
      );
    }

    // 3. Seed Strategic Relationships (Edges)
    console.info("3. Seeding intelligence relationship graph edges...");
    const edges = [
      { id: "edge-01", from: "ent-vyuha-engine", to: "ent-cert-in", rel: "defends_core", conf: 0.99 },
      { id: "edge-02", from: "ent-vyuha-engine", to: "ent-mumbai-subsea", rel: "enforces_containment", conf: 0.95 },
      { id: "edge-03", from: "ent-cert-in", to: "ent-blr-cloud", rel: "federated_policy_gate", conf: 0.97 },
      { id: "edge-04", from: "ent-blr-cloud", to: "ent-pune-vault", rel: "encrypted_tunnel", conf: 0.99 },
      { id: "edge-05", from: "ent-cert-in", to: "ent-ahd-grid", rel: "monitors_scada", conf: 0.93 },
      { id: "edge-06", from: "ent-kol-eastern", to: "ent-cert-in", rel: "border_telemetry_relay", conf: 0.91 },
      { id: "edge-07", from: "ent-sat-link", to: "ent-hyd-threatlab", rel: "streams_telemetry", conf: 0.94 },
      { id: "edge-08", from: "ent-mumbai-subsea", to: "ent-sin-bridge", rel: "subsea_fiber_trunk", conf: 0.96 },
      { id: "edge-09", from: "ent-mumbai-subsea", to: "ent-fra-interconnect", rel: "subsea_fiber_trunk", conf: 0.95 },
      { id: "edge-10", from: "ent-sin-bridge", to: "ent-tok-station", rel: "transpacific_transit", conf: 0.97 },
    ];

    for (const e of edges) {
      const srcHash = sha256(`edge-source:${e.id}`);
      const provHash = sha256(`edge-prov:${e.id}:${e.from}:${e.to}`);
      await client.query(
        `insert into intelligence_edges
          (edge_id, from_entity_id, to_entity_id, relation_type, confidence, source_hashes, provenance_hash, updated_at)
         values ($1, $2, $3, $4, $5, array[$6]::text[], $7, now())
         on conflict (edge_id) do update set
          confidence = excluded.confidence,
          relation_type = excluded.relation_type,
          updated_at = now()`,
        [e.id, e.from, e.to, e.rel, e.conf, srcHash, provHash]
      );
    }

    // 4. Seed Baseline Missions
    console.info("4. Seeding baseline missions...");
    const missionDefs = [
      { id: "MIS-2026-CHAKRA-09", status: "completed", risk: 0.42, policy: { decision: "ALLOW", reasons: ["Perimeter defense verified under NFU doctrine"] }, title: "Active National Cyber Defense & Perimeter Isolation" },
      { id: "MIS-2026-CRIT-GRID-LOCK", status: "analyzing", risk: 0.38, policy: { decision: "ALLOW", reasons: ["SCADA Grid telemetry authenticated"] }, title: "Western SCADA Grid Cryptographic Verification" },
      { id: "MIS-2026-ORBIT-SAT-TRACK", status: "completed", risk: 0.18, policy: { decision: "ALLOW", reasons: ["Orbital pass data authenticated"] }, title: "Space Situational Awareness & Satellite Pass Sync" },
    ];

    for (const u of users) {
      for (const m of missionDefs) {
        const mKey = `${m.id}-${u.id.split("@")[0]}`;
        await client.query(
          `insert into missions
            (mission_id, user_id, status, raw_input, current_risk_score, current_policy_decision, updated_at)
           values ($1, $2, $3, $4::jsonb, $5, $6::jsonb, now())
           on conflict (mission_id) do update set
            status = excluded.status,
            raw_input = excluded.raw_input,
            current_risk_score = excluded.current_risk_score,
            current_policy_decision = excluded.current_policy_decision,
            updated_at = now()`,
          [mKey, u.id, m.status, JSON.stringify({ rawText: m.title }), m.risk, JSON.stringify(m.policy)]
        );
      }
    }

    // 5. Seed Cryptographic Evidence Chain
    console.info("5. Seeding cryptographic evidence ledger events...");
    const missionId = `MIS-2026-CHAKRA-09-${users[0].id.split("@")[0]}`;
    const t0 = new Date(Date.now() - 3600000).toISOString();
    const ev1 = makeSeededEvent({
      eventId: "EV-2026-GENESIS-001",
      missionId,
      chainIndex: 0,
      timestamp: t0,
      actor: "SYSTEM_CONSTITUTIONAL_KERNEL",
      action: "GENESIS_ROOT_INITIALIZATION",
      input: { init: "CONSTITUTIONAL_EVIDENCE_OS_GENESIS_ROOT" },
      previousHash: undefined,
    });

    const t1 = new Date(Date.now() - 2700000).toISOString();
    const ev2 = makeSeededEvent({
      eventId: "EV-2026-VYUHA-002",
      missionId,
      chainIndex: 1,
      timestamp: t1,
      actor: "Vyuha Policy Gate",
      action: "CHAKRA_DEFENSE_ENGAGED",
      input: { posture: "CHAKRA", approval: "NFU_DOCTRINE" },
      previousHash: ev1.eventHash,
    });

    const t2 = new Date(Date.now() - 1200000).toISOString();
    const ev3 = makeSeededEvent({
      eventId: "EV-2026-MUMBAI-003",
      missionId,
      chainIndex: 2,
      timestamp: t2,
      actor: "Mumbai Subsea Sensor",
      action: "ANOMALOUS_PROBE_DEFLECTED",
      input: { sensor: "MUMBAI_GATEWAY_FIBER", status: "DEFLECTED" },
      previousHash: ev2.eventHash,
    });

    for (const ev of [ev1, ev2, ev3]) {
      await client.query(
        `insert into evidence_events
          (event_id, mission_id, chain_index, actor, action, input_hash, payload_hash, event_hash, previous_hash, event_timestamp, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
         on conflict (event_id) do update set
          payload_hash = excluded.payload_hash,
          event_hash = excluded.event_hash,
          previous_hash = excluded.previous_hash,
          event_timestamp = excluded.event_timestamp`,
        [ev.eventId, ev.missionId, ev.chainIndex, ev.actor, ev.action, ev.inputHash, ev.payloadHash, ev.eventHash, ev.previousHash ?? null, ev.timestamp]
      );
    }

    // 6. Seed State Changes & Lineage Nodes
    console.info("6. Seeding state change events & evidence lineage nodes...");
    const changeId = "chg-2026-vyuha-01";
    await client.query(
      `insert into intelligence_change_events
        (change_id, state_key, source_id, source_record_hash, subject, predicate, materiality, materiality_score, reasons, current_state_hash, verify_required, observed_at, provenance_hash, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, now() - interval '15 minutes', $12, now())
       on conflict (change_id) do nothing`,
      [
        changeId,
        "defense:vyuha-posture",
        "src-policy-gate",
        sha256("source:policy-gate"),
        "Perimeter Defense Posture",
        "Chakra Vyuha Formation Activated across Core Nodes",
        "high",
        0.88,
        JSON.stringify(["Perimeter sweep confirmed", "Policy gate verified honeypot trap active"]),
        sha256("state:chakra-active"),
        false,
        sha256("prov:change:01"),
      ]
    );

    const lineageNodeId = "node-lineage-certin-01";
    await client.query(
      `insert into evidence_lineage_nodes
        (node_id, node_kind, source_id, source_hash, content_hash, source_url, observed_at, published_at, title, metadata, provenance_hash, created_at)
       values ($1, $2, $3, $4, $5, $6, now() - interval '30 minutes', now() - interval '1 hour', $7, $8::jsonb, $9, now())
       on conflict (node_id) do nothing`,
      [
        lineageNodeId,
        "official_defense_record",
        "src-cert-in",
        sha256("certin-advisory-source"),
        sha256("certin-content-hash"),
        "https://disha6.6.thenitishkr.in/lineage/certin-01",
        "National Cyber Defense Advisory & Tactical Routing Policy",
        JSON.stringify({ classification: "public_record", authoritative: true }),
        sha256("prov:lineage:01"),
      ]
    );

    // 7. Seed Strategic Cyber Infrastructure Dataset & Features
    console.info("7. Seeding strategic cyber infrastructure spatial features & links...");
    const strategicDatasetId = "ds-strategic-cyber-infrastructure";
    const strategicImportJobId = "job-strategic-cyber-20261002";
    const strategicSourceHash = sha256("strategic-cyber-infrastructure-points");

    await client.query(
      `insert into geospatial_import_jobs
        (import_job_id, source_id, product_id, product_version, source_hash, source_crs, normalized_crs, license_note, attribution, status, feature_count_in, feature_count_out, metadata, started_at, completed_at)
       values ($1, $2, $3, $4, $5, 'EPSG:4326', 'EPSG:4326', 'Constitutional Operational Registry', 'DISHA National Spatial Directory', 'admitted', $6, $6, '{}'::jsonb, now(), now())
       on conflict (import_job_id) do update set status = 'admitted'`,
      [strategicImportJobId, "src-strategic-defense-grid", "disha-strategic-grid", "6.6.0", strategicSourceHash, entities.length]
    );

    await client.query(
      `insert into geospatial_datasets
        (dataset_id, import_job_id, source_id, source_url, product_id, product_version, retrieval_timestamp, source_hash, source_crs, normalized_crs, license_note, attribution, geography_levels, status, metadata, imported_at)
       values ($1, $2, $3, $4, $5, $6, now(), $7, 'EPSG:4326', 'EPSG:4326', 'Constitutional Operational Registry', 'DISHA National Spatial Directory', array['national', 'facility']::text[], 'admitted', '{}'::jsonb, now())
       on conflict (dataset_id) do update set status = 'admitted'`,
      [strategicDatasetId, strategicImportJobId, "src-strategic-defense-grid", "https://disha6.6.thenitishkr.in/data/strategic-nodes", "disha-strategic-grid", "6.6.0", strategicSourceHash]
    );

    for (const ent of entities) {
      const featId = `geo-point-${ent.id}`;
      const recHash = sha256(`rec:${featId}:${ent.lng}:${ent.lat}`);
      const provHash = sha256(`prov:${featId}`);
      const geomGeoJson = JSON.stringify({ type: "Point", coordinates: [ent.lng, ent.lat] });

      await client.query(
        `insert into geospatial_features
          (feature_id, dataset_id, feature_type, geography_level, name, properties, geom, source_record_hash, provenance_hash, observed_at)
         values ($1, $2, 'Point', 'facility', $3, $4::jsonb, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326), $6, $7, now())
         on conflict (feature_id) do update set
          name = excluded.name,
          properties = excluded.properties,
          geom = excluded.geom,
          observed_at = now()`,
        [
          featId,
          strategicDatasetId,
          ent.name,
          JSON.stringify({ entityId: ent.id, entityType: ent.type, coordinates: [ent.lng, ent.lat], classification: "critical_infrastructure" }),
          geomGeoJson,
          recHash,
          provHash,
        ]
      );

      // Link to intelligence entity
      await client.query(
        `insert into geospatial_feature_links
          (feature_id, link_type, ref_id, source_hash, provenance_hash, created_at)
         values ($1, 'entity', $2, $3, $4, now())
         on conflict (feature_id, link_type, ref_id) do nothing`,
        [featId, ent.id, recHash, provHash]
      );

      // Link to primary mission
      await client.query(
        `insert into geospatial_feature_links
          (feature_id, link_type, ref_id, source_hash, provenance_hash, created_at)
         values ($1, 'mission', $2, $3, $4, now())
         on conflict (feature_id, link_type, ref_id) do nothing`,
        [featId, `MIS-2026-CHAKRA-09-${users[0].id.split("@")[0]}`, recHash, provHash]
      );
    }

    await client.query("commit");
    console.info("Master seed phase 1 completed successfully.");
  } catch (err) {
    await client.query("rollback");
    console.error("Master seed failed:", err);
    throw err;
  } finally {
    client.release();
  }

  // 8. Import Land Boundary GeoJSON
  console.info("8. Importing national land boundary GeoJSON...");
  const landGeoJsonPath = path.resolve(__dirname, "../public/data/datameet-india-land-simplified.geojson");
  const landManifestPath = path.resolve(__dirname, "geospatial/manifest-india-land.json");
  const importScript = path.resolve(__dirname, "geospatial/import-authoritative-geojson.mjs");

  try {
    const { spawnSync } = await import("node:child_process");
    console.info("Importing national boundary into PostgreSQL...");
    const landRun = spawnSync(process.execPath, [importScript, landGeoJsonPath, landManifestPath], {
      env: process.env,
      stdio: "inherit",
    });
    if (landRun.status !== 0) {
      console.warn("National boundary import returned exit code:", landRun.status);
    } else {
      console.info("National boundary imported successfully.");
    }

    // 9. Import India Districts GeoJSON
    console.info("9. Importing 759 Indian districts GeoJSON with official LGD census mapping...");
    const districtGeoJsonPath = path.resolve(__dirname, "../public/data/india-districts.geojson");
    const districtManifestPath = path.resolve(__dirname, "geospatial/manifest-india-districts.json");
    const distRun = spawnSync(process.execPath, [importScript, districtGeoJsonPath, districtManifestPath], {
      env: process.env,
      stdio: "inherit",
    });
    if (distRun.status !== 0) {
      console.warn("District boundaries import returned exit code:", distRun.status);
    } else {
      console.info("759 Indian districts imported successfully.");
    }
  } catch (subErr) {
    console.warn("Subprocess geojson import exception:", subErr);
  }

  console.info("=== DISHA PRODUCTION DATA PROVISIONING COMPLETE ===");
  await pool.end();
}

run().catch((err) => {
  console.error("Fatal error running master seed:", err);
  process.exit(1);
});
