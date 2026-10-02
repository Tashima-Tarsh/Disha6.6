import { buildAdapterEvidence, type AdapterContext, type GovernedOsintAdapter } from "./osint-adapter-bus";
import { sourceRegistry } from "./source-registry";
import { safePublicFetch } from "../server/safe-public-fetch";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type DnsLookupInput = { domain: string; recordType?: "A" | "AAAA" | "MX" | "NS" | "TXT" | "CNAME" };
export type DnsLookupOutput = { domain: string; recordType: string; answers: Array<{ name?: string; type?: number; TTL?: number; data?: string }> };

export type CertificateLookupInput = { domain: string };
export type CertificateLookupOutput = { domain: string; certificates: Array<{ issuerName?: string; commonName?: string; nameValue?: string; notBefore?: string; notAfter?: string; serialNumber?: string }> };

export type PublicSourceProbeInput = { sourceId: string };
export type PublicSourceProbeOutput = { sourceId: string; sourceName: string; owner: string; domain: string; url: string; ok: boolean; status: number; contentType?: string | null; lastModified?: string | null };

function normalizeDomain(value: string): string {
  const domain = value.trim().toLowerCase().replace(/\.$/, "");
  if (!domain || domain.length > 253 || !/^(?=.{1,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i.test(domain)) {
    throw new Error("invalid_domain");
  }
  return domain;
}

function ensurePublicPurpose(context: AdapterContext): void {
  if (!context.purpose.trim()) throw new Error("purpose_required");
}

export function createPassiveDnsAdapter(fetcher: FetchLike = safePublicFetch): GovernedOsintAdapter<DnsLookupInput, DnsLookupOutput> {
  return {
    metadata: {
      id: "public-dns-google",
      name: "Google Public DNS-over-HTTPS",
      version: "1.0.0",
      capability: "passive_domain_dns_resolution",
      auth: "none",
      legalUse: ["Public DNS resolution", "Infrastructure relationship analysis", "Defensive exposure review"],
      blockedUse: ["Credential attacks", "Unauthorized active scanning", "Covert tracking"],
      rateLimitPerMinute: 60,
      timeoutMs: 5000,
      maxRetries: 1,
    },
    async health() {
      return { status: "configured" as const, detail: "Public passive DNS endpoint configured" };
    },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const domain = normalizeDomain(input.domain);
      const recordType = input.recordType ?? "A";
      const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${recordType}`;
      const response = await fetcher(url, { headers: { accept: "application/dns-json" }, signal: context.signal });
      if (!response.ok) throw new Error(`dns_http_${response.status}`);
      const body = await response.json() as { Answer?: DnsLookupOutput["answers"] };
      const answers = body.Answer ?? [];
      return {
        data: { domain, recordType, answers },
        evidence: [buildAdapterEvidence({ sourceId: "dns.google", sourceName: "Google Public DNS", sourceUrl: url, summary: `${recordType} lookup returned ${answers.length} public DNS answer(s) for ${domain}.` })],
        warnings: answers.length ? [] : ["No DNS answers returned"],
      };
    },
  };
}

export function createCertificateTransparencyAdapter(fetcher: FetchLike = safePublicFetch): GovernedOsintAdapter<CertificateLookupInput, CertificateLookupOutput> {
  return {
    metadata: {
      id: "public-certificate-transparency",
      name: "crt.sh Certificate Transparency",
      version: "1.0.0",
      capability: "public_certificate_transparency",
      auth: "none",
      legalUse: ["Public certificate discovery", "Defensive domain relationship analysis"],
      blockedUse: ["Private key acquisition", "Credential attacks", "Unauthorized exploitation"],
      rateLimitPerMinute: 20,
      timeoutMs: 8000,
      maxRetries: 1,
    },
    async health() {
      return { status: "configured" as const, detail: "Public CT query endpoint configured" };
    },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const domain = normalizeDomain(input.domain);
      const url = `https://crt.sh/?q=${encodeURIComponent(`%.${domain}`)}&output=json`;
      const response = await fetcher(url, { headers: { accept: "application/json" }, signal: context.signal });
      if (!response.ok) throw new Error(`ct_http_${response.status}`);
      const raw = await response.json() as Array<Record<string, unknown>>;
      const seen = new Set<string>();
      const certificates = raw.slice(0, 500).flatMap((item) => {
        const serialNumber = typeof item.serial_number === "string" ? item.serial_number : undefined;
        const key = `${serialNumber ?? ""}|${String(item.name_value ?? "")}|${String(item.not_before ?? "")}`;
        if (seen.has(key)) return [];
        seen.add(key);
        return [{
          issuerName: typeof item.issuer_name === "string" ? item.issuer_name : undefined,
          commonName: typeof item.common_name === "string" ? item.common_name : undefined,
          nameValue: typeof item.name_value === "string" ? item.name_value : undefined,
          notBefore: typeof item.not_before === "string" ? item.not_before : undefined,
          notAfter: typeof item.not_after === "string" ? item.not_after : undefined,
          serialNumber,
        }];
      });
      return {
        data: { domain, certificates },
        evidence: [buildAdapterEvidence({ sourceId: "crt.sh", sourceName: "crt.sh Certificate Transparency", sourceUrl: url, summary: `Public CT query returned ${certificates.length} deduplicated certificate record(s) for ${domain}.` })],
        warnings: certificates.length ? [] : ["No certificate transparency records returned"],
      };
    },
  };
}

export function createOfficialPublicSourceProbeAdapter(fetcher: FetchLike = safePublicFetch): GovernedOsintAdapter<PublicSourceProbeInput, PublicSourceProbeOutput> {
  return {
    metadata: {
      id: "official-public-source-probe",
      name: "DISHA Official Public Source Probe",
      version: "1.0.0",
      capability: "official_public_source_availability",
      auth: "none",
      legalUse: ["Availability checks against allowlisted public government sources", "Source provenance verification"],
      blockedUse: ["Arbitrary URL fetching", "Private-network access", "Credentialed source access"],
      rateLimitPerMinute: 30,
      timeoutMs: 6000,
      maxRetries: 1,
    },
    async health() {
      return { status: "configured" as const, detail: "Government source allowlist loaded" };
    },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const source = sourceRegistry.find((item) => item.sourceId === input.sourceId);
      if (!source) throw new Error("unknown_public_source");
      const endpoint = source.endpoints.find((item) => !item.requiresAuth && item.method === "GET");
      if (!endpoint) throw new Error("no_unauthenticated_get_endpoint");
      const response = await fetcher(endpoint.url, { method: "GET", redirect: "follow", signal: context.signal });
      const data: PublicSourceProbeOutput = {
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        owner: source.owner,
        domain: source.domain,
        url: endpoint.url,
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get("content-type"),
        lastModified: response.headers.get("last-modified"),
      };
      return {
        data,
        evidence: [buildAdapterEvidence({ sourceId: source.sourceId, sourceName: source.sourceName, sourceUrl: endpoint.url, summary: `Official public source availability probe returned HTTP ${response.status}.` })],
        warnings: response.ok ? [] : [`Official source returned HTTP ${response.status}`],
      };
    },
  };
}

