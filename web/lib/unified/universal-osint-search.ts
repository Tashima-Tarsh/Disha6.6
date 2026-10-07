import type {
  AdapterContext,
  AdapterEvidence,
  AdapterExecutionResult,
  OsintAdapterBus,
} from "./osint-adapter-bus";

export type UniversalOsintQueryKind =
  | "domain"
  | "ip"
  | "cve"
  | "asn"
  | "norad_id"
  | "space_weather"
  | "humanitarian_topic"
  | "github_repository"
  | "sec_cik"
  | "email"
  | "phone"
  | "username"
  | "entity";

export type UniversalOsintPlanItem = {
  adapterId: string;
  input: Record<string, unknown>;
  reason: string;
};

export type UniversalOsintPlan = {
  query: string;
  normalizedTarget: string;
  kind: UniversalOsintQueryKind;
  runs: UniversalOsintPlanItem[];
  blockedCapabilities: string[];
};

export type UniversalOsintEvidenceHit = AdapterEvidence & {
  adapterId: string;
  evidenceClass: "official" | "registry" | "public_archive" | "public_reporting" | "discovery";
};

export type UniversalOsintRun = {
  adapterId: string;
  status: AdapterExecutionResult<unknown>["status"];
  durationMs: number;
  attempts: number;
  warnings: string[];
  error?: string;
  evidence: AdapterEvidence[];
  data?: unknown;
};

export type UniversalOsintSearchResult = {
  query: string;
  normalizedTarget: string;
  kind: UniversalOsintQueryKind;
  executedAdapters: string[];
  blockedCapabilities: string[];
  runs: UniversalOsintRun[];
  evidence: UniversalOsintEvidenceHit[];
  warnings: string[];
};

