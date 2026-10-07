import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getDbPool } from "../server/db";
import { generatedOsintManifests, type GeneratedOsintToolManifest } from "./generated/osint-tool-manifests.generated";
import { probeOsintServiceConnector } from "./osint-service-connectors";

const execFileAsync = promisify(execFile);

const ASTRA_TOOL_WORKER_CLASS: Record<string, "identity" | "infrastructure" | "advanced"> = {
  phoneinfoga: "identity",
  sherlock: "identity",
  maigret: "identity",
  holehe: "identity",
  instaloader: "identity",
  "telegram-public": "identity",
  telethon: "identity",
  theharvester: "infrastructure",
  amass: "infrastructure",
  "owasp-amass": "infrastructure",
  subfinder: "infrastructure",
  spiderfoot: "advanced",
  "recon-ng": "advanced",
  photon: "advanced",
};

function astraToolEnabled(toolId: string): boolean {
  const canonicalToolId = toolId === "amass" ? "owasp-amass" : toolId === "telethon" ? "telegram-public" : toolId;
  const envKey = `DISHA_ASTRA6_${canonicalToolId.toUpperCase().replace(/-/g, "_")}_ENABLED`;
  return process.env[envKey] === "true" || process.env.DISHA_ASTRA6_ALL_TOOLS_ENABLED === "true";
}

function astraRuntimeReadinessBlock(toolId: string): { status: "AUTH_REQUIRED"; error: string } | null {
  const canonicalToolId = toolId === "amass" ? "owasp-amass" : toolId === "telethon" ? "telegram-public" : toolId;
  const workerClass = ASTRA_TOOL_WORKER_CLASS[toolId];

  if (workerClass === "identity" && process.env.DISHA_IDENTITY_ENUMERATION_APPROVED !== "true") {
    return {
      status: "AUTH_REQUIRED",
      error: "Identity enumeration deployment approval is not enabled",
    };
  }

  if (canonicalToolId === "telegram-public") {
    const telegramConfigured = Boolean(
      process.env.TELEGRAM_API_ID?.trim()
      && process.env.TELEGRAM_API_HASH?.trim()
      && process.env.TELEGRAM_SESSION?.trim(),
    );
    if (!telegramConfigured) {
      return {
        status: "AUTH_REQUIRED",
        error: "Telegram API credentials and an authorized session are required",
      };
    }
  }

  if (canonicalToolId === "photon" && process.env.DISHA_ACTIVE_RECON_APPROVED !== "true") {
    return {
      status: "AUTH_REQUIRED",
      error: "Active reconnaissance deployment approval is not enabled",
    };
  }

  return null;
}

async function smokeAstraRuntime(entry: OsintToolRecord): Promise<OsintToolRecord["smokeResult"]> {
  const workerClass = ASTRA_TOOL_WORKER_CLASS[entry.toolId];
  if (!workerClass) return null;
  const started = Date.now();

  if (!astraToolEnabled(entry.toolId)) {
    entry.status = "UNCONFIGURED";
    entry.healthStatus = "UNCONFIGURED";
    entry.lastSmokeTested = new Date().toISOString();
    return {
      success: false,
      latencyMs: Date.now() - started,
      error: `ASTRA tool '${entry.toolId}' is not enabled in this deployment`,
    };
  }

  const readinessBlock = astraRuntimeReadinessBlock(entry.toolId);
  if (readinessBlock) {
    entry.status = readinessBlock.status;
    entry.healthStatus = "UNCONFIGURED";
    entry.lastSmokeTested = new Date().toISOString();
    return {
      success: false,
      latencyMs: Date.now() - started,
      error: readinessBlock.error,
    };
  }

  const pool = getDbPool();
  if (!pool) {
    entry.status = "UNCONFIGURED";
    entry.healthStatus = "UNCONFIGURED";
    entry.lastSmokeTested = new Date().toISOString();
    return { success: false, latencyMs: Date.now() - started, error: "DATABASE_URL is required for ASTRA worker health" };
  }

  const result = await pool.query(
    `select worker_id, status, last_heartbeat
       from disha_worker_heartbeats
      where worker_class=$1 and last_heartbeat > now() - interval '45 seconds'
      order by last_heartbeat desc
      limit 1`,
    [workerClass],
  );
  const row = result.rows[0] as { worker_id?: string; status?: string; last_heartbeat?: Date } | undefined;
  if (!row || row.status !== "HEALTHY") {
    entry.status = "DEGRADED";
    entry.healthStatus = "DEGRADED";
    entry.lastSmokeTested = new Date().toISOString();
    return {
      success: false,
      latencyMs: Date.now() - started,
      error: `ASTRA ${workerClass} worker has no healthy heartbeat in the last 45 seconds`,
    };
  }

  entry.status = "HEALTHY";
  entry.healthStatus = "HEALTHY";
  entry.lastSmokeTested = new Date().toISOString();
  return {
    success: true,
    latencyMs: Date.now() - started,
    message: `ASTRA ${workerClass} worker healthy`,
    outputSnippet: String(row.worker_id ?? workerClass),
  };
}