export type RdapLookupInput = { query: string; kind?: "domain" | "ip" };
export type RdapLookupOutput = {
  query: string;
  kind: "domain" | "ip";
  handle?: string;
  name?: string;
  status: string[];
  entities: Array<{ handle?: string; roles: string[] }>;
  events: Array<{ action?: string; date?: string }>;
};

export type WaybackLookupInput = { domain: string; limit?: number };
export type WaybackLookupOutput = {
  domain: string;
  snapshots: Array<{ timestamp: string; original: string; statusCode?: string; mimeType?: string; digest?: string }>;
};

export type GdeltSearchInput = { query: string; maxRecords?: number };
export type GdeltSearchOutput = {
  query: string;
  articles: Array<{ title?: string; url?: string; domain?: string; language?: string; sourceCountry?: string; seenDate?: string }>;
};

export type CisaKevLookupInput = { cve?: string; vendor?: string; product?: string; limit?: number };
export type CisaKevLookupOutput = {
  matched: Array<{
    cveID?: string;
    vendorProject?: string;
    product?: string;
    vulnerabilityName?: string;
    dateAdded?: string;
    shortDescription?: string;
    requiredAction?: string;
    dueDate?: string;
    knownRansomwareCampaignUse?: string;
  }>;
};

export type GithubRepositoryInput = { repository: string };
export type GithubRepositoryOutput = {
  repository: string;
  fullName?: string;
  description?: string;
  htmlUrl?: string;
  archived?: boolean;
  disabled?: boolean;
  pushedAt?: string;
  updatedAt?: string;
  stars?: number;
  forks?: number;
  openIssues?: number;
  license?: string;
  topics: string[];
};

function normalizeIp(value: string): string {
  const input = value.trim();
  const ipv4 = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  const ipv6 = /^[0-9a-f:]+$/i;
  if (!ipv4.test(input) && !(input.includes(":") && ipv6.test(input))) throw new Error("invalid_ip");
  return input;
}

function normalizeTextQuery(value: string, maxLength = 512): string {
  const query = value.trim();
  if (!query || query.length > maxLength) throw new Error("invalid_query");
  return query;
}

function normalizeCve(value: string): string {
  const cve = value.trim().toUpperCase();
  if (!/^CVE-\d{4}-\d{4,}$/.test(cve)) throw new Error("invalid_cve");
  return cve;
}

function normalizeRepository(value: string): string {
  const repository = value.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error("invalid_repository");
  return repository;
}

