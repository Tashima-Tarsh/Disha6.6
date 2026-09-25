import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

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
  const candidates = [
    path.resolve(".next/standalone/server.js"),
    path.resolve(".next/standalone/web/server.js"),
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
