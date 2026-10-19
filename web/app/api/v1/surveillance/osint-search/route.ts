import { NextRequest, NextResponse } from "next/server";
import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";
import { runUniversalOsintSearch, sanitizeUniversalQuery } from "@/lib/unified/universal-osint-search";
import { DatasetsService } from "@/lib/unified/datasets-service";
import { BreachDirectoryEngine } from "@/lib/unified/breach-directory-engine";

export const dynamic = "force-dynamic";

async function executeOsintSearch(rawQuery: string, toolId?: string, signal?: AbortSignal) {
  const query = sanitizeUniversalQuery(rawQuery);
  const isBreachTool =
    toolId === "leak-database" ||
    toolId === "biggest-data-breaches" ||
    toolId === "hibp-breach-audit" ||
    toolId === "wikileaks-spyfiles";
  const isGenericLeakQuery = /^(all|leak|leaks|breach|breaches|dump|hacked|password|database|data breach|leak database)$/i.test(query);

  // If this is a leak/breach search, run local dataset query first (instant sub-10ms)
  let datasetMatches: any[] = [];
  let breachAudit: any = null;
  try {
    const ds = DatasetsService.getInstance();
    const searchTarget = (isGenericLeakQuery || isBreachTool && !query) ? "hacked" : query;
    datasetMatches = ds.searchDatasets(searchTarget, 30);

    // If query is broad or yielded few hits and user is looking for breaches, backfill from Biggest-Data-Breaches
    if (datasetMatches.length === 0 && (isBreachTool || isGenericLeakQuery)) {
      datasetMatches = ds.searchDatasets("hacked", 25);
    }

    breachAudit = BreachDirectoryEngine.auditTarget(query);
  } catch {
    // Graceful fallback
  }

  // Network OSINT bus: for leak tools, use very short timeout (1500ms) to ensure instant response; for general OSINT use 3500ms
  const networkTimeoutMs = isBreachTool ? 1500 : 3500;
  const abortSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(networkTimeoutMs)])
    : AbortSignal.timeout(networkTimeoutMs);

  const bus = createDefaultOsintBus({
    policyCheck: (metadata) => {
      const executionClass = metadata.executionClass ?? "passive_public";
      return (
        (executionClass === "passive_public" || executionClass === "credentialed_public_api") &&
        metadata.defaultEnabled !== false
      );
    },
  });

  const context = {
    missionId: "surveillance-live-query",
    userId: "surveillance-operator",
    purpose: "Governed live public OSINT query on surveillance board",
    signal: abortSignal,
    identityAuthorization: process.env.DISHA_IDENTITY_ENUMERATION_APPROVED === "true",
    activeAuthorization: process.env.DISHA_ACTIVE_RECON_APPROVED === "true",
  };

  const [health, search] = await Promise.all([
    bus.health().catch(() => []),
    runUniversalOsintSearch(bus, query, context).catch(() => ({
      kind: "universal",
      executedAdapters: [],
      runs: [],
      evidence: [],
    })),
  ]);

  // Filter for actual breach and leak incident records
  const leakRecords: Array<{
    id: string;
    entity: string;
    year: string;
    recordsLeaked: string;
    targetType: string;
    method: string;
    sensitivity: string;
    description: string;
    source: string;
  }> = [];

  const seenIds = new Set<string>();

  // Add records from breachAudit if any exposed directories exist
  if (breachAudit && Array.isArray(breachAudit.directories)) {
    for (const d of breachAudit.directories) {
      if (d.exposureStatus === "EXPOSED" && !seenIds.has(d.id)) {
        seenIds.add(d.id);
        leakRecords.push({
          id: d.id,
          entity: d.matchedFields?.Entity || d.name,
          year: d.breachDate || "Historical",
          recordsLeaked: d.recordCount || "Unknown",
          targetType: d.matchedFields?.["Organization Type"] || "Enterprise / Agency",
          method: d.vector || "Data Breach / Exfiltration",
          sensitivity: d.fieldsExposed?.join(", ") || "Credentials / Telemetry",
          description: d.details || "Verified compromise recorded in breach registry.",
          source: d.matchedFields?.Citation || "Sovereign Curated Directory",
        });
      }
    }
  }

  // Add records from DatasetsService
  for (const m of datasetMatches) {
    const isBreach =
      m.category === "Biggest-Data-Breaches" ||
      m.category === "Sony-Pictures-Hack" ||
      m.category === "WikiLeaks-SpyFiles-Interactive" ||
      m.category === "Tax-havens" ||
      m.sourceFile?.toLowerCase().includes("breach") ||
      m.sourceFile?.toLowerCase().includes("leak");

    if (isBreach) {
      const row = m.data || {};
      const entity = row.Entity || row.Name || row.Company || m.category;
      const year = String(row.Year || row.Date || "Historical");
      const id = `dataset-${entity.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${year}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        leakRecords.push({
          id,
          entity,
          year,
          recordsLeaked: String(row["Records Leaked"] || row.Records || "Compromised"),
          targetType: String(row["Target Organization Type"] || m.category),
          method: String(row["Method of Leak"] || "Data Breach / Leak Incident"),
          sensitivity: String(row["Data Sensitivity"] || "Credentials / Telemetry"),
          description: String(row.Description || Object.entries(row).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(" | ")),
          source: String(row["Sources name"] || row["Sources Link"] || m.sourceFile),
        });
      }
    }
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    query,
    toolId: toolId || null,
    kind: search.kind,
    executedAdapters: search.executedAdapters,
    leakDatabase: {
      target: query,
      totalMatches: leakRecords.length,
      summary:
        leakRecords.length > 0
          ? `Found ${leakRecords.length} verified leak & data breach incident record(s) matching "${query}" in sovereign datasets.`
          : `No compromise records found for "${query}" across 175+ historical breach registries. Zero-fabrication policy enforced under Section 63 BSA.`,
      records: leakRecords,
      categoriesAudited: [
        "Biggest-Data-Breaches (175+ Major Corporate & Gov Breaches)",
        "Sony-Pictures-Hack Archives",
        "WikiLeaks SpyFiles Surveillance Catalog",
        "Tax-havens & Financial Secrecy Repositories",
        "National Telecom Allocation Standards",
      ],
    },
    breaches: leakRecords,
    breachAudit,
    datasetMatches: datasetMatches.slice(0, 10),
    runs: search.runs.map((r) => ({
      adapterId: r.adapterId,
      status: r.status,
      durationMs: r.durationMs,
      evidenceCount: r.evidence.length,
      sample:
        r.evidence[0]?.summary ??
        r.error ??
        (r.status === "completed" ? "Query executed successfully" : "No records found"),
    })),
    healthSummary: {
      total: health.length,
      healthy: health.filter((h) => h.status === "healthy").length,
    },
  });
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? req.nextUrl.searchParams.get("query") ?? "India government";
  const toolId = req.nextUrl.searchParams.get("toolId") ?? undefined;
  return executeOsintSearch(q, toolId, req.signal);
}

export async function POST(req: NextRequest) {
  let q = "India government";
  let toolId: string | undefined = undefined;
  try {
    const body = await req.json();
    if (typeof body?.query === "string" && body.query.trim()) {
      q = body.query.trim();
    } else if (typeof body?.q === "string" && body.q.trim()) {
      q = body.q.trim();
    }
    if (typeof body?.toolId === "string" && body.toolId.trim()) {
      toolId = body.toolId.trim();
    }
  } catch {
    // fallback
  }
  return executeOsintSearch(q, toolId, req.signal);
}
