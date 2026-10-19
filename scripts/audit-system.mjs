import fs from "fs";
import { execSync } from "child_process";

console.info("=== DISHA 6.6 PRODUCTION SYSTEM AUDIT ===");

// 1. Git & Environment
const head = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const branch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
const status = execSync("git status -s", { encoding: "utf8" }).trim();

console.info(`HEAD: ${head}`);
console.info(`Branch: ${branch}`);
console.info(`Working tree clean: ${status.length === 0}`);
if (status) console.info(`Dirty files:\n${status}`);

// 2. Registry Count & Statuses
const registryRaw = fs.readFileSync("data/osint/upstream-registry.json", "utf8");
const registry = JSON.parse(registryRaw);
console.info(`\nRegistry Total Entries: ${registry.length}`);

const statusCounts = {};
const categoryCounts = {};
const runtimeCounts = {};

for (const entry of registry) {
  statusCounts[entry.healthStatus] = (statusCounts[entry.healthStatus] || 0) + 1;
  categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1;
  runtimeCounts[entry.runtime] = (runtimeCounts[entry.runtime] || 0) + 1;
}

console.info("Status Breakdown:", JSON.stringify(statusCounts, null, 2));
console.info("Category Breakdown:", JSON.stringify(categoryCounts, null, 2));
console.info("Runtime Breakdown:", JSON.stringify(runtimeCounts, null, 2));

// 3. Manifest Count
const manifestsRaw = fs.readFileSync("web/lib/unified/generated/osint-tool-manifests.generated.ts", "utf8");
const manifestIds = [...manifestsRaw.matchAll(/toolId:\s*"([^"]+)"/g)].map(m => m[1]);
console.info(`\nGenerated Manifests Count: ${manifestIds.length}`);

// 4. Git Submodules
let submodules = [];
if (fs.existsSync(".gitmodules")) {
  const gitmodules = fs.readFileSync(".gitmodules", "utf8");
  const subPaths = [...gitmodules.matchAll(/path\s*=\s*(.+)/g)].map(m => m[1].trim());
  submodules = subPaths;
  console.info(`\nGit Submodules Count: ${submodules.length}`);
  console.info("Submodules:", submodules);
} else {
  console.info("\nNo .gitmodules found.");
}

// 5. Worker classes & Docker Compose
console.info("\nDocker Compose services defined in docker-compose.yml:");
const composeFile = fs.readFileSync("docker-compose.yml", "utf8");
const serviceBlock = composeFile.split(/\nvolumes:\s*\n/)[0] || composeFile;
const composeServices = [...serviceBlock.matchAll(/^[ ]{2}([a-zA-Z0-9_\-]+):/gm)].map(m => m[1]);
console.info("Services:", composeServices);

// 6. CI Workflows
const workflows = fs.readdirSync(".github/workflows");
console.info(`\nCI Workflows:`, workflows);

// 7. Obsolete/Duplicate checks
const hasOsintServiceAdapters = fs.existsSync("web/lib/unified/osint-service-adapters.ts");
const hasOsintServiceConnectors = fs.existsSync("web/lib/unified/osint-service-connectors.ts");
console.info(`\nDuplicate Check:`);
console.info(`- web/lib/unified/osint-service-adapters.ts exists: ${hasOsintServiceAdapters}`);
console.info(`- web/lib/unified/osint-service-connectors.ts exists: ${hasOsintServiceConnectors}`);