export function createRdapAdapter(fetcher: FetchLike = safePublicFetch): GovernedOsintAdapter<RdapLookupInput, RdapLookupOutput> {
  return {
    metadata: {
      id: "public-rdap",
      name: "RDAP Registration Data",
      version: "1.0.0",
      capability: "public_registration_data",
      auth: "none",
      legalUse: ["Public domain/IP registration lookup", "Infrastructure ownership research", "Defensive attribution support"],
      blockedUse: ["Credential attacks", "Private account access", "Harassment or stalking"],
      rateLimitPerMinute: 30,
      timeoutMs: 8000,
      maxRetries: 1,
      executionClass: "passive_public",
      defaultEnabled: true,
    },
    async health() { return { status: "configured" as const, detail: "Public RDAP bootstrap endpoint configured" }; },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const requestedKind = input.kind;
      const kind = requestedKind ?? (input.query.includes(":") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(input.query.trim()) ? "ip" : "domain");
      const query = kind === "ip" ? normalizeIp(input.query) : normalizeDomain(input.query);
      const url = `https://rdap.org/${kind}/${encodeURIComponent(query)}`;
      const response = await fetcher(url, { headers: { accept: "application/rdap+json, application/json" }, signal: context.signal });
      if (!response.ok) throw new Error(`rdap_http_${response.status}`);
      const body = await response.json() as Record<string, unknown>;
      const entities = Array.isArray(body.entities) ? body.entities.slice(0, 100).map((item) => {
        const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return { handle: typeof row.handle === "string" ? row.handle : undefined, roles: Array.isArray(row.roles) ? row.roles.filter((v): v is string => typeof v === "string") : [] };
      }) : [];
      const events = Array.isArray(body.events) ? body.events.slice(0, 100).map((item) => {
        const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return { action: typeof row.eventAction === "string" ? row.eventAction : undefined, date: typeof row.eventDate === "string" ? row.eventDate : undefined };
      }) : [];
      const data: RdapLookupOutput = {
        query,
        kind,
        handle: typeof body.handle === "string" ? body.handle : undefined,
        name: typeof body.name === "string" ? body.name : undefined,
        status: Array.isArray(body.status) ? body.status.filter((v): v is string => typeof v === "string") : [],
        entities,
        events,
      };
      return { data, evidence: [buildAdapterEvidence({ sourceId: "rdap.org", sourceName: "RDAP.org", sourceUrl: url, summary: `Public RDAP lookup completed for ${kind} ${query}.` })] };
    },
  };
}

export function createWaybackAdapter(fetcher: FetchLike = safePublicFetch): GovernedOsintAdapter<WaybackLookupInput, WaybackLookupOutput> {
  return {
    metadata: {
      id: "public-wayback-cdx",
      name: "Internet Archive Wayback CDX",
      version: "1.0.0",
      capability: "public_web_archive_history",
      auth: "none",
      legalUse: ["Historical public-web research", "Source change verification", "Public-domain timeline reconstruction"],
      blockedUse: ["Private content access", "Authentication bypass", "Credential harvesting"],
      rateLimitPerMinute: 20,
      timeoutMs: 10000,
      maxRetries: 1,
      executionClass: "passive_public",
      defaultEnabled: true,
    },
    async health() { return { status: "configured" as const, detail: "Internet Archive CDX endpoint configured" }; },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const domain = normalizeDomain(input.domain);
      const limit = Math.max(1, Math.min(100, Math.trunc(input.limit ?? 50)));
      const params = new URLSearchParams({ url: `*.${domain}/*`, output: "json", filter: "statuscode:200", limit: String(limit), fl: "timestamp,original,statuscode,mimetype,digest" });
      params.append("filter", "collapse:digest");
      const url = `https://web.archive.org/cdx/search/cdx?${params.toString()}`;
      const response = await fetcher(url, { headers: { accept: "application/json" }, signal: context.signal });
      if (!response.ok) throw new Error(`wayback_http_${response.status}`);
      const rows = await response.json() as unknown;
      const values = Array.isArray(rows) ? rows.slice(1, limit + 1) : [];
      const snapshots = values.flatMap((row) => {
        if (!Array.isArray(row) || typeof row[0] !== "string" || typeof row[1] !== "string") return [];
        return [{ timestamp: row[0], original: row[1], statusCode: typeof row[2] === "string" ? row[2] : undefined, mimeType: typeof row[3] === "string" ? row[3] : undefined, digest: typeof row[4] === "string" ? row[4] : undefined }];
      });
      return {
        data: { domain, snapshots },
        evidence: [buildAdapterEvidence({ sourceId: "internet-archive-cdx", sourceName: "Internet Archive Wayback Machine", sourceUrl: url, summary: `Wayback CDX returned ${snapshots.length} archived public-web snapshot(s) for ${domain}.` })],
        warnings: snapshots.length ? [] : ["No archived snapshots returned"],
      };
    },
  };
}

