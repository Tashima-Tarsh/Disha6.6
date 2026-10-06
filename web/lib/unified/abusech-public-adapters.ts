import { safePublicFetch } from "../server/safe-public-fetch";
import {
  buildAdapterEvidence,
  type GovernedOsintAdapter,
} from "./osint-adapter-bus";

type ThreatFoxInput = {
  value: string;
  kind: "ioc" | "file_hash";
};

type MalwareBazaarInput = {
  hash: string;
};

type CtiRecords = {
  records: Record<string, unknown>[];
  queryStatus?: string;
};

async function boundedJson(response: Response, maxBytes = 2_000_000): Promise<Record<string, unknown>> {
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

  const text = Buffer.concat(chunks).toString("utf8");
  const parsed: unknown = JSON.parse(text);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {};
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(item => item && typeof item === "object" && !Array.isArray(item)) as Record<string, unknown>[]
    : [];
}

export function createThreatFoxAdapter(fetcher: typeof safePublicFetch = safePublicFetch): GovernedOsintAdapter<ThreatFoxInput, CtiRecords> {
  return {
    metadata: {
      id: "public-threatfox",
      name: "ThreatFox Community API",
      version: "1.0.0",
      capability: "defensive_ioc_enrichment",
      auth: "api_key",
      legalUse: ["Defensive IOC lookup", "Malware-family context", "Public threat-intelligence enrichment"],
      blockedUse: ["IOC submission", "Private-data enrichment", "Active scanning", "Exploit delivery"],
      rateLimitPerMinute: 20,
      timeoutMs: 15_000,
      maxRetries: 1,
      executionClass: "credentialed_public_api",
      defaultEnabled: true,
    },
    async health() {
      return process.env.THREATFOX_AUTH_KEY
        ? { status: "healthy" as const, detail: "ThreatFox Auth-Key configured" }
        : { status: "not_configured" as const, detail: "THREATFOX_AUTH_KEY is not configured" };
    },
    async execute(input, context) {
      const key = process.env.THREATFOX_AUTH_KEY;
      if (!key) throw new Error("not_configured");
      const value = input.value.trim();
      if (!value || value.length > 2048) throw new Error("invalid_ioc");

      if (input.kind === "file_hash" && ![32, 64].includes(value.length)) {
        return {
          data: { records: [], queryStatus: "unsupported_hash_type" },
          evidence: [],
          warnings: ["ThreatFox file-hash search supports MD5 and SHA-256; no request was sent for this hash length."],
        };
      }

      const body = input.kind === "file_hash"
        ? { query: "search_hash", hash: value }
        : { query: "search_ioc", search_term: value, exact_match: true };

      const response = await fetcher("https://threatfox-api.abuse.ch/api/v1/", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "Auth-Key": key,
        },
        body: JSON.stringify(body),
        signal: context.signal,
      });
      const json = await boundedJson(response);
      const rows = records(json.data).slice(0, 100);
      const queryStatus = typeof json.query_status === "string" ? json.query_status : undefined;

      return {
        data: { records: rows, queryStatus },
        evidence: rows.length ? [buildAdapterEvidence({
          sourceId: "threatfox",
          sourceName: "ThreatFox",
          sourceUrl: "https://threatfox.abuse.ch/",
          summary: `ThreatFox returned ${rows.length} public threat-intelligence record(s) for the submitted indicator.`,
        })] : [],
        warnings: rows.length ? [] : [`ThreatFox returned no records (${queryStatus ?? "unknown status"}).`],
      };
    },
  };
}

export function createMalwareBazaarAdapter(fetcher: typeof safePublicFetch = safePublicFetch): GovernedOsintAdapter<MalwareBazaarInput, CtiRecords> {
  return {
    metadata: {
      id: "public-malwarebazaar",
      name: "MalwareBazaar Community API",
      version: "1.0.0",
      capability: "defensive_hash_metadata_lookup",
      auth: "api_key",
      legalUse: ["Defensive malware hash lookup", "Public sample metadata enrichment"],
      blockedUse: ["Malware sample download", "Malware submission", "Execution or detonation", "Private-file submission"],
      rateLimitPerMinute: 20,
      timeoutMs: 15_000,
      maxRetries: 1,
      executionClass: "credentialed_public_api",
      defaultEnabled: true,
    },
    async health() {
      return process.env.MALWAREBAZAAR_AUTH_KEY
        ? { status: "healthy" as const, detail: "MalwareBazaar Auth-Key configured" }
        : { status: "not_configured" as const, detail: "MALWAREBAZAAR_AUTH_KEY is not configured" };
    },
    async execute(input, context) {
      const key = process.env.MALWAREBAZAAR_AUTH_KEY;
      if (!key) throw new Error("not_configured");
      const hash = input.hash.trim().toLowerCase();
      if (![32, 40, 64].includes(hash.length) || !/^[a-f0-9]+$/.test(hash)) throw new Error("invalid_hash");

      const form = new URLSearchParams({ query: "get_info", hash });
      const response = await fetcher("https://mb-api.abuse.ch/api/v1/", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
          "Auth-Key": key,
        },
        body: form.toString(),
        signal: context.signal,
      });
      const json = await boundedJson(response);
      const rows = records(json.data).slice(0, 50);
      const queryStatus = typeof json.query_status === "string" ? json.query_status : undefined;

      return {
        data: { records: rows, queryStatus },
        evidence: rows.length ? [buildAdapterEvidence({
          sourceId: "malwarebazaar",
          sourceName: "MalwareBazaar",
          sourceUrl: "https://bazaar.abuse.ch/",
          summary: `MalwareBazaar returned ${rows.length} metadata record(s) for the submitted hash. No sample was downloaded.`,
        })] : [],
        warnings: rows.length ? [] : [`MalwareBazaar returned no metadata (${queryStatus ?? "unknown status"}).`],
      };
    },
  };
}
