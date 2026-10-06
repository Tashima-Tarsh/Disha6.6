import { safePublicFetch } from "../server/safe-public-fetch";
import {
  buildAdapterEvidence,
  type GovernedOsintAdapter,
} from "./osint-adapter-bus";

export type OsintServiceConnectorId = "opencti" | "intelowl" | "spiderfoot" | "sherlock" | "maigret";
export type OsintServiceConnectorFamily = "cti_platform" | "osint_engine" | "identity_enumeration";
export type OsintServiceConnectorState = "configured_live" | "needs_configuration" | "blocked_by_policy";

export type OsintServiceConnectorDefinition = {
  id: OsintServiceConnectorId;
  name: string;
  family: OsintServiceConnectorFamily;
  upstream: string;
  license: string;
  executionState: OsintServiceConnectorState;
  env: string[];
  liveCapabilities: string[];
  blockedCapabilities: string[];
  policy: string;
};

export type OsintServiceConnectorPosture = OsintServiceConnectorDefinition & {
  configured: boolean;
  missingEnv: string[];
  canProbe: boolean;
  canRunTargetSearch: boolean;
};

export type OsintServiceProbeResult = {
  connectorId: OsintServiceConnectorId;
  status: "skipped" | "ok" | "failed" | "blocked";
  httpStatus?: number;
  detail: string;
};

export type OpenCtiServiceInput = {
  query: string;
  types?: string[];
};

export type OpenCtiServiceOutput = {
  records: Record<string, unknown>[];
  total?: number;
};

export type IntelOwlServiceInput = {
  observable: string;
  analyzers?: string[];
};

export type IntelOwlServiceOutput = {
  records: Record<string, unknown>[];
  jobId: number;
  status: string;
  dataModel?: Record<string, unknown>;
};

const connectorDefinitions: OsintServiceConnectorDefinition[] = [
  {
    id: "opencti",
    name: "OpenCTI",
    family: "cti_platform",
    upstream: "https://github.com/OpenCTI-Platform/opencti",
    license: "Apache-2.0 Community Edition; Enterprise components separately licensed",
    executionState: "configured_live",
    env: ["OPENCTI_BASE_URL", "OPENCTI_TOKEN"],
    liveCapabilities: ["configured CTI graph probe", "bounded STIX core-object search", "source-linked CTI enrichment"],
    blockedCapabilities: ["unreviewed connector execution", "bulk export of private CTI tenants", "secret/token exposure", "GraphQL mutations"],
    policy: "Live only when OPENCTI_BASE_URL and OPENCTI_TOKEN are configured. DISHA exposes a bounded read-only STIX graph search and never executes OpenCTI mutations through this adapter.",
  },
  {
    id: "intelowl",
    name: "IntelOwl",
    family: "cti_platform",
    upstream: "https://github.com/intelowlproject/IntelOwl",
    license: "AGPL-3.0",
    executionState: "configured_live",
    env: ["INTELOWL_BASE_URL", "INTELOWL_API_KEY", "INTELOWL_ANALYZERS_ALLOWLIST"],
    liveCapabilities: ["configured enrichment-service probe", "allowlisted observable analysis", "bounded job report normalization"],
    blockedCapabilities: ["malware detonation by default", "unreviewed analyzer packs", "connector/playbook execution", "submission of private files without approval"],
    policy: "Live only when IntelOwl endpoint credentials and an explicit analyzer allowlist are configured. DISHA submits observables only to allowlisted analyzers and does not expose arbitrary connectors, playbooks, runtime configuration, or file submission.",
  },
  {
    id: "spiderfoot",
    name: "SpiderFoot",
    family: "osint_engine",
    upstream: "https://github.com/smicallef/spiderfoot",
    license: "MIT",
    executionState: "blocked_by_policy",
    env: ["SPIDERFOOT_BASE_URL", "SPIDERFOOT_API_KEY", "DISHA_SPIDERFOOT_PASSIVE_PROFILE_APPROVED"],
    liveCapabilities: ["future passive-profile service connector after module allowlist"],
    blockedCapabilities: ["arbitrary module execution", "active target probing", "credential or secret discovery", "unbounded scans"],
    policy: "Catalogued and configurable for future passive-only profiles, but not executable until a reviewed module allowlist exists.",
  },
  {
    id: "sherlock",
    name: "Sherlock",
    family: "identity_enumeration",
    upstream: "https://github.com/sherlock-project/sherlock",
    license: "MIT",
    executionState: "blocked_by_policy",
    env: ["DISHA_IDENTITY_ENUMERATION_APPROVED"],
    liveCapabilities: [],
    blockedCapabilities: ["cross-site username enumeration", "profile correlation", "personal account discovery"],
    policy: "Identity enumeration is not executable in the default DISHA service-connector runtime. ASTRA requires a separately authorized investigation.",
  },
  {
    id: "maigret",
    name: "Maigret",
    family: "identity_enumeration",
    upstream: "https://github.com/soxoj/maigret",
    license: "MIT",
    executionState: "blocked_by_policy",
    env: ["DISHA_IDENTITY_ENUMERATION_APPROVED"],
    liveCapabilities: [],
    blockedCapabilities: ["cross-site username enumeration", "profile correlation", "personal account discovery"],
    policy: "Identity enumeration is not executable in the default DISHA service-connector runtime. ASTRA requires a separately authorized investigation.",
  },
];