export function createGdeltNewsAdapter(fetcher: FetchLike = safePublicFetch): GovernedOsintAdapter<GdeltSearchInput, GdeltSearchOutput> {
  return {
    metadata: {
      id: "public-gdelt-news",
      name: "GDELT DOC 2.0",
      version: "1.0.0",
      capability: "global_public_news_search",
      auth: "none",
      legalUse: ["Public news discovery", "Event monitoring", "Open-source trend analysis"],
      blockedUse: ["Private communications", "Credential access", "Targeted harassment"],
      rateLimitPerMinute: 20,
      timeoutMs: 10000,
      maxRetries: 1,
      executionClass: "passive_public",
      defaultEnabled: true,
    },
    async health() { return { status: "configured" as const, detail: "GDELT DOC API configured" }; },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const query = normalizeTextQuery(input.query, 512);
      const maxRecords = Math.max(1, Math.min(100, Math.trunc(input.maxRecords ?? 50)));
      const params = new URLSearchParams({ query, mode: "ArtList", maxrecords: String(maxRecords), format: "json", sort: "HybridRel" });
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`;
      const response = await fetcher(url, { headers: { accept: "application/json" }, signal: context.signal });
      if (!response.ok) throw new Error(`gdelt_http_${response.status}`);
      const body = await response.json() as { articles?: Array<Record<string, unknown>> };
      const articles = (body.articles ?? []).slice(0, maxRecords).map((row) => ({
        title: typeof row.title === "string" ? row.title : undefined,
        url: typeof row.url === "string" ? row.url : undefined,
        domain: typeof row.domain === "string" ? row.domain : undefined,
        language: typeof row.language === "string" ? row.language : undefined,
        sourceCountry: typeof row.sourcecountry === "string" ? row.sourcecountry : undefined,
        seenDate: typeof row.seendate === "string" ? row.seendate : undefined,
      }));
      return {
        data: { query, articles },
        evidence: [buildAdapterEvidence({ sourceId: "gdelt-doc-2", sourceName: "GDELT Project", sourceUrl: url, summary: `GDELT public-news query returned ${articles.length} article record(s).` })],
        warnings: articles.length ? [] : ["No GDELT articles returned"],
      };
    },
  };
}

export function createCisaKevAdapter(fetcher: FetchLike = safePublicFetch): GovernedOsintAdapter<CisaKevLookupInput, CisaKevLookupOutput> {
  const feedUrl = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
  return {
    metadata: {
      id: "public-cisa-kev",
      name: "CISA Known Exploited Vulnerabilities",
      version: "1.0.0",
      capability: "public_vulnerability_intelligence",
      auth: "none",
      legalUse: ["Defensive vulnerability prioritization", "Public threat-intelligence enrichment", "Patch-risk analysis"],
      blockedUse: ["Exploit delivery", "Unauthorized intrusion", "Weaponization"],
      rateLimitPerMinute: 10,
      timeoutMs: 10000,
      maxRetries: 1,
      executionClass: "passive_public",
      defaultEnabled: true,
    },
    async health() { return { status: "configured" as const, detail: "CISA KEV public JSON feed configured" }; },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const cve = input.cve ? normalizeCve(input.cve) : undefined;
      const vendor = input.vendor ? normalizeTextQuery(input.vendor, 128).toLowerCase() : undefined;
      const product = input.product ? normalizeTextQuery(input.product, 128).toLowerCase() : undefined;
      if (!cve && !vendor && !product) throw new Error("kev_filter_required");
      const limit = Math.max(1, Math.min(100, Math.trunc(input.limit ?? 50)));
      const response = await fetcher(feedUrl, { headers: { accept: "application/json" }, signal: context.signal });
      if (!response.ok) throw new Error(`cisa_kev_http_${response.status}`);
      const body = await response.json() as { vulnerabilities?: Array<Record<string, unknown>> };
      const matched = (body.vulnerabilities ?? []).filter((row) => {
        const rowCve = typeof row.cveID === "string" ? row.cveID.toUpperCase() : "";
        const rowVendor = typeof row.vendorProject === "string" ? row.vendorProject.toLowerCase() : "";
        const rowProduct = typeof row.product === "string" ? row.product.toLowerCase() : "";
        return (!cve || rowCve === cve) && (!vendor || rowVendor.includes(vendor)) && (!product || rowProduct.includes(product));
      }).slice(0, limit).map((row) => ({
        cveID: typeof row.cveID === "string" ? row.cveID : undefined,
        vendorProject: typeof row.vendorProject === "string" ? row.vendorProject : undefined,
        product: typeof row.product === "string" ? row.product : undefined,
        vulnerabilityName: typeof row.vulnerabilityName === "string" ? row.vulnerabilityName : undefined,
        dateAdded: typeof row.dateAdded === "string" ? row.dateAdded : undefined,
        shortDescription: typeof row.shortDescription === "string" ? row.shortDescription : undefined,
        requiredAction: typeof row.requiredAction === "string" ? row.requiredAction : undefined,
        dueDate: typeof row.dueDate === "string" ? row.dueDate : undefined,
        knownRansomwareCampaignUse: typeof row.knownRansomwareCampaignUse === "string" ? row.knownRansomwareCampaignUse : undefined,
      }));
      return {
        data: { matched },
        evidence: [buildAdapterEvidence({ sourceId: "cisa-kev", sourceName: "CISA Known Exploited Vulnerabilities Catalog", sourceUrl: feedUrl, summary: `CISA KEV lookup returned ${matched.length} matching public vulnerability record(s).` })],
        warnings: matched.length ? [] : ["No matching CISA KEV record returned"],
      };
    },
  };
}

export function createGithubRepositoryAdapter(fetcher: FetchLike = safePublicFetch): GovernedOsintAdapter<GithubRepositoryInput, GithubRepositoryOutput> {
  return {
    metadata: {
      id: "public-github-repository",
      name: "GitHub Public Repository Metadata",
      version: "1.0.0",
      capability: "open_source_project_verification",
      auth: "none",
      legalUse: ["Public repository verification", "Upstream project/license review", "OSINT tool provenance"],
      blockedUse: ["Private repository access", "Credential/token discovery", "Secret harvesting"],
      rateLimitPerMinute: 20,
      timeoutMs: 8000,
      maxRetries: 1,
      executionClass: "passive_public",
      defaultEnabled: true,
      upstreamRepository: "https://github.com/github/rest-api-description",
    },
    async health() { return { status: "configured" as const, detail: "GitHub public REST endpoint configured; unauthenticated rate limits apply" }; },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const repository = normalizeRepository(input.repository);
      const url = `https://api.github.com/repos/${repository}`;
      const response = await fetcher(url, { headers: { accept: "application/vnd.github+json", "user-agent": "DISHA-OSINT/6.6" }, signal: context.signal });
      if (!response.ok) throw new Error(`github_http_${response.status}`);
      const body = await response.json() as Record<string, unknown>;
      const licenseRow = body.license && typeof body.license === "object" ? body.license as Record<string, unknown> : {};
      const data: GithubRepositoryOutput = {
        repository,
        fullName: typeof body.full_name === "string" ? body.full_name : undefined,
        description: typeof body.description === "string" ? body.description : undefined,
        htmlUrl: typeof body.html_url === "string" ? body.html_url : undefined,
        archived: typeof body.archived === "boolean" ? body.archived : undefined,
        disabled: typeof body.disabled === "boolean" ? body.disabled : undefined,
        pushedAt: typeof body.pushed_at === "string" ? body.pushed_at : undefined,
        updatedAt: typeof body.updated_at === "string" ? body.updated_at : undefined,
        stars: typeof body.stargazers_count === "number" ? body.stargazers_count : undefined,
        forks: typeof body.forks_count === "number" ? body.forks_count : undefined,
        openIssues: typeof body.open_issues_count === "number" ? body.open_issues_count : undefined,
        license: typeof licenseRow.spdx_id === "string" ? licenseRow.spdx_id : undefined,
        topics: Array.isArray(body.topics) ? body.topics.filter((v): v is string => typeof v === "string") : [],
      };
      return { data, evidence: [buildAdapterEvidence({ sourceId: `github:${repository}`, sourceName: "GitHub Public Repository API", sourceUrl: url, summary: `Retrieved public repository metadata for ${repository}.` })] };
    },
  };
}

