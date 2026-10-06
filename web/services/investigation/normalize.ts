import { createHash, randomUUID } from "node:crypto";
import { safeSourceUrl, type AdapterPlan, type Investigation, type InvestigationEvidence } from "../../lib/investigation/types";
import type { AdapterExecutionResult } from "../../lib/unified/osint-adapter-bus";

export const record = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
export const text = (v: unknown): string | undefined => typeof v === "string" && v.trim() ? v.slice(0, 2000) : undefined;
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");

const arrayKeys: Record<string, string> = {
  "public-dns-google": "answers", "public-certificate-transparency": "certificates", "public-wayback-cdx": "snapshots",
  "public-common-crawl": "captures", "public-gdelt-news": "articles", "public-cisa-kev": "matched", "public-ripestat-whois": "records",
  "public-wikidata-search": "entities", "public-openalex": "works", "public-celestrak-gp": "objects", "public-reliefweb": "reports",
  "public-brave-search": "records", "passive-shodan": "records", "google-vision-web": "records",\n  "public-threatfox": "records", "public-malwarebazaar": "records", "public-opensanctions": "records", "public-opencorporates": "records",
  "astra6-sherlock": "found", "astra6-spiderfoot": "events", "astra6-owasp-amass": "subdomains", "astra6-subfinder": "subdomains",
};

function astraRows(plan: AdapterPlan, data: Record<string, unknown>): Record<string, unknown>[] | undefined {
  if (plan.adapterId === "astra6-phoneinfoga") {
    const reputation = Array.isArray(data.reputation) ? data.reputation : [];
    const meaningful = data.valid === true || Boolean(text(data.carrier) || text(data.country) || text(data.lineType)) || reputation.length > 0;
    return meaningful ? [data] : [];
  }

  if (plan.adapterId === "astra6-theharvester") {
    const rows: Record<string, unknown>[] = [];
    for (const [kind, value] of [
      ["email", data.emails],
      ["host", data.hosts],
      ["ip", data.ips],
      ["subdomain", data.subdomains],
      ["url", data.urls],
    ] as const) {
      if (!Array.isArray(value)) continue;
      for (const item of value) if (typeof item === "string" && item.trim()) rows.push({ kind, value: item.trim() });
    }
    return rows;
  }

  return undefined;
}

export function normalizeRecords(plan: AdapterPlan, result: AdapterExecutionResult<unknown>): InvestigationEvidence[] {
  if (result.status !== "completed" && result.status !== "partial") return [];
  const data = record(result.data);
  let rows: Record<string, unknown>[] = [];
  const customAstraRows = astraRows(plan, data);
  const key = arrayKeys[plan.adapterId];

  if (customAstraRows) rows = customAstraRows;
  else if (key) rows = Array.isArray(data[key]) ? (data[key] as unknown[]).map(record) : [];
  else if (plan.adapterId === "public-rdap") rows = data.handle || data.name || (Array.isArray(data.entities) && data.entities.length) ? [data] : [];
  else if (["public-nvd-cve", "public-epss"].includes(plan.adapterId)) rows = data.found === true ? [data] : [];

  // Lookup summaries are not results. Unknown data shapes are never promoted.
  const source = result.evidence[0];
  return rows.filter(row => Object.keys(row).length > 0).slice(0, 50).map(row => {
    const evidenceId = randomUUID();
    const providerRecordId =
      text(row.id)
      ?? text(row.cveID)
      ?? text(row.noradCatId)
      ?? text(row.handle)
      ?? text(row.serialNumber)
      ?? text(row.url)
      ?? text(row.host)
      ?? text(row.ioc)
      ?? text(row.sha256_hash)
      ?? text(row.sha1_hash)
      ?? text(row.md5_hash)\n      ?? text(row.company_number)\n      ?? text(row.uid);
    const sourceUrl =
      safeSourceUrl(row.sourceUrl)
      ?? safeSourceUrl(row.url)
      ?? safeSourceUrl(row.conceptUri)
      ?? safeSourceUrl(row.original)
      ?? safeSourceUrl(row.href)
      ?? safeSourceUrl(source?.sourceUrl);
    const observedAt = text(row.timestamp) ?? text(row.seenDate) ?? text(row.epoch) ?? text(row.published) ?? text(row.date) ?? text(row.notBefore) ?? text(row.last_update);
    const summary =
      text(row.title)
      ?? text(row.label)
      ?? text(row.description)
      ?? text(row.objectName)
      ?? text(row.commonName)
      ?? text(row.name)
      ?? text(row.site)
      ?? text(row.host)
      ?? text(row.eventType)
      ?? text(row.ioc)
      ?? text(row.threat_type_desc)
      ?? text(row.malware_printable)
      ?? text(row.signature)
      ?? text(row.value)
      ?? text(row.data)
      ?? text(row.original)
      ?? text(row.ip_str)
      ?? providerRecordId
      ?? `${plan.sourceName} record`;
    const retrievedAt = source?.retrievedAt ?? new Date().toISOString();
    const contentHash = hash(row);
    return {
      evidenceId,
      sourceId: source?.sourceId ?? plan.adapterId,
      sourceName: source?.sourceName ?? plan.sourceName,
      adapterId: plan.adapterId,
      sourceUrl,
      providerRecordId,
      observedAt,
      retrievedAt,
      summary,
      contentHash,
      provenanceHash: hash({ evidenceId, sourceUrl, retrievedAt, contentHash, adapterId: plan.adapterId }),
      corroborationState: "unverified",
      contradictionState: "not_assessed",
      fields: row,
    };
  });
}

export function appendEvidence(investigation: Investigation, plan: AdapterPlan, rows: InvestigationEvidence[]) {
  for (const evidence of rows) {
    investigation.evidence.push(evidence);
    investigation.edges.push({ id: randomUUID(), sourceId: evidence.evidenceId, targetId: plan.adapterId, type: "RETURNED_BY", evidenceId: evidence.evidenceId });
    // Only an explicit provider entity ID can form an identity candidate. News/web mentions are not identities.
    if (["person_name", "company"].includes(investigation.targetType) && plan.adapterId === "public-wikidata-search" && evidence.providerRecordId) {
      const candidateId = randomUUID();
      evidence.candidateId = candidateId;
      investigation.candidateClusters.push({ candidateId, label: evidence.summary, status: "POSSIBLE_MATCH", attributes: { providerRecordId: evidence.providerRecordId, description: text(evidence.fields.description) ?? "", source: evidence.sourceName }, evidenceIds: [evidence.evidenceId] });
      investigation.edges.push({ id: randomUUID(), sourceId: candidateId, targetId: evidence.evidenceId, type: "SOURCED_FROM", evidenceId: evidence.evidenceId });
    }
  }
}
