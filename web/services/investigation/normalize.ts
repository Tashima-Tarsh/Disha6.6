import { createHash, randomUUID } from "node:crypto";
import { safeSourceUrl, type AdapterPlan, type Investigation, type InvestigationEvidence } from "../../lib/investigation/types";
import type { AdapterExecutionResult } from "../../lib/unified/osint-adapter-bus";

export const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

export const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.slice(0, 2000) : undefined;

const identifier = (value: unknown): string | undefined =>
  text(value) ?? (typeof value === "number" && Number.isFinite(value) ? String(value) : undefined);

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const arrayKeys: Record<string, string> = {
  "public-dns-google": "answers",
  "public-certificate-transparency": "certificates",
  "public-wayback-cdx": "snapshots",
  "public-common-crawl": "captures",
  "public-gdelt-news": "articles",
  "public-cisa-kev": "matched",
  "public-ripestat-whois": "records",
  "public-wikidata-search": "entities",
  "public-openalex": "works",
  "public-celestrak-gp": "objects",
  "public-reliefweb": "reports",
  "public-brave-search": "records",
  "passive-shodan": "records",
  "public-nhtsa-vin": "records",
  "public-india-vehicle-format": "records",
  "public-threatfox": "records",
  "public-malwarebazaar": "records",
  "public-opensanctions": "records",
  "public-opencorporates": "records",
  "service-opencti": "records",
  "service-intelowl": "records",
  "openosint-mcp": "records",
  "openosint-dns": "records",
  "openosint-rdap": "records",
  "openosint-whois": "records",
  "openosint-dorks": "records",
  "openosint-ip": "records",
  "openosint-github": "records",
  "openosint-breach": "records",
  "openosint-github-forensics": "evidenceItems",
};

function astraRows(plan: AdapterPlan, data: Record<string, unknown>): Record<string, unknown>[] | undefined {
  const wrapped = record(data.result);
  const payload = Object.keys(wrapped).length ? wrapped : data;

  if (["astra6-sherlock", "astra6-maigret", "astra6-holehe"].includes(plan.adapterId)) {
    return Array.isArray(payload.found) ? payload.found.map(record) : [];
  }

  if (["astra6-instaloader", "astra6-telegram-public"].includes(plan.adapterId)) {
    return Array.isArray(payload.records) ? payload.records.map(record) : [];
  }

  if (["astra6-mrholmes", "astra6-user-scanner"].includes(plan.adapterId)) {
    if (Array.isArray(payload.records)) return payload.records.map(record);
    if (Array.isArray(payload.found)) return payload.found.map(record);
    if (Array.isArray(payload.results)) return payload.results.map(record);
    return Object.keys(payload).length ? [payload] : [];
  }

  if (plan.adapterId === "astra6-phoneinfoga") {
    const reputation = Array.isArray(payload.reputation) ? payload.reputation : [];
    const meaningful = payload.valid === true
      || Boolean(text(payload.number) || text(payload.carrier) || text(payload.country) || text(payload.lineType))
      || reputation.length > 0;
    return meaningful ? [payload] : [];
  }

  if (plan.adapterId === "astra6-theharvester") {
    const rows: Record<string, unknown>[] = [];
    for (const [kind, value] of [
      ["email", payload.emails],
      ["host", payload.hosts],
      ["ip", payload.ips],
      ["subdomain", payload.subdomains],
      ["url", payload.urls],
    ] as const) {
      if (!Array.isArray(value)) continue;
      for (const item of value) {
        if (typeof item === "string" && item.trim()) rows.push({ kind, value: item.trim() });
      }
    }
    return rows;
  }

  if (plan.adapterId === "astra6-subfinder" || plan.adapterId === "astra6-owasp-amass") {
    return Array.isArray(payload.subdomains) ? payload.subdomains.map(record) : [];
  }

  if (plan.adapterId === "astra6-spiderfoot") {
    return Array.isArray(payload.events) ? payload.events.map(record) : [];
  }

  if (plan.adapterId === "astra6-recon-ng") {
    return Array.isArray(payload.hosts) ? payload.hosts.map(record) : [];
  }

  if (plan.adapterId === "astra6-photon") {
    return Array.isArray(payload.records) ? payload.records.map(record) : [];
  }

  return undefined;
}