export type CommonCrawlInput = { domain: string; limit?: number };
export type CommonCrawlOutput = { domain: string; indexId: string; captures: Array<{ url?: string; timestamp?: string; status?: string; mime?: string; digest?: string }> };

export function createCommonCrawlAdapter(fetcher: FetchLike = safePublicFetch): GovernedOsintAdapter<CommonCrawlInput, CommonCrawlOutput> {
  return {
    metadata: {
      id: "public-common-crawl",
      name: "Common Crawl Index",
      version: "1.0.0",
      capability: "web_scale_public_archive_index",
      auth: "none",
      legalUse: ["Historical public-web discovery", "Public source provenance", "Domain change analysis"],
      blockedUse: ["Private content access", "Credential harvesting", "Authentication bypass"],
      rateLimitPerMinute: 10,
      timeoutMs: 12000,
      maxRetries: 1,
      executionClass: "passive_public",
      defaultEnabled: true,
    },
    async health() { return { status: "configured" as const, detail: "Common Crawl index discovery configured" }; },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const domain = normalizeDomain(input.domain);
      const limit = Math.max(1, Math.min(100, Math.trunc(input.limit ?? 50)));
      const catalogUrl = "https://index.commoncrawl.org/collinfo.json";
      const catalogResponse = await fetcher(catalogUrl, { headers: { accept: "application/json" }, signal: context.signal });
      if (!catalogResponse.ok) throw new Error(`commoncrawl_catalog_http_${catalogResponse.status}`);
      const catalog = await catalogResponse.json() as Array<Record<string, unknown>>;
      const latest = catalog.find((row) => typeof row.id === "string" && typeof row["cdx-api"] === "string");
      if (!latest) throw new Error("commoncrawl_index_unavailable");
      const indexId = String(latest.id);
      const api = String(latest["cdx-api"]);
      const params = new URLSearchParams({ url: `*.${domain}/*`, output: "json", filter: "status:200", pageSize: String(limit) });
      const url = `${api}?${params.toString()}`;
      const response = await fetcher(url, { headers: { accept: "application/x-ndjson,text/plain" }, signal: context.signal });
      if (!response.ok) throw new Error(`commoncrawl_http_${response.status}`);
      const lines = (await response.text()).split(/\r?\n/).filter(Boolean).slice(0, limit);
      const captures = lines.flatMap((line) => {
        try {
          const row = JSON.parse(line) as Record<string, unknown>;
          return [{
            url: typeof row.url === "string" ? row.url : undefined,
            timestamp: typeof row.timestamp === "string" ? row.timestamp : undefined,
            status: typeof row.status === "string" ? row.status : undefined,
            mime: typeof row.mime === "string" ? row.mime : undefined,
            digest: typeof row.digest === "string" ? row.digest : undefined,
          }];
        } catch { return []; }
      });
      return {
        data: { domain, indexId, captures },
        evidence: [buildAdapterEvidence({ sourceId: `commoncrawl:${indexId}`, sourceName: "Common Crawl Index", sourceUrl: url, summary: `Common Crawl returned ${captures.length} public capture record(s) for ${domain}.` })],
        warnings: captures.length ? [] : ["No Common Crawl captures returned"],
      };
    },
  };
}

