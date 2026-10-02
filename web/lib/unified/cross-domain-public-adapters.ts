import { safePublicFetch } from "../server/safe-public-fetch";
import {
  buildAdapterEvidence,
  type AdapterContext,
  type GovernedOsintAdapter,
} from "./osint-adapter-bus";

export type CrossDomainFetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type JsonRecord = Record<string, unknown>;

export type NvdCveInput = { cve: string };
export type NvdCveOutput = {
  cve: string;
  found: boolean;
  published?: string;
  lastModified?: string;
  status?: string;
  description?: string;
  cvss: Array<{ version: string; baseScore?: number; severity?: string; vector?: string }>;
  weaknesses: string[];
  references: string[];
};

export type EpssInput = { cve: string };
export type EpssOutput = {
  cve: string;
  found: boolean;
  epss?: number;
  percentile?: number;
  date?: string;
};

export type RipeStatInput = { resource: string };
export type RipeStatOutput = {
  resource: string;
  authorities: string[];
  records: Array<{ key?: string; value?: string; detailsLink?: string }>;
  irrRecords: Array<{ key?: string; value?: string; detailsLink?: string }>;
  queryTime?: string;
};

export type CelestrakInput = { catalogNumber: string };
export type CelestrakOutput = {
  catalogNumber: string;
  objects: Array<{
    objectName?: string;
    objectId?: string;
    noradCatId?: string;
    epoch?: string;
    meanMotion?: number;
    eccentricity?: number;
    inclination?: number;
    classificationType?: string;
  }>;
};

export type ReliefWebInput = { query: string; limit?: number };
export type ReliefWebOutput = {
  query: string;
  reports: Array<{ id?: string; href?: string; title?: string; created?: string; sources: string[] }>;
};

export type NoaaSpaceWeatherInput = { limit?: number };
export type NoaaSpaceWeatherOutput = {
  alerts: Array<{
    productId?: string;
    issueDatetime?: string;
    message?: string;
  }>;
};

function ensurePurpose(context: AdapterContext): void {
  if (!context.purpose.trim()) throw new Error("purpose_required");
}

function normalizeCve(value: string): string {
  const cve = value.trim().toUpperCase();
  if (!/^CVE-\d{4}-\d{4,}$/.test(cve)) throw new Error("invalid_cve");
  return cve;
}

function normalizeRipeResource(value: string): string {
  const resource = value.trim();
  if (/^AS\d{1,10}$/i.test(resource)) return resource.toUpperCase();
  if (isIpAddress(resource)) return resource.toLowerCase();
  throw new Error("invalid_ripe_resource");
}

function normalizeCatalogNumber(value: string): string {
  const catalogNumber = value.trim();
  if (!/^\d{1,9}$/.test(catalogNumber)) throw new Error("invalid_catalog_number");
  return catalogNumber;
}

function isIpAddress(value: string): boolean {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    return value.split(".").every((part) => Number(part) >= 0 && Number(part) <= 255);
  }
  return value.includes(":") && /^[0-9a-f:]+$/i.test(value) && value.length <= 45;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function flattenRipeRecords(value: unknown): Array<{ key?: string; value?: string; detailsLink?: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((group) => {
    if (!Array.isArray(group)) return [];
    return group.slice(0, 80).flatMap((item) => {
      const row = asRecord(item);
      const key = text(row.key);
      const itemValue = text(row.value);
      const detailsLink = text(row.details_link);
      if (!key && !itemValue) return [];
      return [{ key, value: itemValue, detailsLink }];
    });
  }).slice(0, 200);
}

function extractNvdCvss(metrics: unknown): NvdCveOutput["cvss"] {
  const record = asRecord(metrics);
  const result: NvdCveOutput["cvss"] = [];
  for (const [key, value] of Object.entries(record)) {
    if (!key.toLowerCase().startsWith("cvssmetric") || !Array.isArray(value)) continue;
    for (const metric of value.slice(0, 4)) {
      const metricRecord = asRecord(metric);
      const data = asRecord(metricRecord.cvssData);
      const version = text(data.version) ?? key.replace(/^cvssMetric/i, "");
      result.push({
        version,
        baseScore: numberValue(data.baseScore),
        severity: text(data.baseSeverity) ?? text(metricRecord.baseSeverity),
        vector: text(data.vectorString),
      });
    }
  }
  return result.slice(0, 8);
}

