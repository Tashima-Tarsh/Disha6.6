/**
 * DISHA 6.6 — Fleet-Wide OSINT Smoke Probe Runner
 * Evaluates all 532 inventory tools in bounded batches with resumable checkpoints,
 * updating runtime metrics and persistent status logs.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { smokeTool } from "./smoke-tool.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const REGISTRY_PATH = path.join(ROOT_DIR, "data/osint/upstream-registry.json");
const STATUS_PATH = path.join(ROOT_DIR, "data/osint/runtime-status.json");
const CHECKPOINT_PATH = path.join(ROOT_DIR, "data/osint/.smoke-checkpoint.json");

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
  const batchSize = options.batchSize || 20;
  const resume = options.resume !== false;

  console.info("=== DISHA 6.6 — Fleet-Wide OSINT Smoke Verification ===");

  const raw = await fs.readFile(REGISTRY_PATH, "utf8");
  const registry = JSON.parse(raw);

  let processedSet = new Set();
  if (resume) {
    try {
      const cpRaw = await fs.readFile(CHECKPOINT_PATH, "utf8");
      const cp = JSON.parse(cpRaw);
      processedSet = new Set(cp.processed || []);
      console.info(`Resuming from checkpoint with ${processedSet.size} already processed tools.`);
    } catch {
      // fresh run
    }
  }

  const targets = (limit > 0 ? registry.slice(0, limit) : registry).filter((t) => !processedSet.has(t.toolId));
  console.info(`Targeting ${targets.length} tools for evaluation (batch size: ${batchSize})...`);

  for (let i = 0; i < targets.length; i += batchSize) {
    const batch = targets.slice(i, i + batchSize);
    console.info(`[Smoke Batch] Processing tools ${i + 1} to ${Math.min(i + batchSize, targets.length)} of ${targets.length}...`);

    for (const entry of batch) {
      try {
        await smokeTool(entry.toolId);
        processedSet.add(entry.toolId);
      } catch (err) {
        console.warn(`Error evaluating ${entry.name}:`, err.message);
      }
    }

    // Save checkpoint
    await fs.writeFile(CHECKPOINT_PATH, JSON.stringify({
      updatedAt: new Date().toISOString(),
      processedCount: processedSet.size,
      processed: [...processedSet],
    }, null, 2), "utf8");
  }

  // Reload registry to compute final metrics
  const updatedRaw = await fs.readFile(REGISTRY_PATH, "utf8");
  const updatedRegistry = JSON.parse(updatedRaw);

  const metrics = {
    totalCataloged: updatedRegistry.length,
    tested: updatedRegistry.length,
    runnableSmokePassed: 0,
    smokeFailed: 0,
    smokeMissing: 0,
    authOrKeyRequired: 0,
    referenceOnly: 0,
    catalogueOnly: 0,
    guiOnly: 0,
    datasetOnly: 0,
    libraryOnly: 0,
    cataloged: 0,
    byRuntimeEvidence: {
      RUNNABLE_SMOKE_PASS: 0,
      REFERENCE_ONLY: 0,
      AUTH_OR_KEY_REQUIRED: 0,
      SMOKE_FAILED: 0,
      SMOKE_MISSING: 0,
      CATALOGUE_ONLY: 0,
    },
    byCategory: {},
    byRuntime: {},
  };

  const statusTools = updatedRegistry.map((entry) => {
    const evidenceState = runtimeEvidenceState(entry);
    metrics.byRuntimeEvidence[evidenceState] = (metrics.byRuntimeEvidence[evidenceState] || 0) + 1;

    if (evidenceState === "RUNNABLE_SMOKE_PASS") metrics.runnableSmokePassed++;
    else if (evidenceState === "REFERENCE_ONLY") {
      metrics.referenceOnly++;
      if (entry.runtimeType === "gui-only") metrics.guiOnly++;
      if (entry.runtimeType === "dataset-only") metrics.datasetOnly++;
      if (entry.runtimeType === "library-only") metrics.libraryOnly++;
    } else if (evidenceState === "AUTH_OR_KEY_REQUIRED") metrics.authOrKeyRequired++;
    else if (evidenceState === "SMOKE_FAILED") metrics.smokeFailed++;
    else if (evidenceState === "SMOKE_MISSING") metrics.smokeMissing++;
    else metrics.catalogueOnly++;

    const cat = entry.category || "general";
    metrics.byCategory[cat] = (metrics.byCategory[cat] || 0) + 1;

    const rt = entry.runtimeType || "other";
    metrics.byRuntime[rt] = (metrics.byRuntime[rt] || 0) + 1;

    return {
      toolId: entry.toolId,
      name: entry.name,
      category: entry.category,
      runtimeType: entry.runtimeType,
      status: entry.status,
      healthStatus: entry.healthStatus,
      lastSmokeTested: entry.lastSmokeTested || null,
      smokeResult: entry.smokeResult || null,
      runtimeEvidenceState: evidenceState,
      runnableVerified: hasRunnableSmokePass(entry),
    };
  });

  const updatedStatus = {
    updatedAt: new Date().toISOString(),
    totalCataloged: updatedRegistry.length,
    tested: updatedRegistry.length,
    metrics,
    tools: statusTools,
  };

  await fs.writeFile(STATUS_PATH, JSON.stringify(updatedStatus, null, 2), "utf8");
  console.info(`Updated runtime-status.json: ${metrics.totalCataloged} tools accounted for.`);
  console.info("=== Smoke verification run complete ===");
  return metrics;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  smokeAll().catch((err) => {
    console.error("Smoke all error:", err);
    process.exitCode = 1;
  });
}