export function listOsintServiceConnectors(): OsintServiceConnectorPosture[] {
  return connectorDefinitions.map((definition) => {
    const missingEnv = definition.env.filter((name) => !process.env[name]?.trim());
    const configured = missingEnv.length === 0;
    return {
      ...definition,
      env: [...definition.env],
      liveCapabilities: [...definition.liveCapabilities],
      blockedCapabilities: [...definition.blockedCapabilities],
      configured,
      missingEnv,
      canProbe: configured && definition.executionState === "configured_live",
      canRunTargetSearch: configured && definition.executionState === "configured_live" && ["opencti", "intelowl"].includes(definition.id),
    };
  });
}

export function getOsintServiceConnectorSummary() {
  const connectors = listOsintServiceConnectors();
  return {
    total: connectors.length,
    configuredLive: connectors.filter((connector) => connector.executionState === "configured_live" && connector.configured).length,
    needsConfiguration: connectors.filter((connector) => connector.executionState === "configured_live" && !connector.configured).length,
    blockedByPolicy: connectors.filter((connector) => connector.executionState === "blocked_by_policy").length,
    rule: "OpenCTI and IntelOwl are service-backed governed adapters when configured. OpenCTI is read-only; IntelOwl execution is limited to an explicit passive analyzer allowlist. Identity-oriented service connectors remain blocked outside ASTRA authorization.",
  };
}

export async function probeOsintServiceConnector(
  connectorId: OsintServiceConnectorId,
  fetcher: typeof safePublicFetch = safePublicFetch,
): Promise<OsintServiceProbeResult> {
  const posture = listOsintServiceConnectors().find((connector) => connector.id === connectorId);
  if (!posture) throw new Error("unknown_osint_service_connector:" + connectorId);
  if (posture.executionState === "blocked_by_policy") {
    return { connectorId, status: "blocked", detail: posture.policy };
  }
  if (!posture.configured) {
    return { connectorId, status: "skipped", detail: "Missing configuration: " + posture.missingEnv.join(", ") };
  }
  if (connectorId === "opencti") return probeOpenCti(fetcher);
  if (connectorId === "intelowl") return probeIntelOwl(fetcher);
  return { connectorId, status: "blocked", detail: "Connector is not executable in the current DISHA runtime." };
}

