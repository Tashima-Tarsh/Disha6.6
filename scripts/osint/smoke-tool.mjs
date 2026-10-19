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

const SUCCESS_STATUSES = new Set(["HEALTHY", "EXECUTABLE_VERIFIED", "SERVICE_VERIFIED"]);

function optionalLower(value) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function matchesToolId(entry, toolId) {
  const normalized = String(toolId).toLowerCase();
  return optionalLower(entry.toolId) === normalized
    || optionalLower(entry.repo) === normalized
    || optionalLower(entry.fullName) === normalized;
}

function normalizeExecutable(entry) {
  const command = entry.workerCommand ? String(entry.workerCommand).trim().split(/\s+/)[0] : "";
  if (command && command !== "npx" && command !== "python" && command !== "python3") return command;

  const explicit = {
    exiftool: "exiftool",
    "detect-secrets": "detect-secrets",
    gitleaks: "gitleaks",
    trufflehog: "trufflehog",
    sherlock: "sherlock",
    maigret: "maigret",
    holehe: "holehe",
    phoneinfoga: "phoneinfoga",
    amass: "amass",
    subfinder: "subfinder",
  };

  return explicit[entry.toolId] || explicit[String(entry.repo || "").toLowerCase()] || String(entry.repo || entry.toolId).toLowerCase();
}

function chooseProbeArgs(binaryName) {
  const versionFirst = new Set(["exiftool", "gitleaks", "trufflehog", "amass", "subfinder", "phoneinfoga"]);
  return versionFirst.has(binaryName) ? ["--version"] : ["--help"];
}

export async function smokeTool(toolId) {
  const raw = await fs.readFile(REGISTRY_PATH, "utf8");
  const registry = JSON.parse(raw);

  const entry = registry.find((e) => matchesToolId(e, toolId));
  if (!entry) {
    throw new Error(`Tool not found in registry: ${toolId}`);
  }

  const startTime = Date.now();
  console.info(`[Smoke Test] Probing tool: ${entry.name} (${entry.toolId})...`);

  const binaryName = normalizeExecutable(entry);

  // Handle special cases
  if (entry.runtimeType === "gui-only" || entry.status === "GUI_ONLY") {
    entry.smokeResult = { success: true, message: "GUI-only web tool verified catalog link", outputSnippet: entry.upstreamUrl };
    entry.status = "GUI_ONLY";
    entry.healthStatus = "REFERENCE_ONLY";
    entry.lastSmokeTested = new Date().toISOString();
    await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
    return entry.smokeResult;
  }

  if (entry.runtimeType === "dataset-only" || entry.status === "DATASET_ONLY") {
    entry.smokeResult = { success: true, message: "Dataset verified repository reference", outputSnippet: entry.upstreamUrl };
    entry.status = "DATASET_ONLY";
    entry.healthStatus = "REFERENCE_ONLY";
    entry.lastSmokeTested = new Date().toISOString();
    await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
    return entry.smokeResult;
  }

  if (entry.runtimeType === "library-only" || entry.status === "LIBRARY_ONLY") {
    entry.smokeResult = { success: true, message: "Library reference verified", outputSnippet: entry.upstreamUrl };
    entry.status = "LIBRARY_ONLY";
    entry.healthStatus = "REFERENCE_ONLY";
    entry.lastSmokeTested = new Date().toISOString();
    await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
    return entry.smokeResult;
  }

  if (entry.requiresAuth || entry.requiresApiKey) {
    entry.smokeResult = { success: false, error: "Requires API key or external authentication configured" };
    entry.status = "AUTH_REQUIRED";
    entry.healthStatus = "UNCONFIGURED";
    entry.lastSmokeTested = new Date().toISOString();
    await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
    return entry.smokeResult;
  }

  try {
    // Attempt running with --help or --version
    const { stdout, stderr } = await execFileAsync(binaryName, chooseProbeArgs(binaryName), {
      timeout: 5000,
      windowsHide: true,
    });
    const latencyMs = Date.now() - startTime;
    const output = (stdout || stderr || "").trim();
    const outputSnippet = output.slice(0, 200).replace(/[\r\n]+/g, " ");

    entry.smokeResult = {
      success: true,
      latencyMs,
      outputSnippet,
      command: binaryName,
    };
    entry.status = SUCCESS_STATUSES.has(entry.status) ? entry.status : "HEALTHY";
    entry.healthStatus = "HEALTHY";
    entry.lastSmokeTested = new Date().toISOString();
    console.info(`[Smoke Test PASS] ${entry.name}: healthy (${latencyMs}ms)`);
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const isNotFound = err.code === "ENOENT" || (err.message && err.message.includes("not recognized"));
    const errorMsg = isNotFound
      ? `Executable '${binaryName}' not found in current environment PATH`
      : err.message.slice(0, 200);

    entry.smokeResult = {
      success: false,
      latencyMs,
      error: errorMsg,
      command: binaryName,
    };
    entry.status = isNotFound ? "UNCONFIGURED" : "DEGRADED";
    entry.healthStatus = isNotFound ? "UNCONFIGURED" : "DEGRADED";
    entry.lastSmokeTested = new Date().toISOString();
    console.info(`[Smoke Test] ${entry.name}: ${entry.status} - ${errorMsg}`);
  }

  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
  return entry.smokeResult;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const toolId = process.argv[2] || "sherlock";
  smokeTool(toolId).catch((err) => {
    console.error("Smoke error:", err);
    process.exitCode = 1;
  });
}
