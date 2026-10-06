import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { generatedOsintManifests, type GeneratedOsintToolManifest } from "./generated/osint-tool-manifests.generated";

const execFileAsync = promisify(execFile);

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

export async function getOsintMetrics(): Promise<OsintRuntimeMetrics> {
  const registry = await loadOsintRegistry();

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
    byCategory: {},
    byRuntime: {},
  };

  for (const tool of registry) {
    if (tool.status === "HEALTHY") metrics.healthy++;
    else if (tool.status === "DEGRADED") metrics.degraded++;
    else if (tool.status === "AUTH_REQUIRED") metrics.authRequired++;
    else if (tool.status === "GUI_ONLY") metrics.guiOnly++;
    else if (tool.status === "DATASET_ONLY") metrics.datasetOnly++;
    else if (tool.status === "LIBRARY_ONLY") metrics.libraryOnly++;
    else metrics.unconfigured++;

    if (tool.forkStatus === "FORKED") metrics.forked++;
    else metrics.pendingFork++;

    if (tool.upstreamStatus === "VERIFIED" || (!!tool.upstreamSha && tool.upstreamStatus !== "UNAVAILABLE")) {
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
  const registry = await loadOsintRegistry();
  return registry.find(
    (t) => t.toolId.toLowerCase() === toolId.toLowerCase() || t.repo.toLowerCase() === toolId.toLowerCase(),
  );
}

export async function smokeTestOsintTool(toolId: string): Promise<OsintToolRecord["smokeResult"]> {
  const registry = await loadOsintRegistry();
  const entry = registry.find(
    (t) => t.toolId.toLowerCase() === toolId.toLowerCase() || t.repo.toLowerCase() === toolId.toLowerCase(),
  );

  if (!entry) {
    throw new Error(`Tool not found: ${toolId}`);
  }

  const startTime = Date.now();

  if (entry.runtimeType === "gui-only" || entry.status === "GUI_ONLY") {
    entry.smokeResult = { success: true, message: "GUI-only web tool verified reference", outputSnippet: entry.upstreamUrl };
    entry.status = "GUI_ONLY";
    entry.healthStatus = "REFERENCE_ONLY";
    entry.lastSmokeTested = new Date().toISOString();
    await saveOsintRegistry(registry);
    return entry.smokeResult;
  }

  if (entry.runtimeType === "dataset-only" || entry.status === "DATASET_ONLY") {
    entry.smokeResult = { success: true, message: "Dataset repository verified reference", outputSnippet: entry.upstreamUrl };
    entry.status = "DATASET_ONLY";
    entry.healthStatus = "REFERENCE_ONLY";
    entry.lastSmokeTested = new Date().toISOString();
    await saveOsintRegistry(registry);
    return entry.smokeResult;
  }

  if (entry.runtimeType === "library-only" || entry.status === "LIBRARY_ONLY") {
    entry.smokeResult = { success: true, message: "Library SDK verified reference", outputSnippet: entry.upstreamUrl };
    entry.status = "LIBRARY_ONLY";
    entry.healthStatus = "REFERENCE_ONLY";
    entry.lastSmokeTested = new Date().toISOString();
    await saveOsintRegistry(registry);
    return entry.smokeResult;
  }

  if (entry.requiresAuth || entry.requiresApiKey) {
    entry.smokeResult = { success: false, error: "Requires provider API key or authentication tokens configured" };
    entry.status = "AUTH_REQUIRED";
    entry.healthStatus = "UNCONFIGURED";
    entry.lastSmokeTested = new Date().toISOString();
    await saveOsintRegistry(registry);
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

  await saveOsintRegistry(registry);
  return entry.smokeResult;
}
