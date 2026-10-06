export type OsintServiceConnectorId = "opencti" | "intelowl" | "spiderfoot" | "sherlock" | "maigret";
export type OsintServiceConnectorFamily = "cti_platform" | "osint_engine" | "identity_enumeration";
export type OsintServiceConnectorState = "configured_live" | "needs_configuration" | "astra_worker" | "blocked_by_policy";

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

const connectorDefinitions: OsintServiceConnectorDefinition[] = [
  {
    id: "opencti",
    name: "OpenCTI",
    family: "cti_platform",
    upstream: "https://github.com/OpenCTI-Platform/opencti",
    license: "Apache-2.0 Community Edition; Enterprise components separately licensed",
    executionState: "configured_live",
    env: ["OPENCTI_BASE_URL", "OPENCTI_TOKEN"],
    liveCapabilities: ["CTI graph global search", "indicator/entity lookup", "source-linked CTI enrichment"],
    blockedCapabilities: ["cross-tenant access", "secret/token exposure", "unreviewed connector execution"],
    policy: "DISHA queries the configured OpenCTI GraphQL API using the operator-provided service token.",
  },
  {
    id: "intelowl",
    name: "IntelOwl",
    family: "cti_platform",
    upstream: "https://github.com/intelowlproject/IntelOwl",
    license: "AGPL-3.0",
    executionState: "configured_live",
    env: ["INTELOWL_BASE_URL", "INTELOWL_API_KEY", "INTELOWL_ANALYZERS"],
    liveCapabilities: ["allowlisted observable analysis", "IOC enrichment", "analyzer result normalization"],
    blockedCapabilities: ["run-all analyzers", "malware detonation by default", "private file submission"],
    policy: "DISHA submits only observables to an explicit INTELOWL_ANALYZERS allowlist and never sends files through this adapter.",
  },
  {
    id: "spiderfoot",
    name: "SpiderFoot",
    family: "osint_engine",
    upstream: "https://github.com/smicallef/spiderfoot",
    license: "MIT",
    executionState: "astra_worker",
    env: ["DATABASE_URL", "DISHA_ASTRA6_SPIDERFOOT_ENABLED"],
    liveCapabilities: ["pinned-source passive module execution", "multi-source OSINT", "normalized SpiderFoot events"],
    blockedCapabilities: ["port scanning", "DNS brute force", "zone transfer", "unbounded crawling"],
    policy: "SpiderFoot executes in the isolated ASTRA advanced worker with a fixed passive module allowlist.",
  },
  {
    id: "sherlock",
    name: "Sherlock",
    family: "identity_enumeration",
    upstream: "https://github.com/sherlock-project/sherlock",
    license: "MIT",
    executionState: "astra_worker",
    env: ["DATABASE_URL", "DISHA_ASTRA6_SHERLOCK_ENABLED", "DISHA_IDENTITY_ENUMERATION_APPROVED"],
    liveCapabilities: ["authorized public username-presence discovery"],
    blockedCapabilities: ["private-account access", "credential attacks", "non-authorized identity enumeration"],
    policy: "Sherlock executes through ASTRA only when deployment approval and per-investigation operator/admin authorization are both present.",
  },
  {
    id: "maigret",
    name: "Maigret",
    family: "identity_enumeration",
    upstream: "https://github.com/soxoj/maigret",
    license: "MIT",
    executionState: "astra_worker",
    env: ["DATABASE_URL", "DISHA_ASTRA6_MAIGRET_ENABLED", "DISHA_IDENTITY_ENUMERATION_APPROVED"],
    liveCapabilities: ["authorized public username/profile discovery"],
    blockedCapabilities: ["private-account access", "credential attacks", "non-authorized identity enumeration"],
    policy: "Maigret executes through ASTRA only when deployment approval and per-investigation operator/admin authorization are both present.",
  },
];

function envConfigured(name: string): boolean {
  const value = process.env[name]?.trim();
  if (!value) return false;
  if (name.startsWith("DISHA_") && (name.endsWith("_ENABLED") || name.endsWith("_APPROVED"))) return value === "true";
  return true;
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
      canRunTargetSearch: configured && ["configured_live", "astra_worker"].includes(definition.executionState),
    };
  });
}

export function getOsintServiceConnectorSummary() {
  const connectors = listOsintServiceConnectors();
  return {
    total: connectors.length,
    configuredLive: connectors.filter((connector) => connector.executionState === "configured_live" && connector.configured).length,
    needsConfiguration: connectors.filter((connector) => connector.executionState === "configured_live" && !connector.configured).length,
    astraWorkers: connectors.filter((connector) => connector.executionState === "astra_worker").length,
    blockedByPolicy: connectors.filter((connector) => connector.executionState === "blocked_by_policy").length,
    rule: "OpenCTI and IntelOwl execute through configured service APIs. SpiderFoot, Sherlock and Maigret execute through isolated ASTRA workers with their respective policy gates.",
  };
}

export async function probeOsintServiceConnector(
  connectorId: OsintServiceConnectorId,
  fetcher: typeof fetch = fetch,
): Promise<OsintServiceProbeResult> {
  const posture = listOsintServiceConnectors().find((connector) => connector.id === connectorId);
  if (!posture) throw new Error(`unknown_osint_service_connector:${connectorId}`);
  if (posture.executionState === "blocked_by_policy") return { connectorId, status: "blocked", detail: posture.policy };
  if (!posture.configured) return { connectorId, status: "skipped", detail: `Missing configuration: ${posture.missingEnv.join(", ")}` };
  if (posture.executionState === "astra_worker") return { connectorId, status: "ok", detail: `${posture.name} is configured for the ASTRA worker queue.` };
  if (connectorId === "opencti") return probeOpenCti(fetcher);
  if (connectorId === "intelowl") return probeIntelOwl(fetcher);
  return { connectorId, status: "skipped", detail: "No direct service probe is defined." };
}

export async function probeConfiguredOsintServices(fetcher: typeof fetch = fetch): Promise<OsintServiceProbeResult[]> {
  return Promise.all(connectorDefinitions.map((definition) => probeOsintServiceConnector(definition.id, fetcher)));
}

async function probeOpenCti(fetcher: typeof fetch): Promise<OsintServiceProbeResult> {
  const baseUrl = requireEnv("OPENCTI_BASE_URL").replace(/\/+$/, "");
  const token = requireEnv("OPENCTI_TOKEN");
  const response = await fetcher(`${baseUrl}/graphql`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: "query DishaOpenCtiHealth { about { version } }" }),
    signal: AbortSignal.timeout(5_000),
    cache: "no-store",
  });
  return {
    connectorId: "opencti",
    status: response.ok ? "ok" : "failed",
    httpStatus: response.status,
    detail: response.ok ? "OpenCTI GraphQL endpoint responded." : `OpenCTI probe returned HTTP ${response.status}.`,
  };
}

async function probeIntelOwl(fetcher: typeof fetch): Promise<OsintServiceProbeResult> {
  const baseUrl = requireEnv("INTELOWL_BASE_URL").replace(/\/+$/, "");
  const apiKey = requireEnv("INTELOWL_API_KEY");
  const response = await fetcher(`${baseUrl}/api/jobs?limit=1`, {
    method: "GET",
    headers: { authorization: `Token ${apiKey}`, accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
    cache: "no-store",
  });
  return {
    connectorId: "intelowl",
    status: response.ok ? "ok" : "failed",
    httpStatus: response.status,
    detail: response.ok ? "IntelOwl REST API responded." : `IntelOwl probe returned HTTP ${response.status}.`,
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing_env:${name}`);
  return value;
}
