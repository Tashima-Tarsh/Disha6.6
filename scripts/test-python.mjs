import { spawnSync } from "node:child_process";
import process from "node:process";

console.info("[test:python] Checking local python pytest availability...");
const localCheck = spawnSync("python", ["-m", "pytest", "--version"], { shell: true });

if (localCheck.status === 0) {
  console.info("[test:python] Running pytest via local python...");
  const run = spawnSync("python", ["-m", "pytest", "tests/", "skills/vyuha-defense-engine/tests/"], {
    stdio: "inherit",
    shell: true,
  });
  process.exit(run.status ?? 0);
}

console.info("[test:python] Local pytest not found. Running pytest via Docker disha66-disha-brain container...");
const cwd = process.cwd().replace(/\\/g, "/");
const dockerRun = spawnSync("docker", [
  "run",
  "--rm",
  "--user", "root",
  "-v", `${cwd}:/workspace:ro`,
  "disha66-disha-brain:latest",
  "sh", "-c",
  "pip install --no-cache-dir pytest > /dev/null 2>&1 && cd /workspace && PYTHONPATH=. pytest tests/ skills/vyuha-defense-engine/tests/"
], {
  stdio: "inherit",
});

process.exit(dockerRun.status ?? 0);