async function smokeServiceRuntime(entry: OsintToolRecord): Promise<OsintToolRecord["smokeResult"]> {
  if (entry.toolId !== "opencti" && entry.toolId !== "intelowl") return null;
  const started = Date.now();
  const probe = await probeOsintServiceConnector(entry.toolId);
  entry.lastSmokeTested = new Date().toISOString();

  if (probe.status === "ok") {
    entry.status = "HEALTHY";
    entry.healthStatus = "HEALTHY";
    return { success: true, latencyMs: Date.now() - started, message: probe.detail };
  }
  if (probe.status === "skipped") {
    entry.status = "AUTH_REQUIRED";
    entry.healthStatus = "UNCONFIGURED";
    return { success: false, latencyMs: Date.now() - started, error: probe.detail };
  }

  entry.status = "DEGRADED";
  entry.healthStatus = "DEGRADED";
  return { success: false, latencyMs: Date.now() - started, error: probe.detail };
}

export type OsintToolRecord = {
  toolId: string;
  name: string;
  fullName: string;
  upstreamUrl: string;
  owner: string;
  repo: string;
  description: string;
  category: string;
  categories: string[];
  targetInputs: string[];
  runtimeType: string;
  status: string;
  healthStatus: string;
  catalogStatus?: string;
  catalogHealthStatus?: string;
  defaultBranch: string;
  pinnedSha: string | null;
  upstreamSha: string | null;
  upstreamStatus?: "VERIFIED" | "UNVERIFIED" | "UNAVAILABLE" | "UNKNOWN";
  upstreamVerifiedAt?: string | null;
  forkUrl: string | null;
  forkStatus: string;
  license: string;
  stars: number;
  isArchived: boolean;
  workerCommand: string | null;
  workerRuntime: string | null;
  requiresAuth: boolean;
  requiresApiKey: boolean;
  apiKeys: string[];
  lastVerified: string;
  lastSmokeTested: string | null;
  smokeResult: {
    success: boolean;
    latencyMs?: number;
    outputSnippet?: string;
    error?: string;
    message?: string;
  } | null;
  executionClass: string;
};

export type OsintRuntimeMetrics = {
  total: number;
  healthy: number;
  degraded: number;
  unconfigured: number;
  authRequired: number;
  guiOnly: number;
  datasetOnly: number;
  libraryOnly: number;
  forked: number;
  pendingFork: number;
  upstreamVerified: number;
  upstreamUnverified: number;
  upstreamUnavailable: number;
  executableVerified: number;
  serviceVerified: number;
  datasetIntegrated: number;
  libraryIntegrated: number;
  guiIntegrated: number;
  credentialRequired: number;
  policyRestricted: number;
  upstreamDead: number;
  licenseBlocked: number;
  technicallyImpossible: number;
  byCategory: Record<string, number>;
  byRuntime: Record<string, number>;
};

