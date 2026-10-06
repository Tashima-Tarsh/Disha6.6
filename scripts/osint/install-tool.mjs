import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const REGISTRY_PATH = path.join(ROOT_DIR, "data/osint/upstream-registry.json");

export async function installTool(toolId) {
  const raw = await fs.readFile(REGISTRY_PATH, "utf8");
  const registry = JSON.parse(raw);

  const entry = registry.find((e) => e.toolId === toolId || e.repo.toLowerCase() === toolId.toLowerCase());
  if (!entry) {
    throw new Error(`Tool not found in registry: ${toolId}`);
  }

  console.info(`Attempting installation for ${entry.name} (${entry.toolId}) [${entry.runtimeType}]...`);
  entry.status = "INSTALLING";
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");

  try {
    if (entry.runtimeType === "python") {
      // Attempt pip install package or git repo
      const pkgName = entry.repo.toLowerCase();
      console.info(`Running: pip install --upgrade ${pkgName}`);
      const { stdout } = await execAsync(`pip install --upgrade ${pkgName}`, { timeout: 60000 });
      entry.status = "INSTALLED";
      entry.healthStatus = "HEALTHY";
      console.info(`Installed ${entry.name} successfully.`);
    } else if (entry.runtimeType === "go") {
      const goPath = `${entry.upstreamUrl.replace("https://", "")}@latest`;
      console.info(`Running: go install ${goPath}`);
      await execAsync(`go install ${goPath}`, { timeout: 60000 });
      entry.status = "INSTALLED";
      entry.healthStatus = "HEALTHY";
      console.info(`Installed ${entry.name} successfully via go.`);
    } else if (entry.runtimeType === "node") {
      console.info(`Running: npm install -g ${entry.repo.toLowerCase()}`);
      await execAsync(`npm install -g ${entry.repo.toLowerCase()}`, { timeout: 60000 });
      entry.status = "INSTALLED";
      entry.healthStatus = "HEALTHY";
      console.info(`Installed ${entry.name} successfully via npm.`);
    } else {
      entry.status = "UNSUPPORTED_RUNTIME";
      entry.healthStatus = "REFERENCE_ONLY";
      console.info(`Tool ${entry.name} has non-standard runtime (${entry.runtimeType}). Marked as reference.`);
    }
  } catch (err) {
    entry.status = "BUILD_FAILED";
    entry.healthStatus = "ERROR";
    console.warn(`Installation failed for ${entry.name}:`, err.message);
  }

  entry.lastVerified = new Date().toISOString();
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
  return entry;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const toolId = process.argv[2];
  if (!toolId) {
    console.error("Please specify a tool ID, e.g. node scripts/osint/install-tool.mjs sherlock");
    process.exitCode = 1;
  } else {
    installTool(toolId).catch((err) => {
      console.error("Install error:", err);
      process.exitCode = 1;
    });
  }
}
