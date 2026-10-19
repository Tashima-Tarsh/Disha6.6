import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { smokeTool } from "./smoke-tool.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const REGISTRY_PATH = path.join(ROOT_DIR, "data/osint/upstream-registry.json");
const RUNTIME_STATUS_PATH = path.join(ROOT_DIR, "data/osint/runtime-status.json");

function isReferenceOnly(entry) {
  return ["dataset-only", "library-only", "gui-only", "documentation"].includes(entry.runtimeType)
    || ["DATASET_ONLY", "DATASET_INTEGRATED", "LIBRARY_ONLY", "LIBRARY_INTEGRATED", "GUI_ONLY", "GUI_INTEGRATED", "REFERENCE_ONLY"].includes(entry.status);
}

function hasRunnableSmokePass(entry) {
  return Boolean(entry.lastSmokeTested && entry.smokeResult?.success === true && !isReferenceOnly(entry));
}

function runtimeEvidenceState(entry) {
  if (hasRunnableSmokePass(entry)) return "RUNNABLE_SMOKE_PASS";
  if (isReferenceOnly(entry)) return "REFERENCE_ONLY";
  if (entry.requiresAuth || entry.requiresApiKey || ["AUTH_REQUIRED", "CREDENTIAL_REQUIRED"].includes(entry.status)) return "AUTH_OR_KEY_REQUIRED";
  if (entry.smokeResult?.success === false) return "SMOKE_FAILED";
  if (!entry.lastSmokeTested || !entry.smokeResult) return "SMOKE_MISSING";
  return "CATALOGUE_ONLY";
}

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
  const byRuntimeEvidence = {};
  for (const entry of updatedRegistry) {
    const state = runtimeEvidenceState(entry);
    byRuntimeEvidence[state] = (byRuntimeEvidence[state] || 0) + 1;
  }

  const summary = {
    updatedAt: new Date().toISOString(),
    totalCataloged: updatedRegistry.length,
    tested: targets.length,
    metrics: {
      runnableSmokePassed: updatedRegistry.filter(hasRunnableSmokePass).length,
      smokeFailed: byRuntimeEvidence.SMOKE_FAILED || 0,
      smokeMissing: byRuntimeEvidence.SMOKE_MISSING || 0,
      authOrKeyRequired: byRuntimeEvidence.AUTH_OR_KEY_REQUIRED || 0,
      referenceOnly: byRuntimeEvidence.REFERENCE_ONLY || 0,
      catalogueOnly: byRuntimeEvidence.CATALOGUE_ONLY || 0,
      guiOnly: updatedRegistry.filter((e) => e.status === "GUI_ONLY").length,
      datasetOnly: updatedRegistry.filter((e) => e.status === "DATASET_ONLY").length,
      libraryOnly: updatedRegistry.filter((e) => e.status === "LIBRARY_ONLY").length,
      cataloged: updatedRegistry.filter((e) => e.status === "CATALOGED").length,
      byRuntimeEvidence,
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
      runtimeEvidenceState: runtimeEvidenceState(e),
      runnableVerified: hasRunnableSmokePass(e),
    })),
  };

  await fs.writeFile(RUNTIME_STATUS_PATH, JSON.stringify(summary, null, 2), "utf8");
  console.info("Smoke test run completed.");
  console.info(`Summary: Runnable smoke passed: ${summary.metrics.runnableSmokePassed}, Smoke failed: ${summary.metrics.smokeFailed}, Smoke missing: ${summary.metrics.smokeMissing}, Auth/API key required: ${summary.metrics.authOrKeyRequired}, Reference only: ${summary.metrics.referenceOnly}, Catalogue only: ${summary.metrics.catalogueOnly}`);
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
