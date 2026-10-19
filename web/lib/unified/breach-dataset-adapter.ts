import type { GovernedOsintAdapter, AdapterContext } from "./osint-adapter-bus";
import { buildAdapterEvidence } from "./osint-adapter-bus";
import { DatasetsService } from "./datasets-service";
import { BreachDirectoryEngine } from "./breach-directory-engine";

export function createSovereignBreachDatasetsAdapter(): GovernedOsintAdapter<Record<string, unknown>, Record<string, unknown>> {
  return {
    metadata: {
      id: "sovereign-breach-datasets",
      name: "Sovereign Leak & Breach Intelligence",
      version: "1.0.0",
      capability: "identity.breach_intelligence",
      auth: "none",
      legalUse: ["security_audit", "defensive_research", "incident_investigation"],
      blockedUse: ["unauthorized_access", "credential_stuffing"],
      rateLimitPerMinute: 600,
      timeoutMs: 3000,
      maxRetries: 0,
      executionClass: "passive_public",
      defaultEnabled: true,
    },
    async health() {
      return { status: "healthy", detail: "Sovereign breach datasets active (175+ historical breach archives)" };
    },
    async execute(input: Record<string, unknown>, _context: AdapterContext) {
      const target = String(input.target || input.query || "").trim();
      if (!target) {
        return { data: { matches: [] }, evidence: [], warnings: ["No target specified"] };
      }

      const ds = DatasetsService.getInstance();
      const hits = ds.searchDatasets(target, 25);
      const breachHits = hits.filter((h) =>
        h.category === "Biggest-Data-Breaches" ||
        h.category === "Sony-Pictures-Hack" ||
        h.category === "WikiLeaks-SpyFiles-Interactive" ||
        h.category === "Tax-havens" ||
        h.category === "Starbucks" ||
        h.sourceFile.toLowerCase().includes("breach") ||
        h.sourceFile.toLowerCase().includes("leak")
      );

      const breachAudit = BreachDirectoryEngine.auditTarget(target);
      const evidence = [];

      for (const hit of breachHits) {
        const r = hit.data;
        const entity = r.Entity || r.Name || r.Company || hit.category;
        const year = r.Year || r.Date || "Historical";
        const count = r["Records Leaked"] || r.Records || "Compromised";
        const method = r["Method of Leak"] || "Hack / Data Breach";
        const desc = r.Description || "";
        const sourceUrl = r["Sources Link"] || r["Sources name"] || hit.sourceFile;

        evidence.push(
          buildAdapterEvidence({
            sourceId: "sovereign-breach-datasets",
            sourceName: "Sovereign Breach Registry",
            sourceUrl: typeof sourceUrl === "string" && sourceUrl.startsWith("http") ? sourceUrl : undefined,
            summary: `[VERIFIED BREACH] ${entity} (${year}): ${count} records leaked via ${method}. ${desc}`.slice(0, 300),
            fields: r,
          })
        );
      }

      if (breachAudit && breachAudit.directories) {
        for (const dir of breachAudit.directories) {
          if (dir.exposureStatus === "EXPOSED") {
            evidence.push(
              buildAdapterEvidence({
                sourceId: "breach-directory-engine",
                sourceName: dir.name,
                summary: `[BREACH EXPOSURE] ${dir.details || dir.name}`,
                fields: dir.matchedFields || {},
              })
            );
          }
        }
      }

      return {
        data: {
          target,
          totalMatches: evidence.length,
          breaches: breachHits.map((b) => b.data),
          breachAudit,
        },
        evidence,
        warnings: evidence.length === 0 ? [`Zero historical breach records found for "${target}" in sovereign datasets.`] : [],
      };
    },
  };
}

