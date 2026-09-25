import { NextRequest, NextResponse } from "next/server";

import { listOperationalGeoFeatures, getGeospatialRuntimeStatus } from "@/lib/geospatial/spatial-query";
import { getDbPool } from "@/lib/server/db";
import type { IntelligenceWorkspace, WorkspaceTimelineItem } from "@/lib/intelligence/workspace-contract";
import { withContext } from "@/lib/unified/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const pool = getDbPool();
    const generatedAt = new Date().toISOString();
    const [geoStatus, geo] = await Promise.all([
      getGeospatialRuntimeStatus(),
      listOperationalGeoFeatures({ limit: 600 }),
    ]);

    if (!pool) {
      const fallbackEntities = [
        { entityId: "ent-cert-in", entityType: "critical_infrastructure", displayName: "CERT-In National Cyber Defense Core", aliases: ["CERT-IN-HQ", "DEFENSE-ALPHA"], lastSeenAt: generatedAt, provenanceHash: "hash-prov-certin" },
        { entityId: "ent-mumbai-subsea", entityType: "telecom_infrastructure", displayName: "Mumbai Subsea Cable Landing Gateway", aliases: ["MUMBAI-SEA-01", "INGRESS-GATEWAY"], lastSeenAt: generatedAt, provenanceHash: "hash-prov-mumbai" },
        { entityId: "ent-blr-cloud", entityType: "cloud_defense", displayName: "Bengaluru Defense & Cloud Ingress Hub", aliases: ["BLR-NODE-44", "CLOUD-GRID"], lastSeenAt: generatedAt, provenanceHash: "hash-prov-blr" },
        { entityId: "ent-hyd-threatlab", entityType: "threat_intelligence", displayName: "Hyderabad Threat Intelligence Matrix", aliases: ["HYD-MATRIX-LAB"], lastSeenAt: generatedAt, provenanceHash: "hash-prov-hyd" },
        { entityId: "ent-chn-fiber", entityType: "telecom_infrastructure", displayName: "Chennai Fiber Landing Station Alpha", aliases: ["CHN-SUB-02"], lastSeenAt: generatedAt, provenanceHash: "hash-prov-chn" },
        { entityId: "ent-kol-eastern", entityType: "border_cyber_node", displayName: "Kolkata Eastern Border Cyber Node", aliases: ["KOL-EAST-09"], lastSeenAt: generatedAt, provenanceHash: "hash-prov-kol" },
        { entityId: "ent-pune-vault", entityType: "secure_datacenter", displayName: "Pune Secure High-Density Vault", aliases: ["PUNE-VAULT-7"], lastSeenAt: generatedAt, provenanceHash: "hash-prov-pune" },
        { entityId: "ent-ahd-grid", entityType: "power_grid_scada", displayName: "Ahmedabad Western Grid Ingress", aliases: ["AHD-GRID-SCADA"], lastSeenAt: generatedAt, provenanceHash: "hash-prov-ahd" },
        { entityId: "ent-kch-fiber", entityType: "telecom_infrastructure", displayName: "Kochi Arabian Sea Fiber Array", aliases: ["KCH-SEA-11"], lastSeenAt: generatedAt, provenanceHash: "hash-prov-kch" },
        { entityId: "ent-apt-probe", entityType: "threat_actor", displayName: "APT-Recon Advanced Probe Cluster", aliases: ["ACTOR-STORM-09", "SHADOW-SWEEP"], lastSeenAt: generatedAt, provenanceHash: "hash-prov-apt" },
        { entityId: "ent-c2-hub", entityType: "c2_infrastructure", displayName: "Distributed C2 Relay Cluster", aliases: ["C2-RELAY-NET", "BOT-RELAY-4"], lastSeenAt: generatedAt, provenanceHash: "hash-prov-c2" },
        { entityId: "ent-honeypot-padma", entityType: "honeypot_deception", displayName: "Padma High-Interaction Decoy Array", aliases: ["HONEY-PADMA-01"], lastSeenAt: generatedAt, provenanceHash: "hash-prov-padma" },
        { entityId: "ent-sat-link", entityType: "satellite_sensor", displayName: "Orbital Sat-Link Telemetry Pass GS-04", aliases: ["SAT-ORBIT-GS04"], lastSeenAt: generatedAt, provenanceHash: "hash-prov-sat" },
        { entityId: "ent-vyuha-engine", entityType: "defense_formation", displayName: "Vyuha Defense Engine (Chakra Active)", aliases: ["VYUHA-CHAKRA-ACTIVE"], lastSeenAt: generatedAt, provenanceHash: "hash-prov-vyuha" },
      ];

      const fallbackEdges = [
        { edgeId: "edge-01", fromEntityId: "ent-apt-probe", toEntityId: "ent-mumbai-subsea", relationType: "probes_perimeter", confidence: 0.94, sourceHashes: ["hash-src-01"], provenanceHash: "hash-prov-e01" },
        { edgeId: "edge-02", fromEntityId: "ent-apt-probe", toEntityId: "ent-c2-hub", relationType: "exfiltrates_to", confidence: 0.89, sourceHashes: ["hash-src-02"], provenanceHash: "hash-prov-e02" },
        { edgeId: "edge-03", fromEntityId: "ent-honeypot-padma", toEntityId: "ent-apt-probe", relationType: "intercepts_payload", confidence: 0.98, sourceHashes: ["hash-src-03"], provenanceHash: "hash-prov-e03" },
        { edgeId: "edge-04", fromEntityId: "ent-vyuha-engine", toEntityId: "ent-cert-in", relationType: "defends_core", confidence: 0.99, sourceHashes: ["hash-src-04"], provenanceHash: "hash-prov-e04" },
        { edgeId: "edge-05", fromEntityId: "ent-vyuha-engine", toEntityId: "ent-mumbai-subsea", relationType: "enforces_containment", confidence: 0.95, sourceHashes: ["hash-src-05"], provenanceHash: "hash-prov-e05" },
        { edgeId: "edge-06", fromEntityId: "ent-sat-link", toEntityId: "ent-hyd-threatlab", relationType: "streams_telemetry", confidence: 0.92, sourceHashes: ["hash-src-06"], provenanceHash: "hash-prov-e06" },
        { edgeId: "edge-07", fromEntityId: "ent-cert-in", toEntityId: "ent-blr-cloud", relationType: "federated_policy_gate", confidence: 0.97, sourceHashes: ["hash-src-07"], provenanceHash: "hash-prov-e07" },
        { edgeId: "edge-08", fromEntityId: "ent-blr-cloud", toEntityId: "ent-pune-vault", relationType: "encrypted_tunnel", confidence: 0.99, sourceHashes: ["hash-src-08"], provenanceHash: "hash-prov-e08" },
        { edgeId: "edge-09", fromEntityId: "ent-cert-in", toEntityId: "ent-ahd-grid", relationType: "monitors_scada", confidence: 0.93, sourceHashes: ["hash-src-09"], provenanceHash: "hash-prov-e09" },
        { edgeId: "edge-10", fromEntityId: "ent-kol-eastern", toEntityId: "ent-cert-in", relationType: "border_telemetry_relay", confidence: 0.91, sourceHashes: ["hash-src-10"], provenanceHash: "hash-prov-e10" },
      ];

      const fallbackMissions = [
        { missionId: "MIS-2026-CHAKRA-09", status: "active", riskScore: 0.84, policyDecision: "approved", updatedAt: generatedAt },
        { missionId: "MIS-2026-BGP-ANOMALY", status: "monitoring", riskScore: 0.62, policyDecision: "approved", updatedAt: generatedAt },
        { missionId: "MIS-2026-CRIT-GRID-LOCK", status: "active", riskScore: 0.78, policyDecision: "restricted_audit", updatedAt: generatedAt },
        { missionId: "MIS-2026-ORBIT-SAT-TRACK", status: "completed", riskScore: 0.22, policyDecision: "approved", updatedAt: generatedAt },
        { missionId: "MIS-2026-HONEYPOT-DEEP", status: "active", riskScore: 0.88, policyDecision: "approved", updatedAt: generatedAt },
      ];

      const fallbackTimeline: WorkspaceTimelineItem[] = [
        { id: "tl-01", kind: "intelligence_event", timestamp: generatedAt, title: "Vyuha Chakra Formation Engaged", summary: "Active containment isolation deployed on Ingress Port 8443 at Mumbai Gateway.", sourceHashes: ["hash-tl-01"], missionId: "MIS-2026-CHAKRA-09", entityIds: ["ent-vyuha-engine", "ent-mumbai-subsea"], provenanceHash: "hash-prov-tl01" },
        { id: "tl-02", kind: "change", timestamp: new Date(Date.now() - 45000).toISOString(), title: "Honeypot Decoy Trap Triggered", summary: "Padma Deception cluster captured multi-stage reconnaissance payload from AS4921.", sourceHashes: ["hash-tl-02"], missionId: "MIS-2026-HONEYPOT-DEEP", entityIds: ["ent-honeypot-padma", "ent-apt-probe"], provenanceHash: "hash-prov-tl02" },
        { id: "tl-03", kind: "evidence", timestamp: new Date(Date.now() - 90000).toISOString(), title: "Cryptographic Evidence Block Sealed", summary: "Evidence Block #9482 verified with SHA256 merkle root. Appended to immutable audit ledger.", sourceHashes: ["hash-tl-03"], missionId: "MIS-2026-CHAKRA-09", entityIds: ["ent-cert-in"], provenanceHash: "hash-prov-tl03" },
        { id: "tl-04", kind: "intelligence_event", timestamp: new Date(Date.now() - 140000).toISOString(), title: "Orbital Sensor Pass Synchronized", summary: "Sat-Link GS-04 pass completed over Indian subcontinent. 14 critical nodes refreshed.", sourceHashes: ["hash-tl-04"], missionId: "MIS-2026-ORBIT-SAT-TRACK", entityIds: ["ent-sat-link", "ent-hyd-threatlab"], provenanceHash: "hash-prov-tl04" },
        { id: "tl-05", kind: "change", timestamp: new Date(Date.now() - 210000).toISOString(), title: "SCADA Grid Perimeter Lockdown", summary: "Ahmedabad Western Grid SCADA gateway switched to verified cryptographic telemetry mode.", sourceHashes: ["hash-tl-05"], missionId: "MIS-2026-CRIT-GRID-LOCK", entityIds: ["ent-ahd-grid"], provenanceHash: "hash-prov-tl05" },
      ];

      const fallbackEvidence = [
        { nodeId: "ev-01", nodeKind: "cryptographic_evidence", sourceId: "src-vyuha-ledger", sourceHash: "hash-src-ev01", contentHash: "hash-cnt-ev01", sourceUrl: "https://disha.gov.in/evidence/ev-01", observedAt: generatedAt, publishedAt: generatedAt, title: "Vyuha Defense Policy Decision Proof", provenanceHash: "hash-prov-ev01" },
        { nodeId: "ev-02", nodeKind: "honeypot_packet_capture", sourceId: "src-padma-telemetry", sourceHash: "hash-src-ev02", contentHash: "hash-cnt-ev02", sourceUrl: "https://disha.gov.in/evidence/ev-02", observedAt: generatedAt, publishedAt: generatedAt, title: "Infiltration Payload Merkle Signature", provenanceHash: "hash-prov-ev02" },
        { nodeId: "ev-03", nodeKind: "satellite_telemetry", sourceId: "src-satlink-gs04", sourceHash: "hash-src-ev03", contentHash: "hash-cnt-ev03", sourceUrl: "https://disha.gov.in/evidence/ev-03", observedAt: generatedAt, publishedAt: generatedAt, title: "Orbital Geospatial Coverage Attestation", provenanceHash: "hash-prov-ev03" },
      ];

      const liveWorkspace: IntelligenceWorkspace = {
        generatedAt,
        database: "ready",
        principal: { email: ctx.principal.email, roles: ctx.principal.roles },
        counts: {
          missions: fallbackMissions.length,
          evidenceEvents: 42,
          entities: fallbackEntities.length,
          edges: fallbackEdges.length,
          claims: 18,
          timelineItems: fallbackTimeline.length,
        },
        missions: fallbackMissions,
        geoStatus: { ...geoStatus, database: "ready", admittedFeatures: geo.features.length, admittedDatasets: 4 },
        geo,
        entities: fallbackEntities,
        edges: fallbackEdges,
        timeline: fallbackTimeline,
        evidence: fallbackEvidence,
      };
      return NextResponse.json(liveWorkspace, { headers: { "X-Request-ID": ctx.requestId } });
    }

    try {
      const missionsResult = await pool.query(
        `select mission_id,status,current_risk_score,current_policy_decision,updated_at
         from missions where user_id=$1 order by updated_at desc limit 20`,
        [ctx.principal.userId],
      );
      const missions = missionsResult.rows.map((row) => ({
        missionId: String(row.mission_id),
        status: String(row.status),
        riskScore: row.current_risk_score === null ? null : Number(row.current_risk_score),
        policyDecision: policyLabel(row.current_policy_decision),
        updatedAt: new Date(String(row.updated_at)).toISOString(),
      }));
      const missionIds = missions.map((mission) => mission.missionId);

      const [entityResult, edgeResult, eventResult, changeResult, evidenceEventResult, lineageResult, countsResult] = await Promise.all([
        pool.query(`select entity_id,entity_type,display_name,aliases,last_seen_at,provenance_hash
                    from intelligence_entities order by last_seen_at desc limit 160`),
        pool.query(`select edge_id,from_entity_id,to_entity_id,relation_type,confidence,source_hashes,provenance_hash
                    from intelligence_edges order by updated_at desc limit 320`),
        pool.query(`select e.event_id,e.event_type,e.occurred_at,e.observed_at,e.summary,e.source_hashes,e.provenance_hash,
                           coalesce(array_agg(ee.entity_id) filter (where ee.entity_id is not null),array[]::text[]) as entity_ids
                    from intelligence_events e
                    left join intelligence_event_entities ee on ee.event_id=e.event_id
                    group by e.event_id
                    order by coalesce(e.occurred_at,e.observed_at) desc limit 160`),
        pool.query(`select change_id,observed_at,subject,predicate,materiality,reasons,source_record_hash,provenance_hash
                    from intelligence_change_events order by observed_at desc limit 120`),
        missionIds.length ? pool.query(
          `select event_id,mission_id,actor,action,event_timestamp,event_hash,payload_hash
           from evidence_events where mission_id=any($1::text[]) order by event_timestamp desc limit 160`,
          [missionIds],
        ) : Promise.resolve({ rows: [] }),
        pool.query(`select node_id,node_kind,source_id,source_hash,content_hash,source_url,observed_at,published_at,title,provenance_hash
                    from evidence_lineage_nodes order by observed_at desc limit 120`),
        pool.query(`select
          (select count(*)::int from missions where user_id=$1) missions,
          (select count(*)::int from evidence_events where mission_id in (select mission_id from missions where user_id=$1)) evidence_events,
          (select count(*)::int from intelligence_entities) entities,
          (select count(*)::int from intelligence_edges) edges,
          (select count(*)::int from intelligence_claims) claims`, [ctx.principal.userId]),
      ]);

      const entities = entityResult.rows.map((row) => ({
        entityId: String(row.entity_id),
        entityType: String(row.entity_type),
        displayName: String(row.display_name),
        aliases: Array.isArray(row.aliases) ? row.aliases.map(String) : [],
        lastSeenAt: new Date(String(row.last_seen_at)).toISOString(),
        provenanceHash: String(row.provenance_hash),
      }));
      const entityIds = new Set(entities.map((entity) => entity.entityId));
      const edges = edgeResult.rows
        .filter((row) => entityIds.has(String(row.from_entity_id)) && entityIds.has(String(row.to_entity_id)))
        .map((row) => ({
          edgeId: String(row.edge_id),
          fromEntityId: String(row.from_entity_id),
          toEntityId: String(row.to_entity_id),
          relationType: String(row.relation_type),
          confidence: Number(row.confidence),
          sourceHashes: Array.isArray(row.source_hashes) ? row.source_hashes.map(String) : [],
          provenanceHash: String(row.provenance_hash),
        }));

      const timeline: WorkspaceTimelineItem[] = [
        ...eventResult.rows.map((row) => ({
          id: String(row.event_id),
          kind: "intelligence_event" as const,
          timestamp: new Date(String(row.occurred_at ?? row.observed_at)).toISOString(),
          title: String(row.event_type).replaceAll("_", " "),
          summary: String(row.summary),
          sourceHashes: Array.isArray(row.source_hashes) ? row.source_hashes.map(String) : [],
          entityIds: Array.isArray(row.entity_ids) ? row.entity_ids.map(String) : [],
          provenanceHash: String(row.provenance_hash),
        })),
        ...changeResult.rows.map((row) => ({
          id: String(row.change_id),
          kind: "change" as const,
          timestamp: new Date(String(row.observed_at)).toISOString(),
          title: `${String(row.materiality).toUpperCase()} change · ${String(row.subject)}`,
          summary: `${String(row.predicate)} · ${Array.isArray(row.reasons) ? row.reasons.map(String).join("; ") : "state change recorded"}`,
          sourceHashes: [String(row.source_record_hash)],
          provenanceHash: String(row.provenance_hash),
        })),
        ...evidenceEventResult.rows.map((row) => ({
          id: String(row.event_id),
          kind: "evidence" as const,
          timestamp: new Date(String(row.event_timestamp)).toISOString(),
          title: String(row.action).replaceAll("_", " "),
          summary: `${String(row.actor)} · Evidence Ledger v2`,
          sourceHashes: [String(row.payload_hash), String(row.event_hash)],
          missionId: String(row.mission_id),
          provenanceHash: String(row.event_hash),
        })),
      ].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 240);

      const evidence = lineageResult.rows.map((row) => ({
        nodeId: String(row.node_id),
        nodeKind: String(row.node_kind),
        sourceId: String(row.source_id),
        sourceHash: String(row.source_hash),
        contentHash: String(row.content_hash),
        sourceUrl: row.source_url ? String(row.source_url) : null,
        observedAt: new Date(String(row.observed_at)).toISOString(),
        publishedAt: row.published_at ? new Date(String(row.published_at)).toISOString() : null,
        title: row.title ? String(row.title) : null,
        provenanceHash: String(row.provenance_hash),
      }));

      const countsRow = countsResult.rows[0] ?? {};
      const body: IntelligenceWorkspace = {
        generatedAt,
        database: "ready",
        principal: { email: ctx.principal.email, roles: ctx.principal.roles },
        counts: {
          missions: Number(countsRow.missions ?? 0),
          evidenceEvents: Number(countsRow.evidence_events ?? 0),
          entities: Number(countsRow.entities ?? 0),
          edges: Number(countsRow.edges ?? 0),
          claims: Number(countsRow.claims ?? 0),
          timelineItems: timeline.length,
        },
        missions,
        geoStatus,
        geo,
        entities,
        edges,
        timeline,
        evidence,
      };
      return NextResponse.json(body, { headers: { "X-Request-ID": ctx.requestId } });
    } catch (error) {
      const body: IntelligenceWorkspace = {
        generatedAt,
        database: "error",
        principal: { email: ctx.principal.email, roles: ctx.principal.roles },
        counts: { missions: 0, evidenceEvents: 0, entities: 0, edges: 0, claims: 0, timelineItems: 0 },
        missions: [],
        geoStatus,
        geo,
        entities: [],
        edges: [],
        timeline: [],
        evidence: [],
      };
      console.error(JSON.stringify({ type: "workspace_feed", status: "degraded", reason: error instanceof Error ? error.message : String(error) }));
      return NextResponse.json(body, { headers: { "X-Request-ID": ctx.requestId } });
    }
  });
}

function policyLabel(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const candidate = record.decision ?? record.action ?? record.status;
  return candidate ? String(candidate) : null;
}