function getRegistryFilePath(): string {
  return path.resolve(process.cwd(), "../data/osint/upstream-registry.json");
}

function getFallbackRegistryFilePath(): string {
  return path.resolve(process.cwd(), "data/osint/upstream-registry.json");
}

export async function loadOsintRegistry(): Promise<OsintToolRecord[]> {
  const pathsToTry = [getRegistryFilePath(), getFallbackRegistryFilePath()];

  for (const filePath of pathsToTry) {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return list as OsintToolRecord[];
      }
    } catch {
      // try next path
    }
  }

  // Fallback to compiled static manifests if data file is absent in runtime container
  return generatedOsintManifests.map((m: GeneratedOsintToolManifest): OsintToolRecord => ({
    toolId: m.toolId,
    name: m.name,
    fullName: m.fullName || `${m.toolId}/${m.toolId}`,
    upstreamUrl: m.repository,
    owner: m.fullName ? m.fullName.split("/")[0] : "upstream",
    repo: m.fullName ? m.fullName.split("/")[1] : m.toolId,
    description: `OSINT tool ${m.name}`,
    category: m.category || "framework",
    categories: m.capabilities,
    targetInputs: m.targetTypes,
    runtimeType: m.workerRuntime,
    status: m.status || "CATALOGED",
    healthStatus: "UNCONFIGURED",
    defaultBranch: "main",
    pinnedSha: m.pinnedSha,
    upstreamSha: m.upstreamSha,
    upstreamStatus: m.upstreamSha ? "VERIFIED" : "UNVERIFIED",
    upstreamVerifiedAt: null,
    forkUrl: m.forkUrl,
    forkStatus: m.forkStatus,
    license: m.license,
    stars: 0,
    isArchived: false,
    workerCommand: m.cliCommand,
    workerRuntime: m.workerRuntime,
    requiresAuth: false,
    requiresApiKey: false,
    apiKeys: [],
    lastVerified: m.registeredAt,
    lastSmokeTested: null,
    smokeResult: null,
    executionClass: m.executionClass,
  }));
}

export async function saveOsintRegistry(registry: OsintToolRecord[]): Promise<void> {
  const pathsToTry = [getRegistryFilePath(), getFallbackRegistryFilePath()];
  for (const filePath of pathsToTry) {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(registry, null, 2), "utf8");
      return;
    } catch {
      // try next path
    }
  }
}

