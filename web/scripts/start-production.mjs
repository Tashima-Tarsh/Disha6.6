import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

loadEnvFiles();

function loadEnvFiles() {
  const envCandidates = [
    path.resolve(".env.local"),
    path.resolve(".env"),
    path.resolve("../.env.local"),
    path.resolve("../.env"),
  ];
  for (const candidate of envCandidates) {
    if (fs.existsSync(candidate)) {
      const content = fs.readFileSync(candidate, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

const runtimeEnv = { ...process.env, NODE_ENV: "production" };
const cliPort = readPort(process.argv.slice(2));
if (cliPort) runtimeEnv.PORT = cliPort;
runtimeEnv.PORT ||= "3000";
runtimeEnv.HOSTNAME = process.env.DISHA_BIND_HOST?.trim() || "0.0.0.0";

if (!runtimeEnv.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is required in production");

const applyMigrationsOnStart = runtimeEnv.DISHA_APPLY_MIGRATIONS_ON_START === "true";
if (applyMigrationsOnStart) {
  if (!runtimeEnv.DATABASE_URL) throw new Error("DATABASE_URL is required when DISHA_APPLY_MIGRATIONS_ON_START=true");
  const migration = spawnSync(process.execPath, ["scripts/apply-schema.mjs"], {
    stdio: "inherit",
    env: runtimeEnv,
  });
  if (migration.status !== 0) process.exit(migration.status ?? 1);
} else {
  process.stdout.write(JSON.stringify({
    type: "startup_migrations",
    status: "skipped",
    owner: "compose-web-migrate",
  }) + "\n");
}

const serverPath = resolveStandaloneServer();
process.stdout.write(JSON.stringify({
  type: "production_server",
  mode: "next-standalone",
  serverPath,
  port: runtimeEnv.PORT,
  hostname: runtimeEnv.HOSTNAME,
}) + "\n");

const child = spawn(process.execPath, [serverPath], {
  stdio: "inherit",
  env: runtimeEnv,
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});

function resolveStandaloneServer() {
  const buildDirectory = process.env.DISHA_NEXT_DIST_DIR || ".next";
  const candidates = [
    path.resolve(buildDirectory, "standalone/server.js"),
    path.resolve(buildDirectory, "standalone/web/server.js"),
  ];
  const match = candidates.find((candidate) => fs.existsSync(candidate));
  if (!match) throw new Error("Next standalone server.js is missing; run npm run build first");
  return match;
}

function readPort(args) {
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "-p" || value === "--port") return args[index + 1];
    if (value?.startsWith("--port=")) return value.slice("--port=".length);
  }
  return undefined;
}
