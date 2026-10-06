import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const REGISTRY_PATH = path.join(ROOT_DIR, "data/osint/upstream-registry.json");
const FORK_STATUS_PATH = path.join(ROOT_DIR, "data/osint/fork-status.json");
const FORK_ORG = "Tashima-Tarsh";

export async function checkForks(options = {}) {
  const limit = options.limit || 0;
  console.info(`Checking real forks under https://github.com/${FORK_ORG}...`);

  const raw = await fs.readFile(REGISTRY_PATH, "utf8");
  const registry = JSON.parse(raw);

  const headers = {
    "User-Agent": "DISHA-Fork-Verifier/6.6",
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // Fetch all repos belonging to FORK_ORG to do bulk matching without hitting rate limits
  const actualForks = new Set();
  try {
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= 10) {
      const res = await fetch(`https://api.github.com/users/${FORK_ORG}/repos?per_page=100&page=${page}`, { headers });
      if (res.status === 403 || res.status === 429) {
        console.warn("GitHub API rate limit hit while listing organization repositories.");
        break;
      }
      if (!res.ok) {
        console.warn(`Could not list ${FORK_ORG} repositories: ${res.statusText}`);
        break;
      }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false;
        break;
      }
      for (const r of data) {
        actualForks.add(r.name.toLowerCase());
      }
      if (data.length < 100) hasMore = false;
      page++;
    }
    console.info(`Found ${actualForks.size} actual public repositories under ${FORK_ORG}.`);
  } catch (err) {
    console.warn(`Failed to query ${FORK_ORG} repositories:`, err.message);
  }

  let forkedCount = 0;
  let pendingCount = 0;

  for (const entry of registry) {
    const candidateName = entry.repo.toLowerCase();
    if (actualForks.has(candidateName)) {
      entry.forkUrl = `https://github.com/${FORK_ORG}/${entry.repo}`;
      entry.forkStatus = "FORKED";
      forkedCount++;
    } else {
      // TRUTHFUL ZERO-MOCK POLICY: If fork does not exist, forkUrl MUST be null.
      entry.forkUrl = null;
      entry.forkStatus = "FORK_PENDING";
      pendingCount++;
    }
  }

  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");

  const forkSummary = {
    updatedAt: new Date().toISOString(),
    organization: FORK_ORG,
    totalCataloged: registry.length,
    forkedCount,
    pendingCount,
    forkedTools: registry.filter((e) => e.forkStatus === "FORKED").map((e) => ({
      toolId: e.toolId,
      upstreamUrl: e.upstreamUrl,
      forkUrl: e.forkUrl,
    })),
  };

  await fs.writeFile(FORK_STATUS_PATH, JSON.stringify(forkSummary, null, 2), "utf8");
  console.info(`Fork check complete: ${forkedCount} forked, ${pendingCount} pending.`);
  return forkSummary;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkForks().catch((err) => {
    console.error("Fork check error:", err);
    process.exitCode = 1;
  });
}
