import net from "node:net";

import {
  buildAdapterEvidence,
  type GovernedOsintAdapter,
} from "./osint-adapter-bus";
import { openosintClient } from "../server/openosint-mcp-client";

type ServiceFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type OsintServiceConnectorId =
  | "opencti"
  | "intelowl"
  | "dfir-iris"
  | "velociraptor"
  | "flowsint"
  | "spiderfoot"
  | "sherlock"
  | "maigret"
  | "openosint";
export type OsintServiceConnectorFamily = "cti_platform" | "osint_engine" | "identity_enumeration" | "case_forensics";
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

export type LocalOsintPlatformInput = {
  target?: string;
  caseId?: string;
};

export type LocalOsintPlatformOutput = {
  connectorId: OsintServiceConnectorId;
  endpoint: string;
  target?: string;
  caseId?: string;
  status: "reachable";
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
    id: "dfir-iris",
    name: "DFIR-IRIS",
    family: "case_forensics",
    upstream: "https://github.com/dfir-iris/iris-web",
    license: "LGPL-3.0 / GPL-3.0 components; verify deployment package license before distribution",
    executionState: "configured_live",
    env: ["DFIR_IRIS_BASE_URL"],
    liveCapabilities: ["local case-management platform reachability", "handoff to DFIR case workspace"],
    blockedCapabilities: ["credential bypass", "case mutation without authenticated operator session", "bulk export of case evidence"],
    policy: "DISHA treats DFIR-IRIS as a local case platform. The connector only proves reachability and provides an evidence-linked handoff; authenticated case actions stay inside IRIS.",
  },
  {
    id: "velociraptor",
    name: "Velociraptor",
    family: "case_forensics",
    upstream: "https://github.com/Velocidex/velociraptor",
    license: "AGPL-3.0",
    executionState: "configured_live",
    env: ["VELOCIRAPTOR_BASE_URL"],
    liveCapabilities: ["local endpoint-forensics console reachability", "handoff to approved Velociraptor workspace"],
    blockedCapabilities: ["client collection launch", "endpoint interrogation", "artifact execution", "credential or file collection from endpoints"],
    policy: "DISHA does not launch Velociraptor collections. This connector only verifies the local console is reachable and records a governed handoff.",
  },
  {
    id: "flowsint",
    name: "Flowsint",
    family: "osint_engine",
    upstream: "https://github.com/reconurge/flowsint",
    license: "[VERIFY REQUIRED]",
    executionState: "configured_live",
    env: ["FLOWSINT_BASE_URL"],
    liveCapabilities: ["local OSINT workflow platform reachability", "handoff to running Flowsint workspace"],
    blockedCapabilities: ["unreviewed workflow execution", "scraping private services", "credentialed collection without approval"],
    policy: "DISHA treats Flowsint as a local OSINT workflow platform. The connector verifies service reachability and hands off; arbitrary workflow execution is not exposed through DISHA.",
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
  {
    id: "openosint",
    name: "OpenOSINT",
    family: "osint_engine",
    upstream: "https://github.com/OpenOSINT/OpenOSINT",
    license: "MIT",
    executionState: "configured_live",
    env: [],
    liveCapabilities: [
      "MCP server dynamic tool discovery",
      "Passive DNS resolution",
      "RDAP registration lookup",
      "WHOIS registration lookup",
      "Google dork query generation",
      "Passive IP intelligence and reverse DNS",
      "Public GitHub user and repository intelligence",
      "Breach lookup via HIBP and leak databases (when key supplied)",
    ],
    blockedCapabilities: [
      "Unbounded active network scans",
      "Identity enumeration without ASTRA authorization",
      "Web scraping in passive mode",
    ],
    policy: "DISHA connects to the official OpenOSINT MCP server. Passive public-source research is enabled by default; noisy/active tools require explicit investigation authorization.",
  },
];

function envConfigured(name: string): boolean {
  if (name === "INTELOWL_ANALYZERS_ALLOWLIST") {
    return Boolean(process.env.INTELOWL_ANALYZERS_ALLOWLIST?.trim() || process.env.INTELOWL_ANALYZERS?.trim());
  }
  return Boolean(process.env[name]?.trim());
}