export type SecCompanyInput = { cik: string };
export type SecCompanyOutput = { cik: string; name?: string; tickers: string[]; exchanges: string[]; sic?: string; stateOfIncorporation?: string; filings: Array<{ accessionNumber?: string; filingDate?: string; reportDate?: string; form?: string; primaryDocument?: string }> };

export function createSecEdgarAdapter(fetcher: FetchLike = safePublicFetch): GovernedOsintAdapter<SecCompanyInput, SecCompanyOutput> {
  return {
    metadata: {
      id: "public-sec-edgar",
      name: "SEC EDGAR Submissions",
      version: "1.0.0",
      capability: "public_company_filing_intelligence",
      auth: "none",
      legalUse: ["Public company filing research", "Corporate timeline analysis", "Official filing provenance"],
      blockedUse: ["Non-public filings", "Credentialed access", "Personal-data enrichment outside public filings"],
      rateLimitPerMinute: 8,
      timeoutMs: 10000,
      maxRetries: 1,
      executionClass: "passive_public",
      defaultEnabled: true,
    },
    async health() { return { status: process.env.SEC_USER_AGENT ? "configured" as const : "degraded" as const, detail: process.env.SEC_USER_AGENT ? "SEC user-agent configured" : "Set SEC_USER_AGENT with a contact string before production use" }; },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const digits = input.cik.replace(/\D/g, "");
      if (!digits || digits.length > 10) throw new Error("invalid_cik");
      const cik = digits.padStart(10, "0");
      const userAgent = process.env.SEC_USER_AGENT?.trim();
      if (!userAgent) throw new Error("sec_user_agent_required");
      const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
      const response = await fetcher(url, { headers: { accept: "application/json", "user-agent": userAgent }, signal: context.signal });
      if (!response.ok) throw new Error(`sec_edgar_http_${response.status}`);
      const body = await response.json() as Record<string, unknown>;
      const filingsRoot = body.filings && typeof body.filings === "object" ? body.filings as Record<string, unknown> : {};
      const recent = filingsRoot.recent && typeof filingsRoot.recent === "object" ? filingsRoot.recent as Record<string, unknown> : {};
      const accession = Array.isArray(recent.accessionNumber) ? recent.accessionNumber : [];
      const filingDate = Array.isArray(recent.filingDate) ? recent.filingDate : [];
      const reportDate = Array.isArray(recent.reportDate) ? recent.reportDate : [];
      const form = Array.isArray(recent.form) ? recent.form : [];
      const primaryDocument = Array.isArray(recent.primaryDocument) ? recent.primaryDocument : [];
      const filings = accession.slice(0, 100).map((value, i) => ({
        accessionNumber: typeof value === "string" ? value : undefined,
        filingDate: typeof filingDate[i] === "string" ? filingDate[i] as string : undefined,
        reportDate: typeof reportDate[i] === "string" ? reportDate[i] as string : undefined,
        form: typeof form[i] === "string" ? form[i] as string : undefined,
        primaryDocument: typeof primaryDocument[i] === "string" ? primaryDocument[i] as string : undefined,
      }));
      const data: SecCompanyOutput = {
        cik,
        name: typeof body.name === "string" ? body.name : undefined,
        tickers: Array.isArray(body.tickers) ? body.tickers.filter((v): v is string => typeof v === "string") : [],
        exchanges: Array.isArray(body.exchanges) ? body.exchanges.filter((v): v is string => typeof v === "string") : [],
        sic: typeof body.sic === "string" ? body.sic : undefined,
        stateOfIncorporation: typeof body.stateOfIncorporation === "string" ? body.stateOfIncorporation : undefined,
        filings,
      };
      return { data, evidence: [buildAdapterEvidence({ sourceId: `sec-edgar:${cik}`, sourceName: "U.S. SEC EDGAR", sourceUrl: url, summary: `Retrieved SEC submissions metadata and ${filings.length} recent filing record(s) for CIK ${cik}.` })] };
    },
  };
}

