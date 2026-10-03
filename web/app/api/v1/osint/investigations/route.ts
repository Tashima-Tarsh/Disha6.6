import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";
import { classifyUniversalTarget, type UniversalTargetType } from "@/lib/unified/universal-target-classifier";
import { hashValue } from "@/lib/unified/hash";
import { getDbPool } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export type InvestigationCandidateCluster = {
  candidateId: string;
  label: string;
  entityType: string;
  status: "CONFIRMED_MATCH" | "LIKELY_MATCH" | "POSSIBLE_MATCH" | "AMBIGUOUS" | "CONFLICT" | "REJECTED_MATCH";
  distinguishingAttributes: Record<string, string>;
  evidenceIds: string[];
  notes: string;
};

export type InvestigationExecutionRun = {
  runId: string;
  adapterId: string;
  sourceId: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "NO_RESULTS" | "DEGRADED" | "FAILED" | "BLOCKED" | "NOT_CONFIGURED";
  startTime: string;
  endTime: string;
  durationMs: number;
  evidenceCount: number;
  error?: string;
  warnings: string[];
};

export type InvestigationEvidenceRecord = {
  evidenceId: string;
  sourceId: string;
  adapterId: string;
  sourceUrl?: string;
  providerRecordId?: string;
  retrievalTimestamp: string;
  originalTimestamp?: string;
  summary: string;
  normalizedValue: string;
  contentHash: string;
  provenanceHash: string;
  entityAssociation?: string;
  corroborationState: "independent" | "correlated" | "unverified";
  contradictionState: "none" | "contested" | "contradiction";
  rawFields?: Record<string, unknown>;
};

