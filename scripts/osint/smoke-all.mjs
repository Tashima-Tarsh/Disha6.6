import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { smokeTool } from "./smoke-tool.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const REGISTRY_PATH = path.join(ROOT_DIR, "data/osint/upstream-registry.json");
const RUNTIME_STATUS_PATH = path.join(ROOT_DIR, ".disha/osint/runtime-status.json");

export async function smokeAll(options = {}) {
  const limit = options.limit || 0;
  console.info("Starting local runtime probes across cataloged OSINT tools...");

  const raw = await fs.readFile(REGISTRY_PATH, "utf8");
  const registry = JSON.parse(raw);
  const targets = limit > 0 ? registry.slice(0, limit) : registry;
  const tools = [];

  for (const entry of targets) {
    try {
      tools.push(await smokeTool(entry.toolId));
    } catch (error) {
      tools.push({
        toolId: entry.toolId,
        name: entry.name,
        category: entry.category,
        runtimeType: entry.runtimeType,
        status: "DEGRADED",
        healthStatus: "DEGRADED",
        lastSmokeTested: new Date().toISOString(),
        smokeResult: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  const metrics = tools.reduce(
    (acc, tool) => {
      const key = String(tool.status || "UNKNOWN");
      acc.byStatus[key] = (acc.byStatus[key] || 0) + 1;
      if (tool.healthStatus === "HEALTHY") acc.healthy += 1;
      if (tool.healthStatus === "UNCONFIGURED") acc.unconfigured += 1;
      if (tool.healthStatus === "DEGRADED") acc.degraded += 1;
      if (tool.healthStatus === "REFERENCE_ONLY") acc.referenceOnly += 1;
      if (tool.status === "AUTH_REQUIRED") acc.authRequired += 1;
      return acc;
    },
    {
      healthy: 0,
      unconfigured: 0,
      degraded: 0,
      referenceOnly: 0,
      authRequired: 0,
      byStatus: {},
    },
  );

  const summary = {
    updatedAt: new Date().toISOString(),
    scope: "local_runtime_probe",
    totalCataloged: registry.length,
    tested: tools.length,
    metrics,
    tools,
    truthModel: {
      catalogIsNotRuntime: true,
      resultAppliesOnlyToThisEnvironment: true,
    },
  };

  await fs.mkdir(path.dirname(RUNTIME_STATUS_PATH), { recursive: true });
  await fs.writeFile(RUNTIME_STATUS_PATH, JSON.stringify(summary, null, 2), "utf8");

  console.info(`Runtime probe written to ${RUNTIME_STATUS_PATH}`);
  console.info(
    `Summary: Healthy: ${metrics.healthy}, Unconfigured: ${metrics.unconfigured}, Auth Required: ${metrics.authRequired}, Reference Only: ${metrics.referenceOnly}, Degraded: ${metrics.degraded}`,
  );

  return summary;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const limitArg = process.argv.find((argument) => argument.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : 0;

  smokeAll({ limit }).catch((err) => {
    console.error("Smoke all error:", err);
    process.exitCode = 1;
  });
}