export function classifyUniversalOsintQuery(value: string): {
  kind: UniversalOsintQueryKind;
  normalizedTarget: string;
} {
  const query = sanitizeUniversalQuery(value);
  const lower = query.toLowerCase();

  const github = normalizeGithubRepository(query);
  if (github) return { kind: "github_repository", normalizedTarget: github };

  const cve = query.match(/^cve-\d{4}-\d{4,}$/i);
  if (cve) return { kind: "cve", normalizedTarget: cve[0].toUpperCase() };

  const cik = query.match(/^cik\s*[:#-]?\s*(\d{1,10})$/i);
  if (cik) return { kind: "sec_cik", normalizedTarget: cik[1] };

  const asn = query.match(/^as\s*[:#-]?\s*(\d{1,10})$/i);
  if (asn) return { kind: "asn", normalizedTarget: `AS${asn[1]}` };

  const norad = query.match(/^(?:norad|catnr|catalog)\s*[:#-]?\s*(\d{1,9})$/i);
  if (norad) return { kind: "norad_id", normalizedTarget: norad[1] };

  if (/^(?:space weather|geomagnetic storm|solar storm|solar flare|aurora forecast|noaa swpc)$/i.test(query)) {
    return { kind: "space_weather", normalizedTarget: query };
  }

  if (/\b(?:earthquake|flood|cyclone|hurricane|wildfire|disaster|humanitarian|refugee|drought|landslide)\b/i.test(query)) {
    return { kind: "humanitarian_topic", normalizedTarget: query };
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query)) {
    return { kind: "email", normalizedTarget: lower };
  }

  if (/^@[A-Za-z0-9_.-]{2,64}$/.test(query)) {
    return { kind: "username", normalizedTarget: query };
  }

  const urlDomain = normalizeUrlDomain(query);
  if (urlDomain) return { kind: "domain", normalizedTarget: urlDomain };

  if (isIpAddress(query)) return { kind: "ip", normalizedTarget: lower };

  if (isDomain(query)) return { kind: "domain", normalizedTarget: lower.replace(/\.$/, "") };

  if (/^\+?[1-9][0-9\s().-]{7,20}$/.test(query)) {
    return { kind: "phone", normalizedTarget: query.replace(/[\s().-]/g, "") };
  }

  return { kind: "entity", normalizedTarget: query };
}

export function buildUniversalOsintPlan(value: string): UniversalOsintPlan {
  const query = sanitizeUniversalQuery(value);
  const classified = classifyUniversalOsintQuery(query);
  const blockedCapabilities = [
    "Active reconnaissance and exploitation are not executed by Universal Search.",
    "Private, credential-gated, leaked, or non-public datasets are not queried.",
  ];

  let runs: UniversalOsintPlanItem[];

  switch (classified.kind) {
    case "domain":
      runs = [
        { adapterId: "public-dns-google", input: { domain: classified.normalizedTarget, recordType: "A" }, reason: "Resolve current public DNS records." },
        { adapterId: "public-certificate-transparency", input: { domain: classified.normalizedTarget }, reason: "Find public certificate-transparency relationships." },
        { adapterId: "public-rdap", input: { query: classified.normalizedTarget, kind: "domain" }, reason: "Retrieve public domain registration metadata." },
        { adapterId: "public-wayback-cdx", input: { domain: classified.normalizedTarget, limit: 25 }, reason: "Find public historical web captures." },
        { adapterId: "public-common-crawl", input: { domain: classified.normalizedTarget, limit: 25 }, reason: "Find public web-crawl captures." },
        { adapterId: "public-gdelt-news", input: { query: classified.normalizedTarget, maxRecords: 20 }, reason: "Find public reporting mentioning the domain." },
      ];
      break;
    case "ip":
      runs = [
        { adapterId: "public-rdap", input: { query: classified.normalizedTarget, kind: "ip" }, reason: "Retrieve public IP registration metadata." },
        { adapterId: "public-ripestat-whois", input: { resource: classified.normalizedTarget }, reason: "Retrieve RIR and routing-registry context from RIPEstat." },
        { adapterId: "public-gdelt-news", input: { query: classified.normalizedTarget, maxRecords: 20 }, reason: "Find public reporting mentioning the IP." },
      ];
      break;
    case "cve":
      runs = [
        { adapterId: "public-cisa-kev", input: { cve: classified.normalizedTarget, limit: 50 }, reason: "Check the official CISA Known Exploited Vulnerabilities catalog." },
        { adapterId: "public-nvd-cve", input: { cve: classified.normalizedTarget }, reason: "Retrieve official NVD CVE metadata and CVSS context." },
        { adapterId: "public-epss", input: { cve: classified.normalizedTarget }, reason: "Retrieve FIRST EPSS exploitation-probability context." },
        { adapterId: "public-gdelt-news", input: { query: classified.normalizedTarget, maxRecords: 20 }, reason: "Find public reporting mentioning the vulnerability." },
      ];
      break;
    case "asn":
      runs = [
        { adapterId: "public-ripestat-whois", input: { resource: classified.normalizedTarget }, reason: "Retrieve public ASN registry and routing-registry context." },
        { adapterId: "public-gdelt-news", input: { query: classified.normalizedTarget, maxRecords: 20 }, reason: "Find public reporting mentioning the ASN." },
      ];
      break;
    case "norad_id":
      runs = [
        { adapterId: "public-celestrak-gp", input: { catalogNumber: classified.normalizedTarget }, reason: "Retrieve current public orbital elements from CelesTrak." },
        { adapterId: "public-gdelt-news", input: { query: `NORAD ${classified.normalizedTarget}`, maxRecords: 20 }, reason: "Find public reporting mentioning the catalog object." },
      ];
      break;
    case "space_weather":
      runs = [
        { adapterId: "public-noaa-space-weather", input: { limit: 12 }, reason: "Retrieve official NOAA SWPC public alerts." },
        { adapterId: "public-gdelt-news", input: { query: classified.normalizedTarget, maxRecords: 20 }, reason: "Find public reporting about the space-weather event." },
      ];
      break;
    case "humanitarian_topic":
      runs = [
        { adapterId: "public-reliefweb", input: { query: classified.normalizedTarget, limit: 10 }, reason: "Search configured ReliefWeb public humanitarian reports." },
        { adapterId: "public-gdelt-news", input: { query: classified.normalizedTarget, maxRecords: 20 }, reason: "Find current public reporting about the humanitarian topic." },
      ];
      break;
    case "github_repository":
      runs = [
        { adapterId: "public-github-repository", input: { repository: classified.normalizedTarget }, reason: "Verify public GitHub repository metadata and licensing." },
        { adapterId: "public-gdelt-news", input: { query: classified.normalizedTarget, maxRecords: 20 }, reason: "Find public reporting mentioning the repository." },
      ];
      break;
    case "sec_cik":
      runs = [
        { adapterId: "public-sec-edgar", input: { cik: classified.normalizedTarget }, reason: "Retrieve official SEC company submission metadata." },
        { adapterId: "public-gdelt-news", input: { query: `CIK ${classified.normalizedTarget}`, maxRecords: 20 }, reason: "Find public reporting mentioning the filing identifier." },
      ];
      break;
    case "email":
    case "phone":
    case "username":
      blockedCapabilities.push(
        "Cross-site identity enumeration is intentionally disabled in the default DISHA OSINT bus.",
      );
      runs = [
        { adapterId: "public-gdelt-news", input: { query: classified.normalizedTarget, maxRecords: 20 }, reason: "Search public reporting only; no cross-site account enumeration." },
      ];
      break;
    case "entity":
    default:
      runs = [
        { adapterId: "public-wikidata-search", input: { query: classified.normalizedTarget, language: "en", limit: 12 }, reason: "Find public knowledge-graph entities." },
        { adapterId: "public-openalex", input: { query: classified.normalizedTarget, limit: 12 }, reason: "Find public scholarly-graph references." },
        { adapterId: "public-gdelt-news", input: { query: classified.normalizedTarget, maxRecords: 20 }, reason: "Find current public reporting." },
      ];
      break;
  }

  return {
    query,
    normalizedTarget: classified.normalizedTarget,
    kind: classified.kind,
    runs,
    blockedCapabilities,
  };
}

export async function runUniversalOsintSearch(
  bus: OsintAdapterBus,
  value: string,
  context: AdapterContext,
): Promise<UniversalOsintSearchResult> {
  const plan = buildUniversalOsintPlan(value);
  const results = await Promise.all(
    plan.runs.map(async (item) => ({
      item,
      result: await bus.run<Record<string, unknown>, unknown>(item.adapterId, item.input, context),
    })),
  );

  const runs: UniversalOsintRun[] = results.map(({ item, result }) => ({
    adapterId: item.adapterId,
    status: result.status,
    durationMs: result.durationMs,
    attempts: result.attempts,
    warnings: result.warnings,
    error: result.error,
    evidence: result.evidence,
    data: result.data,
  }));

  const evidence = runs.flatMap((run) =>
    run.evidence.map((item) => ({
      ...item,
      adapterId: run.adapterId,
      evidenceClass: evidenceClassForAdapter(run.adapterId),
    })),
  );

  const warnings = runs.flatMap((run) => [
    ...run.warnings,
    ...(run.error ? [`${run.adapterId}: ${run.error}`] : []),
  ]);

  return {
    query: plan.query,
    normalizedTarget: plan.normalizedTarget,
    kind: plan.kind,
    executedAdapters: runs.map((run) => run.adapterId),
    blockedCapabilities: plan.blockedCapabilities,
    runs,
    evidence,
    warnings: [...new Set(warnings)].slice(0, 30),
  };
}

export function sanitizeUniversalQuery(value: string): string {
  const compact = value.trim().replace(/\s+/g, " ");
  if (!compact) throw new Error("query_required");
  return compact.slice(0, 180);
}

function evidenceClassForAdapter(adapterId: string): UniversalOsintEvidenceHit["evidenceClass"] {
  if (["public-cisa-kev", "public-sec-edgar", "public-nvd-cve", "public-noaa-space-weather"].includes(adapterId)) return "official";
  if (["public-dns-google", "public-certificate-transparency", "public-rdap", "public-ripestat-whois", "public-github-repository", "public-celestrak-gp"].includes(adapterId)) return "registry";
  if (["public-wayback-cdx", "public-common-crawl"].includes(adapterId)) return "public_archive";
  if (["public-gdelt-news", "public-reliefweb"].includes(adapterId)) return "public_reporting";
  return "discovery";
}

function normalizeGithubRepository(value: string): string | null {
  const trimmed = value.trim().replace(/\/+$/, "");
  const urlMatch = trimmed.match(/^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/.*)?$/i);
  if (urlMatch) return `${urlMatch[1]}/${urlMatch[2].replace(/\.git$/i, "")}`;
  const shortMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!shortMatch) return null;
  return `${shortMatch[1]}/${shortMatch[2].replace(/\.git$/i, "")}`;
}

function normalizeUrlDomain(value: string): string | null {
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    return isDomain(hostname) ? hostname : null;
  } catch {
    return null;
  }
}

function isDomain(value: string): boolean {
  const domain = value.trim().toLowerCase().replace(/\.$/, "");
  return domain.length <= 253
    && /^(?=.{1,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i.test(domain);
}

function isIpAddress(value: string): boolean {
  const input = value.trim();
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(input)) {
    return input.split(".").every((part) => Number(part) >= 0 && Number(part) <= 255);
  }
  return input.includes(":") && /^[0-9a-f:]+$/i.test(input) && input.length <= 45;
}