export async function probeConfiguredOsintServices(fetcher: typeof safePublicFetch = safePublicFetch): Promise<OsintServiceProbeResult[]> {
  return Promise.all(["opencti", "intelowl", "spiderfoot", "sherlock", "maigret"].map((id) =>
    probeOsintServiceConnector(id as OsintServiceConnectorId, fetcher),
  ));
}

export function createOpenCtiServiceAdapter(
  fetcher: typeof safePublicFetch = safePublicFetch,
): GovernedOsintAdapter<OpenCtiServiceInput, OpenCtiServiceOutput> {
  return {
    metadata: {
      id: "service-opencti",
      name: "OpenCTI governed graph search",
      version: "1.0.0",
      capability: "defensive_cti_graph_search",
      auth: "api_key",
      legalUse: ["Defensive CTI research", "IOC/entity enrichment", "Source-linked STIX graph discovery"],
      blockedUse: ["GraphQL mutations", "Bulk tenant export", "Private-data exfiltration", "Unreviewed connector execution"],
      rateLimitPerMinute: 20,
      timeoutMs: 20_000,
      maxRetries: 1,
      executionClass: "credentialed_public_api",
      defaultEnabled: true,
      upstreamRepository: "https://github.com/OpenCTI-Platform/opencti",
    },
    async health() {
      const posture = listOsintServiceConnectors().find((connector) => connector.id === "opencti");
      return posture?.configured
        ? { status: "healthy" as const, detail: "OpenCTI endpoint and token configured" }
        : { status: "not_configured" as const, detail: "OPENCTI_BASE_URL and OPENCTI_TOKEN are required" };
    },
    async execute(input, context) {
      const search = boundedText(input.query, 512, "invalid_opencti_query");
      const types = normalizeOpenCtiTypes(input.types);
      const query = [
        "query DishaOpenCtiSearch($search: String, $types: [String], $first: Int) {",
        "  stixCoreObjects(search: $search, types: $types, first: $first) {",
        "    edges {",
        "      node {",
        "        id",
        "        standard_id",
        "        entity_type",
        "        representative { main secondary }",
        "        created_at",
        "        updated_at",
        "      }",
        "    }",
        "    pageInfo { globalCount }",
        "  }",
        "}",
      ].join("\n");

      const response = await fetcher(serviceUrl("OPENCTI_BASE_URL", "/graphql"), {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: "Bearer " + requireEnv("OPENCTI_TOKEN"),
        },
        body: JSON.stringify({
          query,
          variables: {
            search,
            types: types.length ? types : null,
            first: 50,
          },
        }),
        redirect: "error",
        signal: context.signal,
      });
      const json = await boundedJson(response);
      if (Array.isArray(json.errors) && json.errors.length) throw new Error("opencti_graphql_error");

      const data = record(json.data);
      const connection = record(data.stixCoreObjects);
      const rows = objectRows(connection.edges)
        .map((edge) => record(edge.node))
        .filter((node) => typeof node.id === "string" && typeof node.entity_type === "string")
        .slice(0, 50);
      const pageInfo = record(connection.pageInfo);
      const total = typeof pageInfo.globalCount === "number" ? pageInfo.globalCount : undefined;

      return {
        data: { records: rows, total },
        evidence: rows.length ? [buildAdapterEvidence({
          sourceId: "opencti",
          sourceName: "OpenCTI",
          sourceUrl: serviceOrigin("OPENCTI_BASE_URL"),
          summary: "OpenCTI returned " + rows.length + " bounded STIX core-object match(es) from the configured CTI graph.",
        })] : [],
        warnings: rows.length ? [] : ["OpenCTI returned no STIX core-object matches."],
      };
    },
  };
}