export type OpenAlexInput = { query: string; limit?: number };
export type OpenAlexOutput = { query: string; works: Array<{ id?: string; doi?: string; title?: string; publicationYear?: number; citedByCount?: number; type?: string; primaryLocation?: string }> };

export function createOpenAlexAdapter(fetcher: FetchLike = safePublicFetch): GovernedOsintAdapter<OpenAlexInput, OpenAlexOutput> {
  return {
    metadata: {
      id: "public-openalex",
      name: "OpenAlex Works",
      version: "1.0.0",
      capability: "scholarly_public_graph_search",
      auth: "none",
      legalUse: ["Scientific literature discovery", "Citation-aware research", "Public scholarly graph enrichment"],
      blockedUse: ["Paywall bypass", "Private manuscript access", "Fabricated citation claims"],
      rateLimitPerMinute: 30,
      timeoutMs: 10000,
      maxRetries: 1,
      executionClass: "passive_public",
      defaultEnabled: true,
    },
    async health() { return { status: "configured" as const, detail: "OpenAlex public API configured" }; },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const query = normalizeTextQuery(input.query, 512);
      const limit = Math.max(1, Math.min(100, Math.trunc(input.limit ?? 25)));
      const params = new URLSearchParams({ search: query, "per-page": String(limit) });
      if (process.env.OPENALEX_MAILTO?.trim()) params.set("mailto", process.env.OPENALEX_MAILTO.trim());
      const url = `https://api.openalex.org/works?${params.toString()}`;
      const response = await fetcher(url, { headers: { accept: "application/json" }, signal: context.signal });
      if (!response.ok) throw new Error(`openalex_http_${response.status}`);
      const body = await response.json() as { results?: Array<Record<string, unknown>> };
      const works = (body.results ?? []).slice(0, limit).map((row) => {
        const primary = row.primary_location && typeof row.primary_location === "object" ? row.primary_location as Record<string, unknown> : {};
        return {
          id: typeof row.id === "string" ? row.id : undefined,
          doi: typeof row.doi === "string" ? row.doi : undefined,
          title: typeof row.display_name === "string" ? row.display_name : undefined,
          publicationYear: typeof row.publication_year === "number" ? row.publication_year : undefined,
          citedByCount: typeof row.cited_by_count === "number" ? row.cited_by_count : undefined,
          type: typeof row.type === "string" ? row.type : undefined,
          primaryLocation: typeof primary.landing_page_url === "string" ? primary.landing_page_url : undefined,
        };
      });
      return { data: { query, works }, evidence: [buildAdapterEvidence({ sourceId: "openalex", sourceName: "OpenAlex", sourceUrl: url, summary: `OpenAlex returned ${works.length} public scholarly work record(s).` })], warnings: works.length ? [] : ["No OpenAlex works returned"] };
    },
  };
}

export type WorldBankInput = { country: string; indicator: string; limit?: number };
export type WorldBankOutput = { country: string; indicator: string; observations: Array<{ date?: string; value?: number | null; country?: string; indicator?: string }> };