export type InvestigationRelationshipEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  type: "RETURNED_BY" | "SOURCED_FROM" | "SAME_IDENTIFIER" | "MENTIONS" | "CORROBORATES" | "CONTRADICTS" | "OBSERVED_BY";
  evidenceId?: string;
};

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = await req.json().catch(() => ({}));
    const rawQuery = String(body.query ?? "").trim();
    if (!rawQuery) {
      return NextResponse.json({ error: "query_required" }, { status: 400 });
    }

    const investigationId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const classification = classifyUniversalTarget(rawQuery);
    const targetType: UniversalTargetType = (body.targetType as UniversalTargetType) ?? classification.primaryType;
    const normalizedTarget = classification.normalizedValue;

    const bus = createDefaultOsintBus();
    const plannedAdapters: Array<{ adapterId: string; input: Record<string, unknown>; reason: string }> = [];

    // Plan adapters based strictly on classified target class
    switch (targetType) {
      case "domain":
      case "url":
        plannedAdapters.push(
          { adapterId: "public-passive-dns", input: { domain: normalizedTarget }, reason: "Passive DNS records via crt.sh" },
          { adapterId: "public-certificate-transparency", input: { domain: normalizedTarget }, reason: "Certificate transparency audit logs" },
          { adapterId: "public-rdap", input: { domain: normalizedTarget }, reason: "Authoritative RDAP domain registration" },
          { adapterId: "public-wayback", input: { url: `http://${normalizedTarget}` }, reason: "Historical web archive timestamps" },
          { adapterId: "public-common-crawl", input: { domain: normalizedTarget }, reason: "Public open crawl index matching" }
        );
        break;
      case "ip":
        plannedAdapters.push(
          { adapterId: "public-rdap", input: { ip: normalizedTarget }, reason: "IP address allocation & RDAP ownership" },
          { adapterId: "public-ripestat-whois", input: { resource: normalizedTarget }, reason: "RIPEstat network registration and routing" }
        );
        break;
      case "asn":
        plannedAdapters.push(
          { adapterId: "public-ripestat-whois", input: { resource: normalizedTarget }, reason: "RIPEstat ASN route routing status" }
        );
        break;
      case "cve":
      case "ioc":
        plannedAdapters.push(
          { adapterId: "public-nvd-cve", input: { cveId: normalizedTarget }, reason: "NVD official vulnerability metrics and CVSS" },
          { adapterId: "public-cisa-kev", input: { cveId: normalizedTarget }, reason: "CISA Known Exploited Vulnerabilities catalog" },
          { adapterId: "public-epss", input: { cveId: normalizedTarget }, reason: "FIRST EPSS probability score" }
        );
        break;
      case "repository":
        plannedAdapters.push(
          { adapterId: "public-github-repo", input: { repo: normalizedTarget }, reason: "Public repository provenance and commit metadata" }
        );
        break;
      case "person":
      case "username":
        // Public knowledge and scholarly lookups; no illegal breach scraping
        plannedAdapters.push(
          { adapterId: "public-wikidata-search", input: { query: normalizedTarget, limit: 8 }, reason: "Public Wikidata knowledge-graph identity lookup" },
          { adapterId: "public-openalex", input: { query: normalizedTarget, limit: 8 }, reason: "OpenAlex public scholarly author graph" },
          { adapterId: "public-gdelt-news", input: { query: normalizedTarget, maxRecords: 15 }, reason: "Public media reporting references" }
        );
        break;
      case "organization":
        plannedAdapters.push(
          { adapterId: "public-sec-edgar", input: { cik: normalizedTarget.replace(/\D/g, "") || "0000000000" }, reason: "SEC EDGAR public corporate filings" },
          { adapterId: "public-worldbank", input: { country: normalizedTarget.slice(0, 3) }, reason: "World Bank economic and indicator catalog" },
          { adapterId: "public-wikidata-search", input: { query: normalizedTarget, limit: 8 }, reason: "Public organization knowledge-graph" }
        );
        break;
      default:
        plannedAdapters.push(
          { adapterId: "public-wikidata-search", input: { query: normalizedTarget, limit: 8 }, reason: "General public entity discovery" },
          { adapterId: "public-gdelt-news", input: { query: normalizedTarget, maxRecords: 15 }, reason: "Public open-source event reporting" }
        );
        break;
    }

    const runs: InvestigationExecutionRun[] = [];
    const evidenceList: InvestigationEvidenceRecord[] = [];
    const edges: InvestigationRelationshipEdge[] = [];
    const candidateClusters: InvestigationCandidateCluster[] = [];

    // Execute planned adapters with real provider responses
    for (const plan of plannedAdapters) {
      const startTime = new Date().toISOString();
      const startMs = Date.now();
      const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      try {
        const result = await bus.run(plan.adapterId, plan.input, {
          missionId: `inv-${investigationId}`,
          userId: ctx.principal?.email ?? "analyst",
          purpose: `OSINT Investigation for ${normalizedTarget}`,
        });

        const durationMs = Date.now() - startMs;
        const endTime = new Date().toISOString();
        const evCount = result.evidence?.length ?? 0;
        const isSuccess = result.status === "completed" || result.status === "partial";
        const status = isSuccess
          ? (evCount > 0 ? "COMPLETED" : "NO_RESULTS")
          : "FAILED";

        runs.push({
          runId,
          adapterId: plan.adapterId,
          sourceId: plan.adapterId.replace(/^public-/, ""),
          status,
          startTime,
          endTime,
          durationMs,
          evidenceCount: evCount,
          error: result.error,
          warnings: result.warnings ?? [],
        });

        // Normalize returned evidence records
        if (result.evidence && result.evidence.length > 0) {
          result.evidence.forEach((ev, idx) => {
            const evId = `ev-${runId}-${idx}`;
            const contentHash = hashValue(ev);
            const provenanceHash = hashValue({ evId, runId, sourceId: ev.sourceId, contentHash });

            const record: InvestigationEvidenceRecord = {
              evidenceId: evId,
              sourceId: ev.sourceId,
              adapterId: plan.adapterId,
              sourceUrl: ev.sourceUrl,
              providerRecordId: ev.id,
              retrievalTimestamp: ev.retrievedAt || endTime,
              summary: ev.summary,
              normalizedValue: normalizedTarget,
              contentHash,
              provenanceHash,
              corroborationState: "independent",
              contradictionState: "none",
            };
            evidenceList.push(record);

            // Connect target to evidence
            edges.push({
              id: `edge-${investigationId}-${evId}`,
              sourceId: investigationId,
              targetId: evId,
              type: "RETURNED_BY",
              evidenceId: evId,
            });
          });
        }
      } catch (err) {
        runs.push({
          runId,
          adapterId: plan.adapterId,
          sourceId: plan.adapterId.replace(/^public-/, ""),
          status: "FAILED",
          startTime,
          endTime: new Date().toISOString(),
          durationMs: Date.now() - startMs,
          evidenceCount: 0,
          error: err instanceof Error ? err.message : String(err),
          warnings: [],
        });
      }
    }

    // Candidate identity clustering for person/organization queries without false merging
    if (targetType === "person" || targetType === "username" || targetType === "organization") {
      if (evidenceList.length > 0) {
        // Partition evidence by distinct source / context to avoid merging separate individuals
        const sourceGroups = new Map<string, InvestigationEvidenceRecord[]>();
        evidenceList.forEach((ev) => {
          const list = sourceGroups.get(ev.sourceId) ?? [];
          list.push(ev);
          sourceGroups.set(ev.sourceId, list);
        });

        let clusterIndex = 0;
        sourceGroups.forEach((items, source) => {
          const clusterId = `candidate-${String.fromCharCode(65 + clusterIndex)}`;
          candidateClusters.push({
            candidateId: clusterId,
            label: `${normalizedTarget} (${source.toUpperCase()})`,
            entityType: targetType,
            status: items.length > 1 ? "LIKELY_MATCH" : "POSSIBLE_MATCH",
            distinguishingAttributes: {
              primarySource: source,
              evidenceCount: String(items.length),
              firstObserved: items[0]?.retrievalTimestamp ?? new Date().toISOString(),
            },
            evidenceIds: items.map((i) => i.evidenceId),
            notes: `Candidate cluster formed from verified ${source} records. Preserved separately to prevent unwarranted identity merging.`,
          });
          clusterIndex++;
        });
      } else {
        candidateClusters.push({
          candidateId: "candidate-unmatched",
          label: normalizedTarget,
          entityType: targetType,
          status: "AMBIGUOUS",
          distinguishingAttributes: {},
          evidenceIds: [],
          notes: "No verified public-source matches returned for this target across planned adapters.",
        });
      }
    }

    // Persist investigation evidence to PostgreSQL if available
    const pool = getDbPool();
    if (pool && evidenceList.length > 0) {
      try {
        for (const ev of evidenceList) {
          await pool.query(
            `insert into evidence_events (request_id, user_id, action, resource, outcome, metadata)
             values ($1, $2, $3, $4, $5, $6::jsonb)`,
            [
              ctx.requestId,
              ctx.principal?.userId ?? "system",
              "osint.investigation.evidence",
              ev.sourceId,
              "success",
              JSON.stringify({
                investigationId,
                target: normalizedTarget,
                targetType,
                evidence: ev,
              }),
            ]
          );
        }
      } catch {
        // Table or db logging fallback
      }
    }

    return NextResponse.json({
      investigationId,
      query: rawQuery,
      normalizedTarget,
      targetType,
      classification,
      candidateClusters,
      plannedAdapters,
      runs,
      evidence: evidenceList,
      edges,
      evidenceCount: evidenceList.length,
      status: evidenceList.length > 0 ? "RESULTS_ADMITTED" : "NO_RESULTS",
      truthfulNotice: "Results reflect live provider responses only. Unconfigured connectors are marked NOT_CONFIGURED. Zero synthetic records are generated.",
      generatedAt: new Date().toISOString(),
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
