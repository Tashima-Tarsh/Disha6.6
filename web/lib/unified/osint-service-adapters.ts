import {
  buildAdapterEvidence,
  type AdapterContext,
  type GovernedOsintAdapter,
} from "./osint-adapter-bus";

type ServiceTargetInput = {
  target: string;
  targetType: string;
};

type ServiceSearchOutput = {
  records: Array<Record<string, unknown>>;
  providerHealth: "REST_HEALTHY";
  provider: "opencti" | "intelowl";
};

type FetchLike = typeof fetch;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`not_configured: missing ${name}`);
  return value;
}

function serviceBaseUrl(name: string): string {
  const raw = requireEnv(name);
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error(`not_configured: invalid ${name}`);
  }
  return url.toString().replace(/\/+$/, "");
}

async function jsonRequest(
  fetcher: FetchLike,
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const combinedSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(20_000)])
    : AbortSignal.timeout(20_000);
  const response = await fetcher(url, { ...init, signal: combinedSignal, cache: "no-store" });
  const bodyText = await response.text();
  let body: unknown = {};
  if (bodyText.trim()) {
    try {
      body = JSON.parse(bodyText) as unknown;
    } catch {
      body = { raw: bodyText.slice(0, 2_000) };
    }
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`provider_restricted_http_${response.status}`);
    }
    throw new Error(`provider_http_${response.status}`);
  }
  return body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 2_000) : undefined;
}

function compactDetails(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    return JSON.stringify(value).slice(0, 8_000);
  } catch {
    return String(value).slice(0, 8_000);
  }
}

function intelOwlClassification(targetType: string): "ip" | "domain" | "url" | "hash" | "generic" {
  if (targetType === "ip") return "ip";
  if (targetType === "domain") return "domain";
  if (targetType === "url") return "url";
  if (targetType === "file_hash" || targetType === "ioc") return "hash";
  return "generic";
}

