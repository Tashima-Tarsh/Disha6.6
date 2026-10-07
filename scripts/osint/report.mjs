import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const REGISTRY_PATH = path.join(ROOT_DIR, "data/osint/upstream-registry.json");
const RUNTIME_STATUS_PATH = path.join(ROOT_DIR, ".disha/osint/runtime-status.json");
const REPORT_DIR = path.join(ROOT_DIR, ".disha/osint/reports");
const REPORT_JSON_PATH = path.join(REPORT_DIR, "osint-runtime-report.json");
const REPORT_MD_PATH = path.join(REPORT_DIR, "osint-runtime-report.md");

async function readRuntimeStatus() {
  try {
    return JSON.parse(await fs.readFile(RUNTIME_STATUS_PATH, "utf8"));
  } catch {
    return null;
  }
}

function increment(bucket, value) {
  const key = String(value || "UNKNOWN");
  bucket[key] = (bucket[key] || 0) + 1;
}

export async function generateReport() {
  console.info("Generating OSINT catalog and local-runtime report...");

  const raw = await fs.readFile(REGISTRY_PATH, "utf8");
  const registry = JSON.parse(raw);
  const runtime = await readRuntimeStatus();
  const runtimeByTool = new Map(
    Array.isArray(runtime?.tools)
      ? runtime.tools.map((tool) => [tool.toolId, tool])
      : [],
  );

  const byRuntime = {};
  const byCategory = {};
  const byCatalogStatus = {};
  const byUpstreamStatus = {};
  const byRuntimeStatus = {};

  for (const tool of registry) {
    increment(byRuntime, tool.runtimeType || tool.workerRuntime);
    increment(byCategory, tool.category);
    increment(byCatalogStatus, tool.status);
    increment(byUpstreamStatus, tool.upstreamStatus);

    const runtimeTool = runtimeByTool.get(tool.toolId);
    if (runtimeTool) increment(byRuntimeStatus, runtimeTool.status);
  }

  const generatedAt = new Date().toISOString();
  const reportData = {
    generatedAt,
    totalCataloged: registry.length,
    runtimeSnapshotAt: runtime?.updatedAt || null,
    runtimeSnapshotScope: runtime?.scope || null,
    metrics: {
      byRuntime,
      byCategory,
      byCatalogStatus,
      byUpstreamStatus,
      byRuntimeStatus,
    },
    truthModel: {
      catalogIsNotRuntime: true,
      upstreamVerificationIsNotRuntimeHealth: true,
      runtimeSnapshotAppliesOnlyToEnvironmentWhereProbeRan: true,
    },
    tools: registry.map((tool) => {
      const runtimeTool = runtimeByTool.get(tool.toolId);
      return {
        toolId: tool.toolId,
        name: tool.name,
        fullName: tool.fullName,
        upstreamUrl: tool.upstreamUrl,
        category: tool.category,
        runtimeType: tool.runtimeType,
        upstreamStatus: tool.upstreamStatus,
        catalogStatus: tool.status,
        runtimeStatus: runtimeTool?.status || null,
        runtimeHealthStatus: runtimeTool?.healthStatus || null,
        runtimeSmokeResult: runtimeTool?.smokeResult || null,
        license: tool.license,
        pinnedSha: tool.pinnedSha,
        upstreamSha: tool.upstreamSha,
      };
    }),
  };

  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.writeFile(REPORT_JSON_PATH, JSON.stringify(reportData, null, 2), "utf8");

  const markdown = [
    "# DISHA6.6 OSINT Catalog / Runtime Report",
    "",
    `Generated: ${generatedAt}`,
    "",
    "> Catalog metadata, upstream verification and runtime readiness are separate states.",
    "",
    `Catalog entries: **${registry.length}**`,
    `Runtime snapshot: **${runtime?.updatedAt || "not available"}**`,
    "",
    "## Catalog status",
    "",
    ...Object.entries(byCatalogStatus)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Local runtime status",
    "",
    ...(runtime
      ? Object.entries(byRuntimeStatus)
          .sort((a, b) => b[1] - a[1])
          .map(([key, value]) => `- ${key}: ${value}`)
      : ["No local runtime smoke snapshot is available. Run `npm run osint:health`."]),
    "",
    "## Runtime distribution",
    "",
    ...Object.entries(byRuntime)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Category distribution",
    "",
    ...Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => `- ${key}: ${value}`),
    "",
    `Machine-readable report: ${REPORT_JSON_PATH}`,
    "",
  ].join("\n");

  await fs.writeFile(REPORT_MD_PATH, markdown, "utf8");
  console.info(`Report generated at ${REPORT_DIR}`);
  return { jsonPath: REPORT_JSON_PATH, mdPath: REPORT_MD_PATH };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateReport().catch((err) => {
    console.error("Report generation error:", err);
    process.exitCode = 1;
  });
}
