import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const REGISTRY_PATH = path.join(ROOT_DIR, "data/osint/upstream-registry.json");

function referenceResult(entry, status, message) {
  const lastSmokeTested = new Date().toISOString();
  return {
    toolId: entry.toolId,
    name: entry.name,
    category: entry.category,
    runtimeType: entry.runtimeType,
    status,
    healthStatus: "REFERENCE_ONLY",
    lastSmokeTested,
    smokeResult: {
      success: true,
      message,
      outputSnippet: entry.upstreamUrl,
    },
  };
}

export async function smokeTool(toolId) {
  const raw = await fs.readFile(REGISTRY_PATH, "utf8");
  const registry = JSON.parse(raw);

  const entry = registry.find(
    (candidate) =>
      candidate.toolId === toolId ||
      candidate.repo?.toLowerCase() === String(toolId).toLowerCase(),
  );

  if (!entry) {
    throw new Error(`Tool not found in registry: ${toolId}`);
  }

  const startTime = Date.now();
  const lastSmokeTested = new Date().toISOString();
  console.info(`[Smoke Test] Probing tool: ${entry.name} (${entry.toolId})...`);

  if (entry.runtimeType === "gui-only") {
    return referenceResult(entry, "GUI_ONLY", "GUI-only catalog reference");
  }

  if (entry.runtimeType === "dataset-only") {
    return referenceResult(entry, "DATASET_ONLY", "Dataset catalog reference");
  }

  if (entry.runtimeType === "library-only") {
    return referenceResult(entry, "LIBRARY_ONLY", "Library catalog reference");
  }

  if (entry.requiresAuth || entry.requiresApiKey) {
    return {
      toolId: entry.toolId,
      name: entry.name,
      category: entry.category,
      runtimeType: entry.runtimeType,
      status: "AUTH_REQUIRED",
      healthStatus: "UNCONFIGURED",
      lastSmokeTested,
      smokeResult: {
        success: false,
        error: "Requires API key or external authentication configured",
      },
    };
  }

  const binaryName = entry.workerCommand
    ? String(entry.workerCommand).split(/\s+/)[0]
    : String(entry.repo || entry.toolId).toLowerCase();

  try {
    const { stdout, stderr } = await execFileAsync(binaryName, ["--help"], {
      timeout: 5000,
      windowsHide: true,
    });

    const latencyMs = Date.now() - startTime;
    const output = (stdout || stderr || "").trim();

    return {
      toolId: entry.toolId,
      name: entry.name,
      category: entry.category,
      runtimeType: entry.runtimeType,
      status: "HEALTHY",
      healthStatus: "HEALTHY",
      lastSmokeTested,
      smokeResult: {
        success: true,
        latencyMs,
        outputSnippet: output.slice(0, 200).replace(/[\r\n]+/g, " "),
      },
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    const isNotFound = code === "ENOENT" || /not recognized|not found/i.test(message);
    const status = isNotFound ? "UNCONFIGURED" : "DEGRADED";
    const errorMessage = isNotFound
      ? `Executable '${binaryName}' not found in current environment PATH`
      : message.slice(0, 200);

    return {
      toolId: entry.toolId,
      name: entry.name,
      category: entry.category,
      runtimeType: entry.runtimeType,
      status,
      healthStatus: status,
      lastSmokeTested,
      smokeResult: {
        success: false,
        latencyMs,
        error: errorMessage,
      },
    };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const toolId = process.argv[2] || "sherlock";
  smokeTool(toolId)
    .then((result) => console.info(JSON.stringify(result, null, 2)))
    .catch((err) => {
      console.error("Smoke error:", err);
      process.exitCode = 1;
    });
}
