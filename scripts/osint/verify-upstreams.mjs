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

function positiveInt(value, fallback, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

async function gitHead(upstreamUrl) {
  const { stdout } = await execFileAsync("git", ["ls-remote", "--exit-code", upstreamUrl, "HEAD"], {
    timeout: 15_000,
    maxBuffer: 64 * 1024,
    windowsHide: true,
  });
  const sha = String(stdout).trim().split(/\s+/)[0] ?? "";
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error("upstream_head_missing");
  return sha;
}

async function enrichGithubMetadata(entry, headers) {
  if (!headers.Authorization) return;
  const apiUrl = `https://api.github.com/repos/${entry.owner}/${entry.repo}`;
  const res = await fetch(apiUrl, { headers });
  if (res.status === 403 || res.status === 429) return;
  if (!res.ok) return;
  const data = await res.json();
  entry.defaultBranch = data.default_branch || entry.defaultBranch || "main";
  entry.stars = data.stargazers_count ?? entry.stars;
  entry.isArchived = data.archived ?? entry.isArchived;
  if (data.license?.spdx_id) entry.license = data.license.spdx_id;
  entry.description = data.description || entry.description;
}

export async function verifyUpstreams(options = {}) {
  const limit = options.limit || 0;
  const targetToolId = options.toolId;

  console.info("Starting OSINT upstream verification using git remote HEADs...");
  const raw = await fs.readFile(REGISTRY_PATH, "utf8");
  const registry = JSON.parse(raw);

  const headers = {
    "User-Agent": "DISHA-OSINT-Verifier/6.6",
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const toProcess = registry.filter((entry) => !targetToolId || entry.toolId === targetToolId);
  const targetList = limit > 0 ? toProcess.slice(0, limit) : toProcess;
  const concurrency = positiveInt(process.env.DISHA_OSINT_VERIFY_CONCURRENCY, 8, 16);

  let cursor = 0;
  let verifiedCount = 0;
  let unavailableCount = 0;
  let failedCount = 0;

  async function worker() {
    for (;;) {
      const index = cursor++;
      if (index >= targetList.length) return;
      const entry = targetList[index];
      try {
        const sha = await gitHead(entry.upstreamUrl);
        const verifiedAt = new Date().toISOString();
        entry.upstreamSha = sha;
        entry.upstreamStatus = "VERIFIED";
        entry.upstreamVerifiedAt = verifiedAt;
        entry.lastVerified = verifiedAt;
        await enrichGithubMetadata(entry, headers);
        verifiedCount++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        entry.upstreamStatus = /not found|exit code 2|repository/i.test(message) ? "UNAVAILABLE" : "UNKNOWN";
        entry.upstreamVerifiedAt = new Date().toISOString();
        if (entry.upstreamStatus === "UNAVAILABLE") unavailableCount++;
        else failedCount++;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, targetList.length)) }, () => worker()));
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");

  console.info(
    `Verification finished: ${verifiedCount} verified, ${unavailableCount} unavailable, ${failedCount} unknown. Pinned SHAs were not changed.`,
  );
  return { verifiedCount, unavailableCount, failedCount, total: targetList.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const toolArg = args.find((a) => a.startsWith("--tool="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 0;
  const toolId = toolArg ? toolArg.split("=")[1] : undefined;

  verifyUpstreams({ limit, toolId }).catch((err) => {
    console.error("Verification error:", err);
    process.exitCode = 1;
  });
}