export function createNvdCveAdapter(fetcher: CrossDomainFetchLike = safePublicFetch): GovernedOsintAdapter<NvdCveInput, NvdCveOutput> {
  return {
    metadata: {
      id: "public-nvd-cve",
      name: "NIST National Vulnerability Database CVE API",
      version: "1.0.0",
      capability: "official_cve_enrichment",
      auth: "none",
      legalUse: ["Defensive vulnerability enrichment", "CVE metadata verification", "Risk triage"],
      blockedUse: ["Exploit execution", "Unauthorized intrusion", "Credential attacks"],
      rateLimitPerMinute: 5,
      timeoutMs: 9000,
      maxRetries: 1,
      executionClass: "passive_public",
    },
    async health() {
      return { status: "configured" as const, detail: "NVD CVE API 2.0 public endpoint configured; unauthenticated rate limits apply" };
    },
    async execute(input, context) {
      ensurePurpose(context);
      const cve = normalizeCve(input.cve);
      const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cve)}`;
      const response = await fetcher(url, {
        headers: { accept: "application/json", "user-agent": "DISHA-Public-OSINT/1.0" },
        signal: context.signal,
      });
      if (!response.ok) throw new Error(`nvd_http_${response.status}`);
      const body = asRecord(await response.json());
      const vulnerabilities = Array.isArray(body.vulnerabilities) ? body.vulnerabilities : [];
      const cveRecord = asRecord(asRecord(vulnerabilities[0]).cve);
      const descriptions = Array.isArray(cveRecord.descriptions) ? cveRecord.descriptions : [];
      const englishDescription = descriptions
        .map(asRecord)
        .find((item) => text(item.lang)?.toLowerCase() === "en");
      const weaknessGroups = Array.isArray(cveRecord.weaknesses) ? cveRecord.weaknesses : [];
      const weaknesses = weaknessGroups.flatMap((group) => {
        const descriptionsValue = asRecord(group).description;
        return Array.isArray(descriptionsValue)
          ? descriptionsValue.map(asRecord).map((item) => text(item.value)).filter((item): item is string => Boolean(item))
          : [];
      }).slice(0, 20);
      const referencesValue = Array.isArray(cveRecord.references) ? cveRecord.references : [];
      const references = referencesValue.map(asRecord).map((item) => text(item.url)).filter((item): item is string => Boolean(item)).slice(0, 30);
      const data: NvdCveOutput = {
        cve,
        found: Boolean(text(cveRecord.id)),
        published: text(cveRecord.published),
        lastModified: text(cveRecord.lastModified),
        status: text(cveRecord.vulnStatus),
        description: englishDescription ? text(englishDescription.value) : undefined,
        cvss: extractNvdCvss(cveRecord.metrics),
        weaknesses: [...new Set(weaknesses)],
        references,
      };
      return {
        data,
        evidence: [buildAdapterEvidence({
          sourceId: "nvd.nist.gov",
          sourceName: "NIST National Vulnerability Database",
          sourceUrl: url,
          summary: data.found
            ? `NVD returned official vulnerability metadata for ${cve} with ${data.cvss.length} CVSS metric set(s).`
            : `NVD returned no vulnerability record for ${cve}.`,
        })],
        warnings: data.found ? [] : ["No NVD CVE record returned"],
      };
    },
  };
}

export function createEpssAdapter(fetcher: CrossDomainFetchLike = safePublicFetch): GovernedOsintAdapter<EpssInput, EpssOutput> {
  return {
    metadata: {
      id: "public-epss",
      name: "FIRST EPSS",
      version: "1.0.0",
      capability: "cve_exploitation_probability",
      auth: "none",
      legalUse: ["Defensive vulnerability prioritization", "CVE risk enrichment"],
      blockedUse: ["Exploit execution", "Target selection for unauthorized intrusion"],
      rateLimitPerMinute: 30,
      timeoutMs: 7000,
      maxRetries: 1,
      executionClass: "passive_public",
    },
    async health() {
      return { status: "configured" as const, detail: "FIRST EPSS public API endpoint configured" };
    },
    async execute(input, context) {
      ensurePurpose(context);
      const cve = normalizeCve(input.cve);
      const url = `https://api.first.org/data/v1/epss?cve=${encodeURIComponent(cve)}`;
      const response = await fetcher(url, { headers: { accept: "application/json" }, signal: context.signal });
      if (!response.ok) throw new Error(`epss_http_${response.status}`);
      const body = asRecord(await response.json());
      const rows = Array.isArray(body.data) ? body.data : [];
      const row = asRecord(rows[0]);
      const data: EpssOutput = {
        cve,
        found: text(row.cve)?.toUpperCase() === cve,
        epss: numberValue(row.epss),
        percentile: numberValue(row.percentile),
        date: text(row.date),
      };
      return {
        data,
        evidence: [buildAdapterEvidence({
          sourceId: "first-epss",
          sourceName: "FIRST Exploit Prediction Scoring System",
          sourceUrl: url,
          summary: data.found && data.epss !== undefined
            ? `EPSS returned probability ${data.epss} and percentile ${data.percentile ?? "unavailable"} for ${cve}.`
            : `EPSS returned no current score for ${cve}.`,
        })],
        warnings: data.found ? [] : ["No EPSS score returned"],
      };
    },
  };
}