export function listOsintServiceConnectors(): OsintServiceConnectorPosture[] {
  return connectorDefinitions.map((definition) => {
    const missingEnv = definition.env.filter((name) => !envConfigured(name));
    const configured = missingEnv.length === 0;
    return {
      ...definition,
      env: [...definition.env],
      liveCapabilities: [...definition.liveCapabilities],
      blockedCapabilities: [...definition.blockedCapabilities],
      configured,
      missingEnv,
      canProbe: configured && definition.executionState === "configured_live",
      canRunTargetSearch: configured && definition.executionState === "configured_live" && ["opencti", "intelowl", "openosint"].includes(definition.id),
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
    rule: "OpenCTI, IntelOwl, and OpenOSINT are service-backed governed adapters when configured. DFIR-IRIS, Velociraptor, and Flowsint are local platform handoffs with reachability checks only. Identity-oriented service connectors remain blocked outside ASTRA authorization.",
  };
}

export async function probeOsintServiceConnector(
  connectorId: OsintServiceConnectorId,
  fetcher: ServiceFetch = fetch,
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
  if (connectorId === "dfir-iris") return probeReachableService(connectorId, "DFIR_IRIS_BASE_URL", fetcher);
  if (connectorId === "velociraptor") return probeReachableService(connectorId, "VELOCIRAPTOR_BASE_URL", fetcher);
  if (connectorId === "flowsint") return probeReachableService(connectorId, "FLOWSINT_BASE_URL", fetcher);
  if (connectorId === "openosint") {
    try {
      const health = await openosintClient.checkHealth();
      return {
        connectorId,
        status: health.healthy ? "ok" : "failed",
        detail: `OpenOSINT MCP (${health.transport}): ${health.toolsAvailable} tools available. ${health.detail || ""}`.trim(),
      };
    } catch (err) {
      return {
        connectorId,
        status: "failed",
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }
  return { connectorId, status: "blocked", detail: "Connector is not executable in the current DISHA runtime." };
}

export async function probeConfiguredOsintServices(fetcher: ServiceFetch = fetch): Promise<OsintServiceProbeResult[]> {
  return Promise.all(["opencti", "intelowl", "dfir-iris", "velociraptor", "flowsint", "spiderfoot", "sherlock", "maigret", "openosint"].map((id) =>
    probeOsintServiceConnector(id as OsintServiceConnectorId, fetcher),
  ));
}

export function createLocalOsintPlatformAdapter(
  connectorId: Extract<OsintServiceConnectorId, "dfir-iris" | "velociraptor" | "flowsint">,
  fetcher: ServiceFetch = fetch,
): GovernedOsintAdapter<LocalOsintPlatformInput, LocalOsintPlatformOutput> {
  const definition = connectorDefinitions.find((connector) => connector.id === connectorId);
  if (!definition) throw new Error("unknown_local_osint_platform:" + connectorId);
  const envName = definition.env[0]!;

  return {
    metadata: {
      id: "service-" + connectorId,
      name: definition.name + " local platform handoff",
      version: "1.0.0",
      capability: "local_osint_platform_handoff",
      auth: "session",
      legalUse: ["Authorized case work", "Defensive investigation handoff", "Local platform reachability check"],
      blockedUse: definition.blockedCapabilities,
      rateLimitPerMinute: 30,
      timeoutMs: 6_000,
      maxRetries: 0,
      executionClass: "passive_public",
      defaultEnabled: true,
      upstreamRepository: definition.upstream,
    },
    async health() {
      const posture = listOsintServiceConnectors().find((connector) => connector.id === connectorId);
      if (!posture?.configured) return { status: "not_configured" as const, detail: envName + " is required" };
      const probe = await probeReachableService(connectorId, envName, fetcher);
      return probe.status === "ok"
        ? { status: "healthy" as const, detail: probe.detail }
        : { status: "degraded" as const, detail: probe.detail };
    },
    async execute(input) {
      const endpoint = serviceOrigin(envName);
      await probeReachableService(connectorId, envName, fetcher);
      return {
        data: {
          connectorId,
          endpoint,
          ...(boundedOptionalText(input.target, 512) ? { target: boundedOptionalText(input.target, 512) } : {}),
          ...(boundedOptionalText(input.caseId, 128) ? { caseId: boundedOptionalText(input.caseId, 128) } : {}),
          status: "reachable",
        },
        evidence: [buildAdapterEvidence({
          sourceId: connectorId,
          sourceName: definition.name,
          sourceUrl: endpoint,
          summary: definition.name + " local platform is reachable. DISHA recorded a governed handoff; operator-authenticated actions remain in the platform UI/API.",
        })],
        warnings: ["This adapter does not execute platform workflows or collect evidence automatically."],
      };
    },
  };
}

export function createOpenCtiServiceAdapter(
  fetcher: ServiceFetch = fetch,
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
  fetcher: ServiceFetch = fetch,
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
      timeoutMs: 22_000,
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

async function probeOpenCti(fetcher: ServiceFetch): Promise<OsintServiceProbeResult> {
  const response = await fetcher(serviceUrl("OPENCTI_BASE_URL", "/graphql"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + requireEnv("OPENCTI_TOKEN"),
    },
    body: JSON.stringify({ query: "query DishaOpenCtiHealth { about { version } }" }),
    redirect: "error",
    signal: AbortSignal.timeout(5_000),
  });
  return {
    connectorId: "opencti",
    status: response.ok ? "ok" : "failed",
    httpStatus: response.status,
    detail: response.ok ? "OpenCTI GraphQL endpoint responded." : "OpenCTI probe returned HTTP " + response.status + ".",
  };
}

async function probeIntelOwl(fetcher: ServiceFetch): Promise<OsintServiceProbeResult> {
  const response = await fetcher(serviceUrl("INTELOWL_BASE_URL", "/api/healthcheck"), {
    method: "GET",
    headers: {
      authorization: "Token " + requireEnv("INTELOWL_API_KEY"),
      accept: "application/json",
    },
    redirect: "error",
    signal: AbortSignal.timeout(5_000),
  });
  return {
    connectorId: "intelowl",
    status: response.ok ? "ok" : "failed",
    httpStatus: response.status,
    detail: response.ok ? "IntelOwl health endpoint responded." : "IntelOwl probe returned HTTP " + response.status + ".",
  };
}

async function probeReachableService(
  connectorId: OsintServiceConnectorId,
  envName: string,
  fetcher: ServiceFetch,
): Promise<OsintServiceProbeResult> {
  const origin = serviceOrigin(envName);
  try {
    const response = await fetcher(origin, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    await response.body?.cancel();
    return {
      connectorId,
      status: "ok",
      httpStatus: response.status,
      detail: "Local service endpoint responded with HTTP " + response.status + ".",
    };
  } catch (error) {
    if (await tcpReachable(origin)) {
      return {
        connectorId,
        status: "ok",
        detail: "Local service TCP endpoint is reachable; HTTP fetch failed: " + (error instanceof Error ? error.message : String(error)),
      };
    }
    return {
      connectorId,
      status: "failed",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function tcpReachable(rawUrl: string): Promise<boolean> {
  try {
    const url = new URL(rawUrl);
    const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
    if (!url.hostname || !Number.isInteger(port) || port <= 0 || port > 65535) return false;
    return await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host: url.hostname, port, timeout: 3_000 }, () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
      socket.once("timeout", () => {
        socket.destroy();
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

async function pollIntelOwlJob(
  jobId: number,
  headers: Record<string, string>,
  fetcher: ServiceFetch,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const configuredTimeout = Number(process.env.INTELOWL_JOB_TIMEOUT_MS ?? 15_000);
  const timeoutMs = Number.isFinite(configuredTimeout)
    ? Math.max(5_000, Math.min(18_000, configuredTimeout))
    : 15_000;
  const deadline = Date.now() + timeoutMs;
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
  const raw = process.env.INTELOWL_ANALYZERS_ALLOWLIST ?? process.env.INTELOWL_ANALYZERS ?? "";
  if (!raw.trim()) return [];
  return normalizeAnalyzerNames(raw.split(","));
}

function boundedText(value: unknown, maxLength: number, error: string): string {
  if (typeof value !== "string") throw new Error(error);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || /[\u0000\r\n]/.test(trimmed)) throw new Error(error);
  return trimmed;
}

function boundedOptionalText(value: unknown, maxLength: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || /[\u0000\r\n]/.test(trimmed)) return undefined;
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
  const base = serviceBaseUrl(envName);
  return new URL(path.startsWith("/") ? path : "/" + path, base).toString();
}

function serviceBaseUrl(envName: string): URL {
  const url = new URL(requireEnv(envName));
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("invalid_service_url:" + envName);
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

function serviceOrigin(envName: string): string {
  return serviceBaseUrl(envName).origin + "/";
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
