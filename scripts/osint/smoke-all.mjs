import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { smokeTool } from "./smoke-tool.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const REGISTRY_PATH = path.join(ROOT_DIR, "data/osint/upstream-registry.json");
const RUNTIME_STATUS_PATH = path.join(ROOT_DIR, "data/osint/runtime-status.json");

export async function smokeAll(options = {}) {
  const limit = options.limit || 0;
  console.info("Starting smoke tests across cataloged OSINT tools...");

  const raw = await fs.readFile(REGISTRY_PATH, "utf8");
  const registry = JSON.parse(raw);

  const targets = limit > 0 ? registry.slice(0, limit) : registry;
  console.info(`Running smoke tests on ${targets.length} tools...`);

  let healthyCount = 0;
  let unconfiguredCount = 0;
  let authRequiredCount = 0;
  let degradedCount = 0;
  let referenceOnlyCount = 0;

  for (const entry of targets) {
    try {
      const result = await smokeTool(entry.toolId);
      if (result.success && !result.message) healthyCount++;
      else if (result.message) referenceOnlyCount++;
      else if (entry.status === "AUTH_REQUIRED") authRequiredCount++;
      else if (entry.status === "UNCONFIGURED") unconfiguredCount++;
      else degradedCount++;
    } catch (err) {
      console.warn(`Error smoking ${entry.name}:`, err.message);
    }
  }

  // Reload registry to write summary
  const updatedRaw = await fs.readFile(REGISTRY_PATH, "utf8");
  const updatedRegistry = JSON.parse(updatedRaw);

  const summary = {
    updatedAt: new Date().toISOString(),
    totalCataloged: updatedRegistry.length,
    tested: targets.length,
    metrics: {
      healthy: updatedRegistry.filter((e) => e.status === "HEALTHY").length,
      unconfigured: updatedRegistry.filter((e) => e.status === "UNCONFIGURED").length,
      authRequired: updatedRegistry.filter((e) => e.status === "AUTH_REQUIRED").length,
      degraded: updatedRegistry.filter((e) => e.status === "DEGRADED").length,
      guiOnly: updatedRegistry.filter((e) => e.status === "GUI_ONLY").length,
      datasetOnly: updatedRegistry.filter((e) => e.status === "DATASET_ONLY").length,
      libraryOnly: updatedRegistry.filter((e) => e.status === "LIBRARY_ONLY").length,
      cataloged: updatedRegistry.filter((e) => e.status === "CATALOGED").length,
    },
    tools: updatedRegistry.map((e) => ({
      toolId: e.toolId,
      name: e.name,
      category: e.category,
      runtimeType: e.runtimeType,
      status: e.status,
      healthStatus: e.healthStatus,
      lastSmokeTested: e.lastSmokeTested,
      smokeResult: e.smokeResult,
    })),
  };

  await fs.writeFile(RUNTIME_STATUS_PATH, JSON.stringify(summary, null, 2), "utf8");
  console.info("Smoke test run completed.");
  console.info(`Summary: Healthy: ${summary.metrics.healthy}, Unconfigured: ${summary.metrics.unconfigured}, Auth Required: ${summary.metrics.authRequired}, Reference Only: ${summary.metrics.guiOnly + summary.metrics.datasetOnly + summary.metrics.libraryOnly}, Cataloged: ${summary.metrics.cataloged}`);
  return summary;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 0;
  smokeAll({ limit }).catch((err) => {
    console.error("Smoke all error:", err);
    process.exitCode = 1;
  });
}
