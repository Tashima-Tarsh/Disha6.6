import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const REGISTRY_PATH = path.join(ROOT_DIR, "data/osint/upstream-registry.json");
const LOCKFILE_PATH = path.join(ROOT_DIR, ".disha/osint/runtime-lock.json");

function sha256(content) {
  return crypto
    .createHash("sha256")
    .update(typeof content === "string" ? content : JSON.stringify(content))
    .digest("hex");
}

const IDENTITY_WORKER_TOOLS = new Set([
  "phoneinfoga",
  "sherlock",
  "maigret",
  "holehe",
  "instaloader",
  "telethon",
]);

const INFRASTRUCTURE_WORKER_TOOLS = new Set([
  "theharvester",
  "amass",
  "subfinder",
]);

const ADVANCED_WORKER_TOOLS = new Set([
  "spiderfoot",
  "recon-ng",
  "photon",
]);

const SERVICE_CONNECTORS = new Set(["opencti", "intelowl"]);
const CREDENTIAL_RUNTIME_TOOLS = new Set(["telethon", "opencti", "intelowl"]);
const POLICY_GATED_TOOLS = new Set([
  "phoneinfoga",
  "sherlock",
  "maigret",
  "holehe",
  "photon",
]);

function deploymentClassification(entry) {
  const toolId = entry.toolId;

  if (IDENTITY_WORKER_TOOLS.has(toolId)) {
    if (CREDENTIAL_RUNTIME_TOOLS.has(toolId)) {
      return {
        ownership: "astra6",
        status: "CREDENTIAL_REQUIRED",
        healthStatus: "REQUIRES_RUNTIME_PROBE",
        containerWorker: "astra6-identity-worker",
        installationMethod: "worker_image",
      };
    }

    return {
      ownership: "astra6",
      status: POLICY_GATED_TOOLS.has(toolId) ? "POLICY_RESTRICTED" : "RUNTIME_MANIFESTED",
      healthStatus: "REQUIRES_RUNTIME_PROBE",
      containerWorker: "astra6-identity-worker",
      installationMethod: "worker_image",
    };
  }

  if (INFRASTRUCTURE_WORKER_TOOLS.has(toolId)) {
    return {
      ownership: "astra6",
      status: "RUNTIME_MANIFESTED",
      healthStatus: "REQUIRES_RUNTIME_PROBE",
      containerWorker: "astra6-infrastructure-worker",
      installationMethod: "worker_image",
    };
  }

  if (ADVANCED_WORKER_TOOLS.has(toolId)) {
    return {
      ownership: "astra6",
      status: POLICY_GATED_TOOLS.has(toolId) ? "POLICY_RESTRICTED" : "RUNTIME_MANIFESTED",
      healthStatus: "REQUIRES_RUNTIME_PROBE",
      containerWorker: "astra6-advanced-worker",
      installationMethod: "worker_image",
    };
  }

  if (SERVICE_CONNECTORS.has(toolId)) {
    return {
      ownership: "service_connector",
      status: "CREDENTIAL_REQUIRED",
      healthStatus: "REQUIRES_RUNTIME_PROBE",
      containerWorker: "service-container",
      installationMethod: "service_connector",
    };
  }

  if (entry.runtimeType === "dataset-only") {
    return {
      ownership: "reference",
      status: "DATASET_REFERENCE",
      healthStatus: "REFERENCE_ONLY",
      containerWorker: null,
      installationMethod: "catalog_reference",
    };
  }

  if (entry.runtimeType === "library-only") {
    return {
      ownership: "reference",
      status: "LIBRARY_REFERENCE",
      healthStatus: "REFERENCE_ONLY",
      containerWorker: null,
      installationMethod: "catalog_reference",
    };
  }

  if (entry.runtimeType === "gui-only") {
    return {
      ownership: "reference",
      status: "GUI_REFERENCE",
      healthStatus: "REFERENCE_ONLY",
      containerWorker: null,
      installationMethod: "catalog_reference",
    };
  }

  return {
    ownership: "catalog",
    status: entry.requiresAuth || entry.requiresApiKey ? "CATALOGED_AUTH_REQUIRED" : "CATALOGED",
    healthStatus: "UNCONFIGURED",
    containerWorker: null,
    installationMethod: "catalog_only",
  };
}

export async function buildLockfile() {
  console.info("Generating truthful OSINT deployment lockfile...");

  const raw = await fs.readFile(REGISTRY_PATH, "utf8");
  const registry = JSON.parse(raw);

  const lockEntries = [];
  const accounting = {};

  for (const entry of registry) {
    const classification = deploymentClassification(entry);
    accounting[classification.status] = (accounting[classification.status] || 0) + 1;

    const sourceRevision = entry.pinnedSha || entry.upstreamSha || null;
    const targetType = (entry.targetInputs && entry.targetInputs[0]) || null;

    const lockEntry = {
      toolId: entry.toolId,
      name: entry.name,
      upstreamRepository: entry.upstreamUrl,
      upstreamHead: entry.upstreamSha || null,
      sourceRevision,
      deployedRevision: null,
      packageVersion: entry.version || null,
      license: entry.license || "Unknown",
      runtime: entry.runtimeType || entry.workerRuntime || null,
      runtimeOwnership: classification.ownership,
      containerWorker: classification.containerWorker,
      installationMethod: classification.installationMethod,
      functionalTestDefinition: {
        targetType,
        targetProvidedAtRuntime: true,
        expectedOutcome: "normalized_evidence_records",
        rule: "The lockfile never stores a synthetic investigation target.",
      },
      parserVersion: "1.0.0",
      lastUpstreamVerifiedAt: entry.upstreamVerifiedAt || entry.lastVerified || null,
      status: classification.status,
      healthStatus: classification.healthStatus,
      provenanceHash: sha256({
        toolId: entry.toolId,
        sourceRevision,
        license: entry.license,
        runtimeOwnership: classification.ownership,
        status: classification.status,
      }),
    };

    lockEntries.push(lockEntry);
  }

  const lockfilePayload = {
    version: "6.6.0-lock",
    generatedAt: new Date().toISOString(),
    totalTools: lockEntries.length,
    accounting,
    truthModel: {
      catalogIsNotRuntime: true,
      runtimeHealthMustBeProbed: true,
      syntheticFunctionalTargets: false,
    },
    tools: lockEntries,
  };

  await fs.mkdir(path.dirname(LOCKFILE_PATH), { recursive: true });
  await fs.writeFile(LOCKFILE_PATH, JSON.stringify(lockfilePayload, null, 2), "utf8");

  console.info(`Lockfile created with ${lockEntries.length} catalog entries.`);
  console.info("Deployment classification:", JSON.stringify(accounting, null, 2));
  console.info("Live health is intentionally not written into the catalog or lockfile.");
  return lockfilePayload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildLockfile().catch((err) => {
    console.error("Lockfile generation error:", err);
    process.exitCode = 1;
  });
}