export function createIntelOwlServiceAdapter(
  fetcher: typeof safePublicFetch = safePublicFetch,
): GovernedOsintAdapter<IntelOwlServiceInput, IntelOwlServiceOutput> {
  return {
    metadata: {
      id: "service-intelowl",
      name: "IntelOwl allowlisted observable analysis",
      version: "1.0.0",
      capability: "defensive_ioc_enrichment",
      auth: "api_key",
      legalUse: ["Defensive IOC enrichment", "Allowlisted passive analyzer execution", "Threat-intelligence report normalization"],
      blockedUse: ["Arbitrary analyzer execution", "Connector/playbook execution", "Malware detonation", "Private file submission"],
      rateLimitPerMinute: 10,
      timeoutMs: 55_000,
      maxRetries: 0,
      executionClass: "credentialed_public_api",
      defaultEnabled: true,
      upstreamRepository: "https://github.com/intelowlproject/IntelOwl",
    },
    async health() {
      const posture = listOsintServiceConnectors().find((connector) => connector.id === "intelowl");
      return posture?.configured
        ? { status: "healthy" as const, detail: "IntelOwl endpoint, API key, and analyzer allowlist configured" }
        : { status: "not_configured" as const, detail: "INTELOWL_BASE_URL, INTELOWL_API_KEY, and INTELOWL_ANALYZERS_ALLOWLIST are required" };
    },
    async execute(input, context) {
      const observable = boundedText(input.observable, 2048, "invalid_intelowl_observable");
      const allowlist = intelOwlAnalyzerAllowlist();
      if (!allowlist.length) throw new Error("not_configured");

      const requested = Array.isArray(input.analyzers) && input.analyzers.length
        ? normalizeAnalyzerNames(input.analyzers)
        : allowlist;
      const denied = requested.filter((name) => !allowlist.includes(name));
      if (denied.length) throw new Error("intelowl_analyzer_not_allowlisted");
      const analyzers = [...new Set(requested)];
      if (!analyzers.length) throw new Error("intelowl_analyzer_allowlist_empty");

      const headers = {
        accept: "application/json",
        "content-type": "application/json",
        authorization: "Token " + requireEnv("INTELOWL_API_KEY"),
      };
      const createResponse = await fetcher(serviceUrl("INTELOWL_BASE_URL", "/api/analyze_observable"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          observable_name: observable,
          analyzers_requested: analyzers,
          connectors_requested: [],
          tlp: "CLEAR",
        }),
        redirect: "error",
        signal: context.signal,
      });
      const accepted = await boundedJson(createResponse);
      const jobId = typeof accepted.job_id === "number"
        ? accepted.job_id
        : Number(accepted.job_id);
      if (!Number.isInteger(jobId) || jobId <= 0) throw new Error("intelowl_job_id_missing");

      const job = await pollIntelOwlJob(jobId, headers, fetcher, context.signal);
      const status = typeof job.status === "string" ? job.status : "unknown";
      if (status === "killed" || status === "failed") throw new Error("intelowl_job_failed:" + status);

      const reports = objectRows(job.analyzer_reports).slice(0, 100);
      const dataModel = record(job.data_model);
      const rows = reports.length
        ? reports
        : Object.keys(dataModel).length
          ? [dataModel]
          : [];
      const warnings = stringArray(job.warnings);
      const errors = stringArray(job.errors);
      if (status === "reported_with_fails") warnings.push("IntelOwl completed with one or more analyzer failures.");
      for (const error of errors) warnings.push("IntelOwl: " + error);

      return {
        data: {
          records: rows,
          jobId,
          status,
          ...(Object.keys(dataModel).length ? { dataModel } : {}),
        },
        evidence: [buildAdapterEvidence({
          sourceId: "intelowl",
          sourceName: "IntelOwl",
          sourceUrl: serviceOrigin("INTELOWL_BASE_URL"),
          summary: "IntelOwl job " + jobId + " completed as " + status + " using " + analyzers.length + " allowlisted analyzer(s); " + rows.length + " normalized report record(s) were returned.",
        })],
        warnings: warnings.slice(0, 30),
      };
    },
  };
}

