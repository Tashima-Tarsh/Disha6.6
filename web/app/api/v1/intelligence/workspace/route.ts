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
      return NextResponse.json({ error: "Persistent intelligence database is not configured", database: "unconfigured" }, { status: 503, headers: { "X-Request-ID": ctx.requestId } });
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
      return NextResponse.json(body, { status: 503, headers: { "X-Request-ID": ctx.requestId } });
    }
  });
}

function policyLabel(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const candidate = record.decision ?? record.action ?? record.status;
  return candidate ? String(candidate) : null;
}