function configuredIntelOwlAnalyzers(): string[] {
  return (process.env.INTELOWL_ANALYZERS ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function createOpenCtiServiceAdapter(fetcher: FetchLike = fetch): GovernedOsintAdapter<ServiceTargetInput, ServiceSearchOutput> {
  return {
    metadata: {
      id: "service-opencti",
      name: "OpenCTI",
      version: "upstream-pinned",
      capability: "CTI graph global search",
      auth: "api_key",
      legalUse: ["Configured defensive CTI graph search", "Indicator and entity correlation"],
      blockedUse: ["Cross-tenant access", "Token disclosure", "Unreviewed connector execution"],
      rateLimitPerMinute: 30,
      timeoutMs: 20_000,
      maxRetries: 0,
      executionClass: "credentialed_public_api",
      defaultEnabled: true,
      upstreamRepository: "https://github.com/OpenCTI-Platform/opencti",
    },
    async health() {
      if (!process.env.OPENCTI_BASE_URL || !process.env.OPENCTI_TOKEN) {
        return { status: "not_configured" as const, detail: "OPENCTI_BASE_URL and OPENCTI_TOKEN are required." };
      }
      try {
        const baseUrl = serviceBaseUrl("OPENCTI_BASE_URL");
        await jsonRequest(fetcher, `${baseUrl}/graphql`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${requireEnv("OPENCTI_TOKEN")}`,
          },
          body: JSON.stringify({ query: "query DishaOpenCtiHealth { about { version } }" }),
        });
        return { status: "healthy" as const, detail: "OpenCTI GraphQL API ready." };
      } catch (error) {
        return { status: "unavailable" as const, detail: error instanceof Error ? error.message : "OpenCTI unavailable." };
      }
    },
    async execute(input, context: AdapterContext) {
      const baseUrl = serviceBaseUrl("OPENCTI_BASE_URL");
      const token = requireEnv("OPENCTI_TOKEN");
      const query = `query DishaGlobalSearch($search: String!, $count: Int!) {
        globalSearch(search: $search, first: $count) {
          edges {
            node {
              id
              entity_type
              created_at
              ... on StixObject {
                representative { main secondary }
              }
              createdBy {
                ... on Identity { name }
              }
            }
          }
        }
      }`;
      const body = await jsonRequest(fetcher, `${baseUrl}/graphql`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables: { search: input.target, count: 25 } }),
      }, context.signal);

      const errors = asArray(body.errors);
      if (errors.length) throw new Error("opencti_graphql_error");
      const globalSearch = asRecord(asRecord(body.data).globalSearch);
      const records = asArray(globalSearch.edges).slice(0, 25).map((edge) => {
        const node = asRecord(asRecord(edge).node);
        const representative = asRecord(node.representative);
        const createdBy = asRecord(node.createdBy);
        const main = text(representative.main) ?? text(node.id) ?? "OpenCTI object";
        return {
          id: text(node.id),
          entityType: text(node.entity_type),
          name: main,
          secondary: text(representative.secondary),
          createdAt: text(node.created_at),
          createdBy: text(createdBy.name),
          sourceUrl: baseUrl,
          summary: `${text(node.entity_type) ?? "CTI object"}: ${main}`,
        };
      }).filter(record => Boolean(record.id));

      return {
        data: { records, providerHealth: "REST_HEALTHY", provider: "opencti" },
        evidence: [buildAdapterEvidence({
          sourceId: "opencti",
          sourceName: "OpenCTI",
          sourceUrl: baseUrl,
          summary: `OpenCTI returned ${records.length} CTI graph result(s) for '${input.target}'.`,
        })],
      };
    },
  };
}

export function createIntelOwlServiceAdapter(fetcher: FetchLike = fetch): GovernedOsintAdapter<ServiceTargetInput, ServiceSearchOutput> {
  return {
    metadata: {
      id: "service-intelowl",
      name: "IntelOwl",
      version: "upstream-pinned",
      capability: "allowlisted observable enrichment",
      auth: "api_key",
      legalUse: ["Defensive IOC enrichment", "Configured passive observable analysis"],
      blockedUse: ["Run-all analyzer execution", "Malware detonation by default", "Private file submission"],
      rateLimitPerMinute: 15,
      timeoutMs: 21_000,
      maxRetries: 0,
      executionClass: "credentialed_public_api",
      defaultEnabled: true,
      upstreamRepository: "https://github.com/intelowlproject/IntelOwl",
    },
    async health() {
      if (!process.env.INTELOWL_BASE_URL || !process.env.INTELOWL_API_KEY || configuredIntelOwlAnalyzers().length === 0) {
        return { status: "not_configured" as const, detail: "INTELOWL_BASE_URL, INTELOWL_API_KEY, and INTELOWL_ANALYZERS are required." };
      }
      try {
        const baseUrl = serviceBaseUrl("INTELOWL_BASE_URL");
        await jsonRequest(fetcher, `${baseUrl}/api/jobs?limit=1`, {
          method: "GET",
          headers: {
            authorization: `Token ${requireEnv("INTELOWL_API_KEY")}`,
            accept: "application/json",
          },
        });
        return { status: "healthy" as const, detail: "IntelOwl REST API ready with an explicit analyzer allowlist." };
      } catch (error) {
        return { status: "unavailable" as const, detail: error instanceof Error ? error.message : "IntelOwl unavailable." };
      }
    },
    async execute(input, context: AdapterContext) {
      const baseUrl = serviceBaseUrl("INTELOWL_BASE_URL");
      const apiKey = requireEnv("INTELOWL_API_KEY");
      const analyzers = configuredIntelOwlAnalyzers();
      if (!analyzers.length) throw new Error("not_configured: INTELOWL_ANALYZERS is empty");

      const headers = {
        authorization: `Token ${apiKey}`,
        accept: "application/json",
        "content-type": "application/json",
      };
      const created = await jsonRequest(fetcher, `${baseUrl}/api/analyze_observable`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          observable_name: input.target,
          observable_classification: intelOwlClassification(input.targetType),
          analyzers_requested: analyzers,
          connectors_requested: [],
          tags_labels: ["DISHA-6.6"],
        }),
      }, context.signal);

      const jobId = Number(created.job_id ?? created.id);
      if (!Number.isFinite(jobId)) throw new Error("intelowl_job_id_missing");

      const finalStatuses = new Set(["reported_without_fails", "reported_with_fails", "killed", "failed"]);
      const deadline = Date.now() + 15_000;
      let job = created;
      while (!finalStatuses.has(String(job.status ?? "")) && Date.now() < deadline) {
        if (context.signal?.aborted) throw new Error("adapter_cancelled");
        await new Promise(resolve => setTimeout(resolve, 750));
        job = await jsonRequest(fetcher, `${baseUrl}/api/jobs/${jobId}`, { method: "GET", headers }, context.signal);
      }

      const status = String(job.status ?? created.status ?? "submitted");
      const reports = asArray(job.analyzer_reports ?? job.reports);
      const records = reports.length
        ? reports.slice(0, 50).map((value, index) => {
            const report = asRecord(value);
            const config = asRecord(report.config);
            const analyzer = text(config.name) ?? text(report.name) ?? text(report.analyzer_name) ?? `analyzer-${index + 1}`;
            const reportStatus = text(report.status) ?? status;
            const details = compactDetails(report.report ?? report.result ?? report);
            return {
              id: `${jobId}:${analyzer}`,
              jobId,
              analyzer,
              status: reportStatus,
              details,
              sourceUrl: baseUrl,
              summary: `${analyzer}: ${reportStatus}`,
            };
          })
        : [{
            id: String(jobId),
            jobId,
            status,
            observable: input.target,
            sourceUrl: baseUrl,
            summary: `IntelOwl job ${jobId}: ${status}`,
          }];

      const pending = !finalStatuses.has(status);
      return {
        data: { records, providerHealth: "REST_HEALTHY", provider: "intelowl" },
        evidence: [buildAdapterEvidence({
          sourceId: "intelowl",
          sourceName: "IntelOwl",
          sourceUrl: baseUrl,
          summary: `IntelOwl job ${jobId} is ${status}; ${records.length} normalized record(s).`,
        })],
        warnings: pending ? ["IntelOwl job is still running; the job reference is returned for this bounded investigation step."] : undefined,
      };
    },
  };
}

export const openCtiServiceAdapter = createOpenCtiServiceAdapter();
export const intelOwlServiceAdapter = createIntelOwlServiceAdapter();
