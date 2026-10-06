import { safePublicFetch } from "../server/safe-public-fetch";
import {
  buildAdapterEvidence,
  type GovernedOsintAdapter,
} from "./osint-adapter-bus";

type EntityRecords = {
  records: Record<string, unknown>[];
};

type OpenSanctionsInput = {
  query: string;
  schema: "Person" | "Company";
};

type OpenCorporatesInput = {
  query: string;
  kind: "company" | "officer";
};

async function boundedJson(response: Response, maxBytes = 3_000_000): Promise<Record<string, unknown>> {
  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("provider_empty_body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error("provider_response_too_large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {};
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function objectRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map(record).filter(row => Object.keys(row).length > 0)
    : [];
}

export function createOpenSanctionsAdapter(
  fetcher: typeof safePublicFetch = safePublicFetch,
): GovernedOsintAdapter<OpenSanctionsInput, EntityRecords> {
  return {
    metadata: {
      id: "public-opensanctions",
      name: "OpenSanctions Search API",
      version: "1.0.0",
      capability: "public_sanctions_pep_entity_search",
      auth: "api_key",
      legalUse: ["Public sanctions research", "PEP/entity discovery", "Public-interest entity research"],
      blockedUse: ["Automatic adverse decisions", "Unsupported identity assertions", "Bulk private profiling"],
      rateLimitPerMinute: 20,
      timeoutMs: 15_000,
      maxRetries: 1,
      executionClass: "credentialed_public_api",
      defaultEnabled: true,
    },
    async health() {
      return process.env.OPENSANCTIONS_API_KEY
        ? { status: "healthy" as const, detail: "OpenSanctions API key configured" }
        : { status: "not_configured" as const, detail: "OPENSANCTIONS_API_KEY is not configured" };
    },
    async execute(input, context) {
      const key = process.env.OPENSANCTIONS_API_KEY;
      if (!key) throw new Error("not_configured");
      const query = input.query.trim();
      if (!query || query.length > 300) throw new Error("invalid_entity_query");

      const url = new URL("https://api.opensanctions.org/search/default");
      url.searchParams.set("q", query);
      url.searchParams.set("limit", "20");
      url.searchParams.set("schema", input.schema);
      url.searchParams.set("simple", "true");

      const response = await fetcher(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `ApiKey ${key}`,
        },
        signal: context.signal,
      });
      const json = await boundedJson(response);
      const rows = objectRows(json.results).slice(0, 20);

      return {
        data: { records: rows },
        evidence: rows.length ? [buildAdapterEvidence({
          sourceId: "opensanctions",
          sourceName: "OpenSanctions",
          sourceUrl: "https://www.opensanctions.org/",
          summary: `OpenSanctions returned ${rows.length} public entity-search candidate(s). Search relevance is not identity-match confidence.`,
        })] : [],
        warnings: rows.length
          ? ["OpenSanctions search ranking is discovery relevance, not proof that the returned entity is the investigation target."]
          : ["OpenSanctions returned no entity-search candidates."],
      };
    },
  };
}

export function createOpenCorporatesAdapter(
  fetcher: typeof safePublicFetch = safePublicFetch,
): GovernedOsintAdapter<OpenCorporatesInput, EntityRecords> {
  return {
    metadata: {
      id: "public-opencorporates",
      name: "OpenCorporates API",
      version: "1.0.0",
      capability: "public_company_and_officer_search",
      auth: "api_key",
      legalUse: ["Public company lookup", "Public officer/company relationship discovery", "Corporate registry research"],
      blockedUse: ["Unsupported identity merging", "Private-data enrichment", "Automated adverse decisions"],
      rateLimitPerMinute: 10,
      timeoutMs: 15_000,
      maxRetries: 1,
      executionClass: "credentialed_public_api",
      defaultEnabled: true,
    },
    async health() {
      return process.env.OPENCORPORATES_API_TOKEN
        ? { status: "healthy" as const, detail: "OpenCorporates API token configured" }
        : { status: "not_configured" as const, detail: "OPENCORPORATES_API_TOKEN is not configured" };
    },
    async execute(input, context) {
      const token = process.env.OPENCORPORATES_API_TOKEN;
      if (!token) throw new Error("not_configured");
      const query = input.query.trim();
      if (!query || query.length > 300) throw new Error("invalid_entity_query");

      const path = input.kind === "officer" ? "/v0.4/officers/search" : "/v0.4/companies/search";
      const url = new URL(path, "https://api.opencorporates.com");
      url.searchParams.set("q", query);
      url.searchParams.set("order", "score");
      url.searchParams.set("per_page", "20");
      url.searchParams.set("api_token", token);

      const response = await fetcher(url, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: context.signal,
      });
      const json = await boundedJson(response);
      const results = record(json.results);
      const wrappers = objectRows(input.kind === "officer" ? results.officers : results.companies);
      const rows = wrappers
        .map(wrapper => record(wrapper[input.kind]))
        .filter(row => Object.keys(row).length > 0)
        .slice(0, 20);

      return {
        data: { records: rows },
        evidence: rows.length ? [buildAdapterEvidence({
          sourceId: "opencorporates",
          sourceName: "OpenCorporates",
          sourceUrl: "https://opencorporates.com/",
          summary: `OpenCorporates returned ${rows.length} public ${input.kind} candidate record(s).`,
        })] : [],
        warnings: rows.length
          ? ["Name search results are candidate public records and must be corroborated before identity association."]
          : ["OpenCorporates returned no matching public records."],
      };
    },
  };
}