async function probeOpenCti(fetcher: typeof safePublicFetch): Promise<OsintServiceProbeResult> {
  const response = await fetcher(serviceUrl("OPENCTI_BASE_URL", "/graphql"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + requireEnv("OPENCTI_TOKEN"),
    },
    body: JSON.stringify({ query: "query DishaOpenCtiHealth { about { version } }" }),
    redirect: "error",
  });
  return {
    connectorId: "opencti",
    status: response.ok ? "ok" : "failed",
    httpStatus: response.status,
    detail: response.ok ? "OpenCTI GraphQL endpoint responded." : "OpenCTI probe returned HTTP " + response.status + ".",
  };
}

async function probeIntelOwl(fetcher: typeof safePublicFetch): Promise<OsintServiceProbeResult> {
  const response = await fetcher(serviceUrl("INTELOWL_BASE_URL", "/api/healthcheck"), {
    method: "GET",
    headers: {
      authorization: "Token " + requireEnv("INTELOWL_API_KEY"),
      accept: "application/json",
    },
    redirect: "error",
  });
  return {
    connectorId: "intelowl",
    status: response.ok ? "ok" : "failed",
    httpStatus: response.status,
    detail: response.ok ? "IntelOwl health endpoint responded." : "IntelOwl probe returned HTTP " + response.status + ".",
  };
}

async function pollIntelOwlJob(
  jobId: number,
  headers: Record<string, string>,
  fetcher: typeof safePublicFetch,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + Math.max(5_000, Math.min(45_000, Number(process.env.INTELOWL_JOB_TIMEOUT_MS ?? 40_000)));
  const finalStatuses = new Set(["reported_without_fails", "reported_with_fails", "killed", "failed"]);

  for (;;) {
    if (signal?.aborted) throw new Error("adapter_cancelled");
    const response = await fetcher(serviceUrl("INTELOWL_BASE_URL", "/api/jobs/" + jobId), {
      method: "GET",
      headers,
      redirect: "error",
      signal,
    });
    const job = await boundedJson(response);
    const status = typeof job.status === "string" ? job.status : "";
    if (finalStatuses.has(status)) return job;
    if (Date.now() >= deadline) throw new Error("intelowl_job_timeout");
    await sleepWithSignal(750, signal);
  }
}

function normalizeOpenCtiTypes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => /^[A-Za-z0-9:_-]{1,80}$/.test(entry))
  )].slice(0, 20);
}

function normalizeAnalyzerNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => /^[A-Za-z0-9_.:-]{1,120}$/.test(entry));
  if (names.length !== value.length) throw new Error("invalid_intelowl_analyzer_name");
  return [...new Set(names)].slice(0, 50);
}

function intelOwlAnalyzerAllowlist(): string[] {
  const raw = process.env.INTELOWL_ANALYZERS_ALLOWLIST ?? "";
  if (!raw.trim()) return [];
  return normalizeAnalyzerNames(raw.split(","));
}

function boundedText(value: unknown, maxLength: number, error: string): string {
  if (typeof value !== "string") throw new Error(error);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || /[\u0000\r\n]/.test(trimmed)) throw new Error(error);
  return trimmed;
}

async function boundedJson(response: Response, maxBytes = 3_000_000): Promise<Record<string, unknown>> {
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("provider_http_" + response.status);
  }
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
  return record(parsed);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function objectRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map(record).filter((row) => Object.keys(row).length > 0)
    : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.slice(0, 300))
    : [];
}

function serviceUrl(envName: string, path: string): string {
  return requireEnv(envName).replace(/\/+$/, "") + (path.startsWith("/") ? path : "/" + path);
}

function serviceOrigin(envName: string): string {
  const url = new URL(requireEnv(envName));
  return url.origin + "/";
}

async function sleepWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw new Error("adapter_cancelled");
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("adapter_cancelled"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("missing_env:" + name);
  return value;
}