export function normalizeRecords(plan: AdapterPlan, result: AdapterExecutionResult<unknown>): InvestigationEvidence[] {
  if (result.status !== "completed" && result.status !== "partial") return [];

  const data = record(result.data);
  const customAstraRows = plan.adapterId.startsWith("astra6-") ? astraRows(plan, data) : undefined;
  const key = arrayKeys[plan.adapterId];
  let rows: Record<string, unknown>[] = [];

  if (customAstraRows) rows = customAstraRows;
  else if (key) rows = Array.isArray(data[key]) ? (data[key] as unknown[]).map(record) : [];
  else if (plan.adapterId === "public-rdap") {
    rows = data.handle || data.name || (Array.isArray(data.entities) && data.entities.length) ? [data] : [];
  } else if (["public-nvd-cve", "public-epss"].includes(plan.adapterId)) {
    rows = data.found === true ? [data] : [];
  }

  const source = result.evidence[0];
  return rows.filter((row) => Object.keys(row).length > 0).slice(0, 50).map((row) => {
    const evidenceId = randomUUID();
    const providerRecordId =
      identifier(row.id)
      ?? text(row.number)
      ?? text(row.e164)
      ?? identifier(row.cveID)
      ?? text(row.noradCatId)
      ?? text(row.handle)
      ?? text(row.serialNumber)
      ?? text(row.url)
      ?? text(row.host)
      ?? text(row.ioc)
      ?? text(row.sha256_hash)
      ?? text(row.sha1_hash)
      ?? text(row.md5_hash)
      ?? text(row.company_number)
      ?? text(row.uid)
      ?? text(row.registration)
      ?? text(row.vin);

    const sourceUrl =
      safeSourceUrl(row.sourceUrl)
      ?? safeSourceUrl(row.url)
      ?? safeSourceUrl(row.conceptUri)
      ?? safeSourceUrl(row.original)
      ?? safeSourceUrl(row.href)
      ?? safeSourceUrl(source?.sourceUrl);

    const observedAt =
      text(row.timestamp)
      ?? text(row.seenDate)
      ?? text(row.epoch)
      ?? text(row.published)
      ?? text(row.date)
      ?? text(row.notBefore)
      ?? text(row.last_update);

    const phoneSummary = (text(row.number) || text(row.e164))
      ? `Phone ${text(row.number) ?? text(row.e164)} (${text(row.country) ?? "IN"}): Valid ${row.valid === false ? "No" : "Yes"}${text(row.carrier) ? ` · Carrier: ${text(row.carrier)}` : ""}${text(row.localFormat) ? ` · Format: ${text(row.localFormat)}` : ""}`
      : undefined;

    const entitySummary = (text(row.label) && text(row.description))
      ? `${text(row.label)} · ${text(row.description)}`
      : undefined;

    const summary =
      text(row.summary)
      ?? phoneSummary
      ?? entitySummary
      ?? text(row.title)
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
      ?? text(row.registration)
      ?? text(row.vin)
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
      corroborationState: "unverified" as const,
      contradictionState: "not_assessed" as const,
      fields: row,
    };
  });
}

export function appendEvidence(investigation: Investigation, plan: AdapterPlan, rows: InvestigationEvidence[]) {
  for (const evidence of rows) {
    investigation.evidence.push(evidence);
    investigation.edges.push({
      id: randomUUID(),
      sourceId: evidence.evidenceId,
      targetId: plan.adapterId,
      type: "RETURNED_BY",
      evidenceId: evidence.evidenceId,
    });

    const candidateAdapters = ["public-wikidata-search", "public-opensanctions", "public-opencorporates"];
    if (
      ["person_name", "company"].includes(investigation.targetType)
      && candidateAdapters.includes(plan.adapterId)
      && evidence.providerRecordId
    ) {
      const candidateId = randomUUID();
      evidence.candidateId = candidateId;
      investigation.candidateClusters.push({
        candidateId,
        label: evidence.summary,
        status: "POSSIBLE_MATCH",
        attributes: {
          providerRecordId: evidence.providerRecordId,
          description: text(evidence.fields.description) ?? text(evidence.fields.schema) ?? text(evidence.fields.position) ?? "",
          source: evidence.sourceName,
        },
        evidenceIds: [evidence.evidenceId],
      });
      investigation.edges.push({
        id: randomUUID(),
        sourceId: candidateId,
        targetId: evidence.evidenceId,
        type: "SOURCED_FROM",
        evidenceId: evidence.evidenceId,
      });
    }
  }
}