export function createWorldBankAdapter(fetcher: FetchLike = safePublicFetch): GovernedOsintAdapter<WorldBankInput, WorldBankOutput> {
  return {
    metadata: {
      id: "public-world-bank",
      name: "World Bank Indicators",
      version: "1.0.0",
      capability: "public_macroeconomic_indicator_query",
      auth: "none",
      legalUse: ["Macroeconomic research", "Country indicator timelines", "Public development-data analysis"],
      blockedUse: ["Fabricating missing observations", "Treating modeled estimates as observed facts without metadata"],
      rateLimitPerMinute: 30,
      timeoutMs: 10000,
      maxRetries: 1,
      executionClass: "passive_public",
      defaultEnabled: true,
    },
    async health() { return { status: "configured" as const, detail: "World Bank v2 API configured" }; },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const country = normalizeTextQuery(input.country, 32).replace(/[^a-z0-9-]/gi, "");
      const indicator = normalizeTextQuery(input.indicator, 80).replace(/[^A-Z0-9_.-]/gi, "");
      if (!country || !indicator) throw new Error("invalid_world_bank_query");
      const limit = Math.max(1, Math.min(200, Math.trunc(input.limit ?? 60)));
      const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(country)}/indicator/${encodeURIComponent(indicator)}?format=json&per_page=${limit}`;
      const response = await fetcher(url, { headers: { accept: "application/json" }, signal: context.signal });
      if (!response.ok) throw new Error(`world_bank_http_${response.status}`);
      const body = await response.json() as unknown;
      const rows = Array.isArray(body) && Array.isArray(body[1]) ? body[1] as Array<Record<string, unknown>> : [];
      const observations = rows.slice(0, limit).map((row) => {
        const countryRow = row.country && typeof row.country === "object" ? row.country as Record<string, unknown> : {};
        const indicatorRow = row.indicator && typeof row.indicator === "object" ? row.indicator as Record<string, unknown> : {};
        return {
          date: typeof row.date === "string" ? row.date : undefined,
          value: typeof row.value === "number" || row.value === null ? row.value as number | null : undefined,
          country: typeof countryRow.value === "string" ? countryRow.value : undefined,
          indicator: typeof indicatorRow.value === "string" ? indicatorRow.value : undefined,
        };
      });
      return { data: { country, indicator, observations }, evidence: [buildAdapterEvidence({ sourceId: `world-bank:${indicator}`, sourceName: "World Bank Indicators API", sourceUrl: url, summary: `World Bank returned ${observations.length} public observation(s) for ${country}/${indicator}.` })], warnings: observations.length ? [] : ["No World Bank observations returned"] };
    },
  };
}

export type WikidataSearchInput = { query: string; language?: string; limit?: number };
export type WikidataSearchOutput = { query: string; entities: Array<{ id?: string; label?: string; description?: string; conceptUri?: string }> };

export function createWikidataSearchAdapter(fetcher: FetchLike = safePublicFetch): GovernedOsintAdapter<WikidataSearchInput, WikidataSearchOutput> {
  return {
    metadata: {
      id: "public-wikidata-search",
      name: "Wikidata Entity Search",
      version: "1.0.0",
      capability: "public_entity_resolution_enrichment",
      auth: "none",
      legalUse: ["Entity discovery", "Alias resolution", "Public knowledge-graph enrichment"],
      blockedUse: ["Treating Wikidata as authoritative for contested claims", "Private-person enrichment beyond public knowledge data"],
      rateLimitPerMinute: 30,
      timeoutMs: 8000,
      maxRetries: 1,
      executionClass: "passive_public",
      defaultEnabled: true,
    },
    async health() { return { status: "configured" as const, detail: "Wikidata search API configured" }; },
    async execute(input, context) {
      ensurePublicPurpose(context);
      const query = normalizeTextQuery(input.query, 256);
      const language = (input.language ?? "en").toLowerCase().replace(/[^a-z-]/g, "").slice(0, 12) || "en";
      const limit = Math.max(1, Math.min(50, Math.trunc(input.limit ?? 10)));
      const params = new URLSearchParams({ action: "wbsearchentities", search: query, language, format: "json", limit: String(limit), origin: "*" });
      const url = `https://www.wikidata.org/w/api.php?${params.toString()}`;
      const response = await fetcher(url, { headers: { accept: "application/json", "user-agent": "DISHA-OSINT/6.6" }, signal: context.signal });
      if (!response.ok) throw new Error(`wikidata_http_${response.status}`);
      const body = await response.json() as { search?: Array<Record<string, unknown>> };
      const entities = (body.search ?? []).slice(0, limit).map((row) => ({
        id: typeof row.id === "string" ? row.id : undefined,
        label: typeof row.label === "string" ? row.label : undefined,
        description: typeof row.description === "string" ? row.description : undefined,
        conceptUri: typeof row.concepturi === "string" ? row.concepturi : undefined,
      }));
      return { data: { query, entities }, evidence: [buildAdapterEvidence({ sourceId: "wikidata", sourceName: "Wikidata", sourceUrl: url, summary: `Wikidata returned ${entities.length} entity candidate(s) for resolution.` })], warnings: entities.length ? ["Wikidata is an enrichment source; verify consequential claims against primary sources."] : ["No Wikidata entity candidates returned"] };
    },
  };
}
