import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const REGISTRY_PATH = path.join(ROOT_DIR, "data/osint/upstream-registry.json");

const SPECIAL_CONFIGS = {
  // Builtin / ASTRA 6 tools
  phoneinfoga: {
    workerRuntime: "go",
    workerCommand: "phoneinfoga scan -n {target}",
    targetInputs: ["phone_number"],
    executionClass: "passive_public",
    runtimeType: "go",
    category: "identity",
  },
  sherlock: {
    workerRuntime: "python",
    workerCommand: "sherlock {target} --print-found --timeout 15",
    targetInputs: ["username"],
    executionClass: "passive_public",
    runtimeType: "python",
    category: "identity",
  },
  maigret: {
    workerRuntime: "python",
    workerCommand: "maigret {target} --timeout 15 --json",
    targetInputs: ["username"],
    executionClass: "passive_public",
    runtimeType: "python",
    category: "identity",
  },
  holehe: {
    workerRuntime: "python",
    workerCommand: "holehe {target} --only-used",
    targetInputs: ["email"],
    executionClass: "passive_public",
    runtimeType: "python",
    category: "identity",
  },
  theharvester: {
    workerRuntime: "python",
    workerCommand: "theHarvester -d {target} -b all",
    targetInputs: ["domain"],
    executionClass: "passive_public",
    runtimeType: "python",
    category: "network",
  },
  spiderfoot: {
    workerRuntime: "python",
    workerCommand: "sfcli.py -s {target} -m passive",
    targetInputs: ["domain", "ip", "email", "phone_number", "username"],
    executionClass: "passive_public",
    runtimeType: "python",
    category: "framework",
  },
  "owasp-amass": {
    workerRuntime: "go",
    workerCommand: "amass enum -passive -d {target}",
    targetInputs: ["domain"],
    executionClass: "passive_public",
    runtimeType: "go",
    category: "network",
  },
  amass: {
    workerRuntime: "go",
    workerCommand: "amass enum -passive -d {target}",
    targetInputs: ["domain"],
    executionClass: "passive_public",
    runtimeType: "go",
    category: "network",
  },
  subfinder: {
    workerRuntime: "go",
    workerCommand: "subfinder -d {target} -silent",
    targetInputs: ["domain"],
    executionClass: "passive_public",
    runtimeType: "go",
    category: "network",
  },
  ghunt: {
    workerRuntime: "python",
    workerCommand: "ghunt email {target}",
    targetInputs: ["email"],
    executionClass: "credentialed_public_api",
    requiresAuth: true,
    requiresApiKey: true,
    runtimeType: "python",
    category: "identity",
  },
  instaloader: {
    workerRuntime: "python",
    workerCommand: "instaloader --profile {target}",
    targetInputs: ["username"],
    executionClass: "passive_public",
    runtimeType: "python",
    category: "identity",
  },
  telethon: {
    workerRuntime: "python",
    workerCommand: "python scripts/identity-osint-adapter.py telegram {target}",
    targetInputs: ["telegram_username"],
    executionClass: "credentialed_public_api",
    requiresAuth: true,
    requiresApiKey: true,
    runtimeType: "python",
    category: "identity",
  },
  trufflehog: {
    workerRuntime: "go",
    workerCommand: "trufflehog git {target} --json",
    targetInputs: ["git_repo", "filesystem"],
    executionClass: "passive_public",
    runtimeType: "go",
    category: "secrets",
  },
  gitleaks: {
    workerRuntime: "go",
    workerCommand: "gitleaks detect --source={target} -v",
    targetInputs: ["git_repo", "filesystem"],
    executionClass: "passive_public",
    runtimeType: "go",
    category: "secrets",
  },
  httpx: {
    workerRuntime: "go",
    workerCommand: "httpx -u {target} -silent -json",
    targetInputs: ["domain", "url"],
    executionClass: "passive_public",
    runtimeType: "go",
    category: "network",
  },
  dnsx: {
    workerRuntime: "go",
    workerCommand: "dnsx -d {target} -silent -json",
    targetInputs: ["domain"],
    executionClass: "passive_public",
    runtimeType: "go",
    category: "network",
  },
  bbot: {
    workerRuntime: "python",
    workerCommand: "bbot -t {target} -p passive",
    targetInputs: ["domain", "ip", "asn"],
    executionClass: "passive_public",
    runtimeType: "python",
    category: "network",
  },
  intelowl: {
    workerRuntime: "docker",
    workerCommand: null,
    targetInputs: ["ip", "domain", "hash", "url"],
    executionClass: "credentialed_public_api",
    requiresAuth: true,
    requiresApiKey: true,
    runtimeType: "docker",
    category: "threat-intelligence",
  },
  opencti: {
    workerRuntime: "docker",
    workerCommand: null,
    targetInputs: ["ip", "domain", "cve"],
    executionClass: "credentialed_public_api",
    requiresAuth: true,
    requiresApiKey: true,
    runtimeType: "docker",
    category: "threat-intelligence",
  },
};

