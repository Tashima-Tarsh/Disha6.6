import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextCli = require.resolve("next/dist/bin/next");

const buildArgs = process.platform === "win32" ? ["build", "--webpack"] : ["build"];

const child = spawn(process.execPath, [nextCli, ...buildArgs], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});

child.on("exit", async (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  if ((code ?? 1) !== 0) {
    process.exit(code ?? 1);
    return;
  }
  try {
    const runtimeRoot = await resolveStandaloneRuntimeRoot();
    await copyIfExists(path.resolve("public"), path.join(runtimeRoot, "public"));
    await copyIfExists(path.resolve(".next/static"), path.join(runtimeRoot, ".next/static"));
    process.stdout.write(JSON.stringify({
      type: "standalone_assets",
      status: "ready",
      runtimeRoot,
    }) + "\n");
    process.exit(0);
  } catch (error) {
    console.error("[build-production] standalone asset preparation failed", error);
    process.exit(1);
  }
});

async function resolveStandaloneRuntimeRoot() {
  const candidates = [
    path.resolve(".next/standalone"),
    path.resolve(".next/standalone/web"),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(path.join(candidate, "server.js"));
      return candidate;
    } catch {
      // Try the next supported standalone layout.
    }
  }
  throw new Error("Next standalone server.js was not produced");
}

async function copyIfExists(source, destination) {
  try {
    await fs.access(source);
  } catch {
    return;
  }
  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(source, destination, { recursive: true });
}