export function createRipeStatWhoisAdapter(fetcher: CrossDomainFetchLike = safePublicFetch): GovernedOsintAdapter<RipeStatInput, RipeStatOutput> {
  return {
    metadata: {
      id: "public-ripestat-whois",
      name: "RIPEstat Whois",
      version: "1.0.0",
      capability: "public_ip_asn_registry_enrichment",
      auth: "none",
      legalUse: ["Public IP/ASN ownership verification", "Routing and registry context", "Defensive infrastructure analysis"],
      blockedUse: ["Unauthorized active scanning", "Private-network discovery", "Credential attacks"],
      rateLimitPerMinute: 30,
      timeoutMs: 8000,
      maxRetries: 1,
      executionClass: "passive_public",
    },
    async health() {
      return { status: "configured" as const, detail: "RIPEstat public Data API configured" };
    },
    async execute(input, context) {
      ensurePurpose(context);
      const resource = normalizeRipeResource(input.resource);
      const url = `https://stat.ripe.net/data/whois/data.json?resource=${encodeURIComponent(resource)}&sourceapp=disha-public-osint`;
      const response = await fetcher(url, { headers: { accept: "application/json" }, signal: context.signal });
      if (!response.ok) throw new Error(`ripestat_http_${response.status}`);
      const body = asRecord(await response.json());
      const payload = asRecord(body.data);
      const data: RipeStatOutput = {
        resource: text(payload.resource) ?? resource,
        authorities: stringArray(payload.authorities).slice(0, 20),
        records: flattenRipeRecords(payload.records),
        irrRecords: flattenRipeRecords(payload.irr_records),
        queryTime: text(payload.query_time),
      };
      return {
        data,
        evidence: [buildAdapterEvidence({
          sourceId: "ripestat-whois",
          sourceName: "RIPEstat Whois",
          sourceUrl: url,
          summary: `RIPEstat returned ${data.records.length} registry field(s) and ${data.irrRecords.length} routing-registry field(s) for ${resource}.`,
        })],
        warnings: data.records.length || data.irrRecords.length ? [] : ["No RIPEstat Whois records returned"],
      };
    },
  };
}