export async function classifyUpstreams() {
  console.info("Classifying OSINT upstreams runtime, capabilities, and execution classes...");

  const raw = await fs.readFile(REGISTRY_PATH, "utf8");
  const registry = JSON.parse(raw);

  let classifiedCount = 0;

  for (const entry of registry) {
    const special = SPECIAL_CONFIGS[entry.toolId] || SPECIAL_CONFIGS[entry.repo.toLowerCase()];
    if (special) {
      if (special.workerRuntime) entry.workerRuntime = special.workerRuntime;
      if (special.workerCommand) entry.workerCommand = special.workerCommand;
      if (special.targetInputs) entry.targetInputs = special.targetInputs;
      if (special.executionClass) entry.executionClass = special.executionClass;
      if (special.runtimeType) entry.runtimeType = special.runtimeType;
      if (special.category) entry.category = special.category;
      if (special.requiresAuth !== undefined) entry.requiresAuth = special.requiresAuth;
      if (special.requiresApiKey !== undefined) entry.requiresApiKey = special.requiresApiKey;
    } else {
      // General heuristics
      if (entry.runtimeType === "python") {
        entry.workerRuntime = "python";
        entry.workerCommand = `${entry.repo.toLowerCase()} {target}`;
      } else if (entry.runtimeType === "go") {
        entry.workerRuntime = "go";
        entry.workerCommand = `${entry.repo.toLowerCase()} {target}`;
      } else if (entry.runtimeType === "node") {
        entry.workerRuntime = "node";
        entry.workerCommand = `npx ${entry.repo.toLowerCase()} {target}`;
      } else {
        entry.workerRuntime = null;
        entry.workerCommand = null;
      }

      if (entry.runtimeType === "gui-only") {
        entry.status = "GUI_ONLY";
        entry.healthStatus = "REFERENCE_ONLY";
        entry.executionClass = "catalog_only";
      } else if (entry.runtimeType === "dataset-only") {
        entry.status = "DATASET_ONLY";
        entry.healthStatus = "REFERENCE_ONLY";
        entry.executionClass = "catalog_only";
      } else if (entry.runtimeType === "library-only") {
        entry.status = "LIBRARY_ONLY";
        entry.healthStatus = "REFERENCE_ONLY";
        entry.executionClass = "catalog_only";
      }
    }

    // Set truthful status if not already active
    if (!["HEALTHY", "DEGRADED", "GUI_ONLY", "DATASET_ONLY", "LIBRARY_ONLY", "UNAVAILABLE"].includes(entry.status)) {
      if (entry.requiresAuth || entry.requiresApiKey) {
        entry.status = "AUTH_REQUIRED";
        entry.healthStatus = "UNCONFIGURED";
      } else if (entry.status !== "UPSTREAM_VERIFIED") {
        entry.status = "CATALOGED";
      }
    }

    classifiedCount++;
  }

  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
  console.info(`Classified ${classifiedCount} tools.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  classifyUpstreams().catch((err) => {
    console.error("Classification error:", err);
    process.exitCode = 1;
  });
}