export async function loadOsintRuntimeRegistry(): Promise<OsintToolRecord[]> {
  const registry = (await loadOsintRegistry()).map((tool) => ({
    ...tool,
    catalogStatus: tool.status,
    catalogHealthStatus: tool.healthStatus,
    smokeResult: tool.smokeResult ? { ...tool.smokeResult } : null,
  }));
  const checkedAt = new Date().toISOString();

  // The upstream registry is catalog/provenance metadata, not live telemetry.
  // Only runtimes owned by DISHA (ASTRA workers and governed service connectors)
  // are allowed to present deployment health from this API. Everything else is
  // explicitly catalog/reference-only until an owned executor is wired.
  const governedServices = new Set(["opencti", "intelowl"]);
  for (const tool of registry) {
    if (ASTRA_TOOL_WORKER_CLASS[tool.toolId] || governedServices.has(tool.toolId)) continue;

    tool.lastSmokeTested = null;
    tool.smokeResult = null;

    if (tool.runtimeType === "dataset-only") {
      tool.status = "DATASET_ONLY";
      tool.healthStatus = "REFERENCE_ONLY";
    } else if (tool.runtimeType === "library-only") {
      tool.status = "LIBRARY_ONLY";
      tool.healthStatus = "REFERENCE_ONLY";
    } else if (tool.runtimeType === "gui-only") {
      tool.status = "GUI_ONLY";
      tool.healthStatus = "REFERENCE_ONLY";
    } else {
      tool.status = "CATALOGED";
      tool.healthStatus = "UNCONFIGURED";
    }
  }
  const workerClasses = [...new Set(
    registry
      .filter((tool) => ASTRA_TOOL_WORKER_CLASS[tool.toolId] && astraToolEnabled(tool.toolId) && !astraRuntimeReadinessBlock(tool.toolId))
      .map((tool) => ASTRA_TOOL_WORKER_CLASS[tool.toolId])
      .filter((value): value is "identity" | "infrastructure" | "advanced" => Boolean(value)),
  )];

  const pool = getDbPool();
  const workerHealth = new Map<string, { workerId?: string; status?: string }>();
  let workerProbeError: string | null = null;

  if (pool && workerClasses.length > 0) {
    try {
      const result = await pool.query(
        `select distinct on (worker_class) worker_class, worker_id, status, last_heartbeat
           from disha_worker_heartbeats
          where worker_class = ANY($1::text[])
            and last_heartbeat > now() - interval '45 seconds'
          order by worker_class, last_heartbeat desc`,
        [workerClasses],
      );
      for (const row of result.rows as Array<{ worker_class?: string; worker_id?: string; status?: string }>) {
        if (row.worker_class) workerHealth.set(row.worker_class, { workerId: row.worker_id, status: row.status });
      }
    } catch (error) {
      workerProbeError = error instanceof Error ? error.message : String(error);
    }
  }

  for (const tool of registry) {
    const workerClass = ASTRA_TOOL_WORKER_CLASS[tool.toolId];
    if (!workerClass) continue;

    tool.lastSmokeTested = checkedAt;

    if (!astraToolEnabled(tool.toolId)) {
      tool.status = "UNCONFIGURED";
      tool.healthStatus = "UNCONFIGURED";
      tool.smokeResult = {
        success: false,
        error: `ASTRA tool '${tool.toolId}' is not enabled in this deployment`,
      };
      continue;
    }

    const readinessBlock = astraRuntimeReadinessBlock(tool.toolId);
    if (readinessBlock) {
      tool.status = readinessBlock.status;
      tool.healthStatus = "UNCONFIGURED";
      tool.smokeResult = { success: false, error: readinessBlock.error };
      continue;
    }

    if (!pool) {
      tool.status = "UNCONFIGURED";
      tool.healthStatus = "UNCONFIGURED";
      tool.smokeResult = { success: false, error: "DATABASE_URL is required for ASTRA worker health" };
      continue;
    }

    if (workerProbeError) {
      tool.status = "DEGRADED";
      tool.healthStatus = "DEGRADED";
      tool.smokeResult = { success: false, error: `ASTRA worker heartbeat probe failed: ${workerProbeError.slice(0, 200)}` };
      continue;
    }

    const heartbeat = workerHealth.get(workerClass);
    if (!heartbeat || heartbeat.status !== "HEALTHY") {
      tool.status = "DEGRADED";
      tool.healthStatus = "DEGRADED";
      tool.smokeResult = {
        success: false,
        error: `ASTRA ${workerClass} worker has no healthy heartbeat in the last 45 seconds`,
      };
      continue;
    }

    tool.status = "HEALTHY";
    tool.healthStatus = "HEALTHY";
    tool.smokeResult = {
      success: true,
      message: `ASTRA ${workerClass} worker healthy`,
      outputSnippet: heartbeat.workerId ?? workerClass,
    };
  }

  const serviceIds = ["opencti", "intelowl"] as const;
  const serviceProbes = await Promise.all(serviceIds.map(async (connectorId) => {
    try {
      return await probeOsintServiceConnector(connectorId);
    } catch (error) {
      return {
        connectorId,
        status: "failed" as const,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }));

  for (const probe of serviceProbes) {
    const tool = registry.find((entry) => entry.toolId === probe.connectorId);
    if (!tool) continue;
    tool.lastSmokeTested = checkedAt;

    if (probe.status === "ok") {
      tool.status = "HEALTHY";
      tool.healthStatus = "HEALTHY";
      tool.smokeResult = { success: true, message: probe.detail };
    } else if (probe.status === "skipped") {
      tool.status = "AUTH_REQUIRED";
      tool.healthStatus = "UNCONFIGURED";
      tool.smokeResult = { success: false, error: probe.detail };
    } else {
      tool.status = "DEGRADED";
      tool.healthStatus = "DEGRADED";
      tool.smokeResult = { success: false, error: probe.detail };
    }
  }

  return registry;
}

export async function getOsintMetrics(): Promise<OsintRuntimeMetrics> {
  const registry = await loadOsintRuntimeRegistry();

  const metrics: OsintRuntimeMetrics = {
    total: registry.length,
    healthy: 0,
    degraded: 0,
    unconfigured: 0,
    authRequired: 0,
    guiOnly: 0,
    datasetOnly: 0,
    libraryOnly: 0,
    forked: 0,
    pendingFork: 0,
    upstreamVerified: 0,
    upstreamUnverified: 0,
    upstreamUnavailable: 0,
    executableVerified: 0,
    serviceVerified: 0,
    datasetIntegrated: 0,
    libraryIntegrated: 0,
    guiIntegrated: 0,
    credentialRequired: 0,
    policyRestricted: 0,
    upstreamDead: 0,
    licenseBlocked: 0,
    technicallyImpossible: 0,
    byCategory: {},
    byRuntime: {},
  };

  for (const tool of registry) {
    if (tool.status === "EXECUTABLE_VERIFIED" || tool.status === "HEALTHY") {
      metrics.healthy++;
      metrics.executableVerified++;
    } else if (tool.status === "SERVICE_VERIFIED") {
      metrics.healthy++;
      metrics.serviceVerified++;
    } else if (tool.status === "DATASET_INTEGRATED" || tool.status === "DATASET_ONLY") {
      metrics.datasetOnly++;
      metrics.datasetIntegrated++;
    } else if (tool.status === "LIBRARY_INTEGRATED" || tool.status === "LIBRARY_ONLY") {
      metrics.libraryOnly++;
      metrics.libraryIntegrated++;
    } else if (tool.status === "GUI_INTEGRATED" || tool.status === "GUI_ONLY") {
      metrics.guiOnly++;
      metrics.guiIntegrated++;
    } else if (tool.status === "CREDENTIAL_REQUIRED" || tool.status === "AUTH_REQUIRED") {
      metrics.authRequired++;
      metrics.credentialRequired++;
    } else if (tool.status === "POLICY_RESTRICTED") {
      metrics.degraded++;
      metrics.policyRestricted++;
    } else if (tool.status === "UPSTREAM_DEAD") {
      metrics.upstreamDead++;
    } else if (tool.status === "DEGRADED") {
      metrics.degraded++;
    } else {
      metrics.unconfigured++;
    }

    if (tool.forkStatus === "FORKED") metrics.forked++;
    else metrics.pendingFork++;

    if (tool.upstreamStatus === "VERIFIED") {
      metrics.upstreamVerified++;
    } else if (tool.upstreamStatus === "UNAVAILABLE") {
      metrics.upstreamUnavailable++;
    } else {
      metrics.upstreamUnverified++;
    }

    const cat = tool.category || "general";
    metrics.byCategory[cat] = (metrics.byCategory[cat] || 0) + 1;

    const rt = tool.runtimeType || "other";
    metrics.byRuntime[rt] = (metrics.byRuntime[rt] || 0) + 1;
  }

  return metrics;
}

export async function getOsintToolById(toolId: string): Promise<OsintToolRecord | undefined> {
  const registry = await loadOsintRuntimeRegistry();
  return registry.find(
    (t) => t.toolId.toLowerCase() === toolId.toLowerCase() || t.repo.toLowerCase() === toolId.toLowerCase(),
  );
}

export async function smokeTestOsintTool(toolId: string): Promise<OsintToolRecord["smokeResult"]> {
  const registry = await loadOsintRegistry();
  const sourceEntry = registry.find(
    (t) => t.toolId.toLowerCase() === toolId.toLowerCase() || t.repo.toLowerCase() === toolId.toLowerCase(),
  );
  const entry = sourceEntry
    ? { ...sourceEntry, smokeResult: sourceEntry.smokeResult ? { ...sourceEntry.smokeResult } : null }
    : undefined;

  if (!entry) {
    throw new Error(`Tool not found: ${toolId}`);
  }

  const startTime = Date.now();

  const astraResult = await smokeAstraRuntime(entry);
  if (astraResult) {
    entry.smokeResult = astraResult;
    return entry.smokeResult;
  }

  const serviceResult = await smokeServiceRuntime(entry);
  if (serviceResult) {
    entry.smokeResult = serviceResult;
    return entry.smokeResult;
  }

  if (entry.runtimeType === "gui-only" || entry.status === "GUI_ONLY") {
    entry.smokeResult = { success: true, message: "GUI-only web tool verified reference", outputSnippet: entry.upstreamUrl };
    entry.status = "GUI_ONLY";
    entry.healthStatus = "REFERENCE_ONLY";
    entry.lastSmokeTested = new Date().toISOString();
    return entry.smokeResult;
  }

  if (entry.runtimeType === "dataset-only" || entry.status === "DATASET_ONLY") {
    entry.smokeResult = { success: true, message: "Dataset repository verified reference", outputSnippet: entry.upstreamUrl };
    entry.status = "DATASET_ONLY";
    entry.healthStatus = "REFERENCE_ONLY";
    entry.lastSmokeTested = new Date().toISOString();
    return entry.smokeResult;
  }

  if (entry.runtimeType === "library-only" || entry.status === "LIBRARY_ONLY") {
    entry.smokeResult = { success: true, message: "Library SDK verified reference", outputSnippet: entry.upstreamUrl };
    entry.status = "LIBRARY_ONLY";
    entry.healthStatus = "REFERENCE_ONLY";
    entry.lastSmokeTested = new Date().toISOString();
    return entry.smokeResult;
  }

  if (entry.requiresAuth || entry.requiresApiKey) {
    entry.smokeResult = { success: false, error: "Requires provider API key or authentication tokens configured" };
    entry.status = "AUTH_REQUIRED";
    entry.healthStatus = "UNCONFIGURED";
    entry.lastSmokeTested = new Date().toISOString();
    return entry.smokeResult;
  }

  let binaryName = entry.workerCommand ? entry.workerCommand.split(/\s+/)[0] : entry.repo.toLowerCase();
  binaryName = binaryName.replace(/[^a-zA-Z0-9_.-]/g, "");

  try {
    const { stdout, stderr } = await execFileAsync(binaryName, ["--help"], {
      timeout: 5000,
      windowsHide: true,
    });
    const latencyMs = Date.now() - startTime;
    const output = (stdout || stderr || "").trim();
    entry.smokeResult = {
      success: true,
      latencyMs,
      outputSnippet: output.slice(0, 200).replace(/[\r\n]+/g, " "),
    };
    entry.status = "HEALTHY";
    entry.healthStatus = "HEALTHY";
    entry.lastSmokeTested = new Date().toISOString();
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorObj = err as { code?: string; message?: string };
    const isNotFound = errorObj.code === "ENOENT" || (errorObj.message && errorObj.message.includes("not recognized"));
    const errorMsg = isNotFound
      ? `Executable '${binaryName}' not found in current environment PATH`
      : (errorObj.message || "Unknown error").slice(0, 200);

    entry.smokeResult = {
      success: false,
      latencyMs,
      error: errorMsg,
    };
    entry.status = isNotFound ? "UNCONFIGURED" : "DEGRADED";
    entry.healthStatus = isNotFound ? "UNCONFIGURED" : "DEGRADED";
    entry.lastSmokeTested = new Date().toISOString();
  }

  return entry.smokeResult;
}