export function createCelestrakGpAdapter(fetcher: CrossDomainFetchLike = safePublicFetch): GovernedOsintAdapter<CelestrakInput, CelestrakOutput> {
  return {
    metadata: {
      id: "public-celestrak-gp",
      name: "CelesTrak General Perturbations",
      version: "1.0.0",
      capability: "public_orbital_element_lookup",
      auth: "none",
      legalUse: ["Public satellite catalog lookup", "Space situational awareness research", "Orbital metadata verification"],
      blockedUse: ["Interference with spacecraft", "Private tracking data acquisition"],
      rateLimitPerMinute: 10,
      timeoutMs: 8000,
      maxRetries: 1,
      executionClass: "passive_public",
    },
    async health() {
      return { status: "configured" as const, detail: "CelesTrak public GP query endpoint configured; requests are bounded and cache-friendly" };
    },
    async execute(input, context) {
      ensurePurpose(context);
      const catalogNumber = normalizeCatalogNumber(input.catalogNumber);
      const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${encodeURIComponent(catalogNumber)}&FORMAT=JSON`;
      const response = await fetcher(url, { headers: { accept: "application/json" }, signal: context.signal });
      if (!response.ok) throw new Error(`celestrak_http_${response.status}`);
      const raw = await response.json();
      const rows = Array.isArray(raw) ? raw.slice(0, 10) : [];
      const objects = rows.map(asRecord).map((row) => ({
        objectName: text(row.OBJECT_NAME),
        objectId: text(row.OBJECT_ID),
        noradCatId: row.NORAD_CAT_ID !== undefined ? String(row.NORAD_CAT_ID) : undefined,
        epoch: text(row.EPOCH),
        meanMotion: numberValue(row.MEAN_MOTION),
        eccentricity: numberValue(row.ECCENTRICITY),
        inclination: numberValue(row.INCLINATION),
        classificationType: text(row.CLASSIFICATION_TYPE),
      }));
      const data: CelestrakOutput = { catalogNumber, objects };
      return {
        data,
        evidence: [buildAdapterEvidence({
          sourceId: "celestrak-gp",
          sourceName: "CelesTrak",
          sourceUrl: url,
          summary: `CelesTrak returned ${objects.length} current GP object record(s) for catalog number ${catalogNumber}.`,
        })],
        warnings: objects.length ? [] : ["No CelesTrak GP record returned"],
      };
    },
  };
}

export function createReliefWebAdapter(
  fetcher: CrossDomainFetchLike = safePublicFetch,
  appName = process.env.RELIEFWEB_APPNAME?.trim(),
): GovernedOsintAdapter<ReliefWebInput, ReliefWebOutput> {
  return {
    metadata: {
      id: "public-reliefweb",
      name: "ReliefWeb API v2",
      version: "1.0.0",
      capability: "humanitarian_public_report_search",
      auth: "api_key",
      legalUse: ["Humanitarian situational awareness", "Disaster-response report discovery", "Public report aggregation"],
      blockedUse: ["Bypassing source copyright or access terms", "Private data acquisition"],
      rateLimitPerMinute: 20,
      timeoutMs: 8000,
      maxRetries: 1,
      executionClass: "credentialed_public_api",
    },
    async health() {
      return appName
        ? { status: "configured" as const, detail: "ReliefWeb approved appname configured" }
        : { status: "not_configured" as const, detail: "RELIEFWEB_APPNAME is required and must be pre-approved by ReliefWeb" };
    },
    async execute(input, context) {
      ensurePurpose(context);
      if (!appName) throw new Error("reliefweb_appname_not_configured");
      const query = input.query.trim().replace(/\s+/g, " ").slice(0, 180);
      if (!query) throw new Error("invalid_reliefweb_query");
      const limit = Math.max(1, Math.min(25, Math.trunc(input.limit ?? 10)));
      const params = new URLSearchParams({
        appname: appName,
        "query[value]": query,
        limit: String(limit),
        profile: "list",
        preset: "latest",
      });
      const url = `https://api.reliefweb.int/v2/reports?${params.toString()}`;
      const response = await fetcher(url, { headers: { accept: "application/json" }, signal: context.signal });
      if (!response.ok) throw new Error(`reliefweb_http_${response.status}`);
      const body = asRecord(await response.json());
      const rows = Array.isArray(body.data) ? body.data.slice(0, limit) : [];
      const reports = rows.map(asRecord).map((row) => {
        const fields = asRecord(row.fields);
        const date = asRecord(fields.date);
        const sourcesValue = Array.isArray(fields.source) ? fields.source : [];
        const sources = sourcesValue
          .map(asRecord)
          .map((source) => text(source.name) ?? text(source.shortname))
          .filter((item): item is string => Boolean(item))
          .slice(0, 10);
        return {
          id: row.id !== undefined ? String(row.id) : undefined,
          href: text(row.href),
          title: text(fields.title),
          created: text(date.created),
          sources,
        };
      });
      return {
        data: { query, reports },
        evidence: [buildAdapterEvidence({
          sourceId: "reliefweb-api",
          sourceName: "ReliefWeb",
          sourceUrl: url,
          summary: `ReliefWeb returned ${reports.length} public humanitarian report record(s) for ${query}.`,
        })],
        warnings: reports.length ? [] : ["No ReliefWeb reports returned"],
      };
    },
  };
}

export function createNoaaSpaceWeatherAdapter(fetcher: CrossDomainFetchLike = safePublicFetch): GovernedOsintAdapter<NoaaSpaceWeatherInput, NoaaSpaceWeatherOutput> {
  return {
    metadata: {
      id: "public-noaa-space-weather",
      name: "NOAA Space Weather Prediction Center Alerts",
      version: "1.0.0",
      capability: "official_space_weather_alerts",
      auth: "none",
      legalUse: ["Space-weather situational awareness", "Geomagnetic and solar-event monitoring", "Operational resilience planning"],
      blockedUse: ["Misrepresentation of forecast certainty"],
      rateLimitPerMinute: 12,
      timeoutMs: 8000,
      maxRetries: 1,
      executionClass: "passive_public",
    },
    async health() {
      return { status: "configured" as const, detail: "NOAA SWPC public machine-readable alerts product configured" };
    },
    async execute(input, context) {
      ensurePurpose(context);
      const limit = Math.max(1, Math.min(50, Math.trunc(input.limit ?? 12)));
      const url = "https://services.swpc.noaa.gov/products/alerts.json";
      const response = await fetcher(url, { headers: { accept: "application/json" }, signal: context.signal });
      if (!response.ok) throw new Error(`noaa_swpc_http_${response.status}`);
      const raw = await response.json();
      const rows = Array.isArray(raw) ? raw.slice(0, limit) : [];
      const alerts = rows.map(asRecord).map((row) => ({
        productId: text(row.product_id) ?? text(row.productId),
        issueDatetime: text(row.issue_datetime) ?? text(row.issueDatetime),
        message: text(row.message),
      }));
      return {
        data: { alerts },
        evidence: [buildAdapterEvidence({
          sourceId: "noaa-swpc-alerts",
          sourceName: "NOAA Space Weather Prediction Center",
          sourceUrl: url,
          summary: `NOAA SWPC returned ${alerts.length} current public space-weather alert/product record(s).`,
        })],
        warnings: alerts.length ? [] : ["No NOAA SWPC alert records returned"],
      };
    },
  };
}
