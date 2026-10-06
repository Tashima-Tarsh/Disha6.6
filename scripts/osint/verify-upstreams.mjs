import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const REGISTRY_PATH = path.join(ROOT_DIR, "data/osint/upstream-registry.json");

export async function verifyUpstreams(options = {}) {
  const limit = options.limit || 0;
  const targetToolId = options.toolId;

  console.info("Starting OSINT upstream verification...");
  const raw = await fs.readFile(REGISTRY_PATH, "utf8");
  const registry = JSON.parse(raw);

  const headers = {
    "User-Agent": "DISHA-OSINT-Verifier/6.6",
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  let verifiedCount = 0;
  let skippedCount = 0;
  let rateLimited = false;

  const toProcess = registry.filter((entry) => {
    if (targetToolId) return entry.toolId === targetToolId;
    return true;
  });

  const targetList = limit > 0 ? toProcess.slice(0, limit) : toProcess;
  console.info(`Verifying ${targetList.length} repositories against upstream GitHub API...`);

  for (let i = 0; i < targetList.length; i++) {
    const entry = targetList[i];
    if (rateLimited) {
      skippedCount++;
      continue;
    }

    try {
      const apiUrl = `https://api.github.com/repos/${entry.owner}/${entry.repo}`;
      const res = await fetch(apiUrl, { headers });

      if (res.status === 403 || res.status === 429) {
        console.warn(`GitHub API rate limit hit when verifying ${entry.fullName}. Stopping further remote API queries.`);
        rateLimited = true;
        skippedCount += targetList.length - i;
        break;
      }

      if (res.status === 404) {
        entry.status = "UPSTREAM_UNAVAILABLE";
        entry.healthStatus = "UNAVAILABLE";
        entry.lastVerified = new Date().toISOString();
        continue;
      }

      if (!res.ok) {
        entry.status = "UPSTREAM_UNKNOWN";
        continue;
      }

      const data = await res.json();
      entry.defaultBranch = data.default_branch || entry.defaultBranch || "main";
      entry.stars = data.stargazers_count ?? entry.stars;
      entry.isArchived = data.archived ?? entry.isArchived;
      if (data.license && data.license.spdx_id) {
        entry.license = data.license.spdx_id;
      }
      entry.description = data.description || entry.description;

      // Fetch latest commit sha on default branch
      try {
        const commitRes = await fetch(`https://api.github.com/repos/${entry.owner}/${entry.repo}/commits/${entry.defaultBranch}`, { headers });
        if (commitRes.ok) {
          const commitData = await commitRes.json();
          entry.upstreamSha = commitData.sha || null;
          if (!entry.pinnedSha) {
            entry.pinnedSha = commitData.sha || null;
          }
        }
      } catch {
        // commit sha fetch optional
      }

      entry.status = entry.isArchived ? "UPSTREAM_VERIFIED" : "UPSTREAM_VERIFIED";
      entry.lastVerified = new Date().toISOString();
      verifiedCount++;

      // Small pause to be polite to GitHub API
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err) {
      console.warn(`Verification failed for ${entry.fullName}:`, err.message);
    }
  }

  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
  console.info(`Verification finished: ${verifiedCount} verified, ${skippedCount} skipped (Rate limited: ${rateLimited}).`);
  return { verifiedCount, skippedCount, rateLimited };
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
