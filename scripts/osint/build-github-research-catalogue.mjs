import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT_DIR, "data/osint/github-research");
const WEB_OUT_DIR = path.join(ROOT_DIR, "web/data/osint/github-research");
const REPORT_OUT_DIR = process.env.DISHA_GITHUB_RESEARCH_REPORT_DIR || "D:\\OSINT-UPSTREAM\\github-research\\reports";

const now = new Date().toISOString();
const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

const seedRepos = [
  "owasp-amass/amass",
  "OpenCTI-Platform/opencti",
  "volatilityfoundation/volatility",
  "MISP/MISP",
  "volatilityfoundation/volatility3",
  "Velocidex/velociraptor",
  "google/timesketch",
  "sleuthkit/autopsy",
  "moj-analytical-services/splink",
  "dfir-iris/iris-web",
  "vz-risk/VCDB",
  "sleuthkit/autopsy_addon_modules",
  "MISP/misp-modules",
  "Velocidex/velociraptor-docs",
  "volatilityfoundation/community3",
  "MISP/misp-packer",
  "owasp-amass/docs",
  "reconurge/flowsint",
];

const categories = [
  {
    id: "icmr_healthcare_security",
    label: "ICMR and healthcare security research",
    queries: [
      '"ICMR" cybersecurity',
      '"ICMR" breach',
      '"healthcare" "data breach" security',
      '"medical" "incident response" forensics',
    ],
  },
  {
    id: "aadhaar_identity_security",
    label: "Aadhaar and digital identity security",
    queries: [
      "aadhaar security",
      "aadhaar breach",
      '"digital identity" security breach',
      '"identity" "data exposure" osint',
    ],
  },
  {
    id: "telecom_incidents",
    label: "Telecom incidents",
    queries: [
      "telecom breach intelligence",
      '"telecom" "data breach"',
      '"mobile operator" cybersecurity incident',
    ],
  },
  {
    id: "banking_financial_incidents",
    label: "Banking and financial cybersecurity incidents",
    queries: [
      "banking breach intelligence",
      '"financial" "data breach" cybersecurity',
      '"bank" "incident response" forensics',
    ],
  },
  {
    id: "government_data_exposures",
    label: "Government data exposures",
    queries: [
      '"government" "data exposure"',
      '"public sector" "data breach"',
      '"gov" "breach" intelligence',
    ],
  },
  {
    id: "corporate_breaches",
    label: "Corporate breaches",
    queries: [
      '"corporate" "data breach"',
      '"breach" "incident report"',
      '"security incident" "postmortem"',
    ],
  },
  {
    id: "ransomware_intelligence",
    label: "Ransomware intelligence",
    queries: [
      "ransomware intelligence",
      "ransomware victims dataset",
      "ransomware incident tracking",
    ],
  },
  {
    id: "digital_forensic_tools",
    label: "Digital forensic tools",
    queries: [
      "digital forensics tool",
      "memory forensics volatility",
      "dfir forensic evidence",
      "forensic timeline tool",
    ],
  },
  {
    id: "evidence_management",
    label: "Evidence management",
    queries: [
      "digital evidence management",
      "case management dfir",
      "chain of custody forensic",
    ],
  },
  {
    id: "incident_datasets",
    label: "Incident datasets",
    queries: [
      "cyber incident dataset",
      "data breach dataset",
      "security incident records",
    ],
  },
  {
    id: "record_provenance_validation",
    label: "Record provenance and validation",
    queries: [
      "record linkage provenance",
      "data provenance validation",
      "evidence verification hash chain",
    ],
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function githubJson(url, attempt = 0) {
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "DISHA-6.6-public-research-catalogue",
    "x-github-api-version": "2022-11-28",
  };
  if (githubToken) headers.authorization = `Bearer ${githubToken}`;
  const response = await fetch(url, { headers });
  const remaining = response.headers.get("x-ratelimit-remaining");
  const reset = response.headers.get("x-ratelimit-reset");
  if ((response.status === 403 || response.status === 429) && remaining === "0" && reset && attempt < 2) {
    const resetMs = Number(reset) * 1000;
    const waitMs = Math.max(1000, Math.min(75_000, resetMs - Date.now() + 1500));
    await sleep(waitMs);
    return githubJson(url, attempt + 1);
  }
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      rateLimitRemaining: remaining,
      rateLimitReset: reset,
      body: await response.text(),
    };
  }
  return {
    ok: true,
    status: response.status,
    rateLimitRemaining: remaining,
    rateLimitReset: reset,
    data: await response.json(),
  };
}

async function searchRepositories(category, sortDirection, page) {
  const queryIndex = (page - 1) % category.queries.length;
  const query = category.queries[queryIndex];
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", `${query} fork:false archived:false`);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", sortDirection);
  url.searchParams.set("per_page", "25");
  url.searchParams.set("page", String(page));
  return githubJson(url);
}

async function searchZeroStarRepositories(category, page) {
  const queryIndex = (page - 1) % category.queries.length;
  const query = category.queries[queryIndex];
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", `${query} stars:0 fork:false archived:false`);
  url.searchParams.set("sort", "updated");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", "25");
  url.searchParams.set("page", String(page));
  return githubJson(url);
}

async function getRepository(fullName) {
  return githubJson(`https://api.github.com/repos/${fullName}`);
}

async function getReleases(fullName) {
  const result = await githubJson(`https://api.github.com/repos/${fullName}/releases?per_page=5`);
  if (!result.ok) return [];
  return result.data.map((release) => ({
    tagName: release.tag_name,
    name: release.name || "",
    publishedAt: release.published_at,
    url: release.html_url,
  }));
}

async function getLatestSha(fullName, defaultBranch) {
  if (!defaultBranch) return "";
  try {
    const { stdout } = await execFileAsync("git", ["ls-remote", `https://github.com/${fullName}.git`, `refs/heads/${defaultBranch}`], {
      timeout: 20000,
      maxBuffer: 256 * 1024,
    });
    return stdout.trim().split(/\s+/)[0] || "";
  } catch {
    return "";
  }
}

async function inspectReadme(fullName, defaultBranch) {
  const branches = [defaultBranch, "main", "master"].filter(Boolean);
  const names = ["README.md", "README.rst", "README.txt", "README"];
  for (const branch of branches) {
    for (const name of names) {
      const url = `https://raw.githubusercontent.com/${fullName}/${encodeURIComponent(branch)}/${name}`;
      const response = await fetch(url, { headers: { "user-agent": "DISHA-6.6-public-research-catalogue" } });
      if (!response.ok) continue;
      const text = await response.text();
      return {
        readmeUrl: `https://github.com/${fullName}/blob/${encodeURIComponent(branch)}/${name}`,
        readmeBytes: Buffer.byteLength(text, "utf8"),
        readmeSignals: classifyReadmeSignals(text),
      };
    }
  }
  return { readmeUrl: "", readmeBytes: 0, readmeSignals: [] };
}

function classifyReadmeSignals(text) {
  const lower = text.toLowerCase();
  const signals = [];
  const checks = [
    ["installation", ["install", "docker", "pip install", "npm install", "go install"]],
    ["documentation", ["docs", "documentation", "wiki", "usage"]],
    ["incident-documentation", ["incident", "breach", "victim", "ransomware", "case study"]],
    ["forensic-tool", ["forensic", "dfir", "memory image", "timeline", "artifact"]],
    ["threat-intelligence", ["threat intelligence", "ioc", "misp", "stix", "indicator"]],
    ["evidence-management", ["case management", "chain of custody", "evidence"]],
    ["dataset", ["dataset", "csv", "records", "schema"]],
  ];
  for (const [label, terms] of checks) {
    if (terms.some((term) => lower.includes(term))) signals.push(label);
  }
  return signals;
}

function classifyRepository(repo, categoriesSeen, readmeSignals) {
  const text = [
    repo.full_name,
    repo.name,
    repo.description || "",
    repo.topics?.join(" ") || "",
    categoriesSeen.join(" "),
    readmeSignals.join(" "),
  ].join(" ").toLowerCase();

  const isIncidentDocumentation = /(incident|breach|victim|ransomware|vcdb|dataset|records|case study|data exposure)/.test(text)
    && !/(framework|platform|scanner|toolkit|library|module|install|docker image)/.test(text);
  const isAnalysisTool = /(tool|scanner|forensic|dfir|misp|opencti|autopsy|volatility|velociraptor|timesketch|amass|splink|module|platform|framework|library)/.test(text);

  let dishaUse = "Public research reference";
  if (/forensic|dfir|autopsy|volatility|timesketch|velociraptor/.test(text)) dishaUse = "Digital forensics and evidence verification";
  else if (/misp|opencti|threat|ioc|stix|ransomware/.test(text)) dishaUse = "Threat intelligence and incident records";
  else if (/amass|attack surface|domain|dns/.test(text)) dishaUse = "Public attack-surface research";
  else if (/dataset|records|vcdb|breach/.test(text)) dishaUse = "Incident documentation and dataset reference";
  else if (/splink|record linkage|provenance/.test(text)) dishaUse = "Record linkage and provenance validation";

  return {
    repositoryClass: isIncidentDocumentation ? "incident_documentation" : isAnalysisTool ? "analysis_tool" : "research_reference",
    dishaUse,
    sensitiveDataPolicy: "Catalogue stores metadata and documentation links only; do not collect or redistribute stolen personal, medical, biometric, financial or authentication data.",
  };
}

function normalizeRepo(repo, source) {
  return {
    githubRepositoryId: repo.id,
    nodeId: repo.node_id,
    fullName: repo.full_name,
    owner: repo.owner?.login || "",
    name: repo.name,
    htmlUrl: repo.html_url,
    cloneUrl: repo.clone_url,
    description: repo.description || "",
    homepage: repo.homepage || "",
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    openIssues: repo.open_issues_count ?? 0,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    defaultBranch: repo.default_branch || "",
    license: repo.license?.spdx_id || repo.license?.name || "NOASSERTION",
    archived: Boolean(repo.archived),
    disabled: Boolean(repo.disabled),
    private: Boolean(repo.private),
    visibility: repo.visibility || "public",
    topics: repo.topics || [],
    availabilityStatus: "available",
    sourceDiscovery: source,
    retrievalTimestamp: now,
  };
}

function toCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (value) => {
    const text = Array.isArray(value) ? value.join("|") : value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => esc(row[header])).join(","))].join("\n") + "\n";
}

function renderReport(catalogue, errors, limits) {
  const byCategory = new Map();
  const byClass = new Map();
  for (const item of catalogue) {
    for (const category of item.categories) byCategory.set(category, (byCategory.get(category) || 0) + 1);
    byClass.set(item.repositoryClass, (byClass.get(item.repositoryClass) || 0) + 1);
  }
  const top = [...catalogue].sort((a, b) => b.stars - a.stars).slice(0, 30);
  return [
    "# DISHA 6.6 GitHub Repository Verification Report",
    "",
    `Generated: ${now}`,
    "",
    "## Scope",
    "",
    "This catalogue records public GitHub repository metadata, documentation signals and verification timestamps for breach research, incident documentation, forensic tooling and evidence verification. It does not download, copy, normalize or redistribute breached personal, medical, biometric, financial or authentication data.",
    "",
    "## Coverage Limits",
    "",
    "- GitHub search is not exhaustive and can cap repository search results.",
    `- Search pages inspected per category/order: ${limits.pagesPerOrder}.`,
    `- Search page size: ${limits.perPage}.`,
    `- API token present: ${limits.authenticated ? "yes" : "no"}.`,
    "- Repositories are deduplicated by immutable GitHub repository ID.",
    "- README inspection is limited to common README names on the default, main or master branch.",
    "- Release history is sampled from the latest five GitHub releases when API budget permits.",
    "",
    "## Summary",
    "",
    `- Total verified available repositories: ${catalogue.length}`,
    `- Incident documentation records: ${byClass.get("incident_documentation") || 0}`,
    `- Analysis tools: ${byClass.get("analysis_tool") || 0}`,
    `- Research references: ${byClass.get("research_reference") || 0}`,
    "",
    "## Category Counts",
    "",
    "| Category | Repositories |",
    "| :--- | ---: |",
    ...[...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([category, count]) => `| ${category} | ${count} |`),
    "",
    "## Highest-Star Verified Repositories",
    "",
    "| Repository | Stars | Forks | Class | DISHA use | Last push | License |",
    "| :--- | ---: | ---: | :--- | :--- | :--- | :--- |",
    ...top.map((repo) => `| [${repo.fullName}](${repo.htmlUrl}) | ${repo.stars} | ${repo.forks} | ${repo.repositoryClass} | ${repo.dishaUse} | ${repo.pushedAt || ""} | ${repo.license} |`),
    "",
    "## Search / API Errors",
    "",
    errors.length
      ? errors.map((error) => `- ${error.stage}: ${error.detail}`).join("\n")
      : "No GitHub API errors were recorded during this run.",
    "",
    "## Reproducibility",
    "",
    "Run:",
    "",
    "```powershell",
    "node scripts/osint/build-github-research-catalogue.mjs",
    "```",
    "",
    "Set `GITHUB_TOKEN` or `GH_TOKEN` for a higher API budget. Without a token, the catalogue remains truthful but may cover fewer pages/details.",
    "",
  ].join("\n");
}

function renderInstallationPlan(catalogue) {
  const selected = [...catalogue]
    .filter((repo) => ["analysis_tool", "incident_documentation"].includes(repo.repositoryClass))
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 40);
  return [
    "# DISHA 6.6 Public Research Catalogue Installation Plan",
    "",
    `Generated: ${now}`,
    "",
    "## Operating Rule",
    "",
    "Install tools only when they support lawful, authorized research, incident response, forensic validation or public-source documentation. Do not ingest stolen datasets or secrets. Incident documentation repositories remain reference sources unless their license and data provenance are reviewed.",
    "",
    "## Integration Phases",
    "",
    "1. Reference catalogue: serve `github_master_catalogue.json` through the local DISHA API.",
    "2. Tool review: verify license, maintenance, install method and local smoke command per analysis tool.",
    "3. Sandbox execution: run tools in isolated worker containers with read-only input and no broad host access.",
    "4. Evidence admission: persist only source URL, retrieval timestamp, hash, provenance and operator authorization.",
    "5. Incident data policy: keep breach/incident repositories as source-linked metadata unless the material is lawful and non-sensitive.",
    "",
    "## Candidate Priority List",
    "",
    "| Priority | Repository | Class | Stars | Installation posture |",
    "| ---: | :--- | :--- | ---: | :--- |",
    ...selected.map((repo, index) => `| ${index + 1} | [${repo.fullName}](${repo.htmlUrl}) | ${repo.repositoryClass} | ${repo.stars} | ${repo.archived ? "reference only; archived" : repo.readmeSignals.includes("installation") ? "review install instructions" : "manual review required"} |`),
    "",
    "## Required Gates Before Execution",
    "",
    "- License compatible with local DISHA use.",
    "- No bundled stolen personal, medical, biometric, financial or authentication data.",
    "- Local smoke test defined and passing.",
    "- Network behavior documented.",
    "- Operator authorization scope recorded.",
    "- Output normalization maps every finding to exact source URL and retrieval timestamp.",
    "",
  ].join("\n");
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(WEB_OUT_DIR, { recursive: true });
  await fs.mkdir(REPORT_OUT_DIR, { recursive: true });
  const reposById = new Map();
  const categoriesById = new Map();
  const discoveryById = new Map();
  const errors = [];
  const pagesPerOrder = Number(process.env.DISHA_GITHUB_CATALOGUE_PAGES || 2);
  const perPage = 25;

  for (const fullName of seedRepos) {
    const result = await getRepository(fullName);
    if (!result.ok) {
      errors.push({ stage: "seed", detail: `${fullName} returned ${result.status}` });
      continue;
    }
    const repo = normalizeRepo(result.data, "seed");
    reposById.set(repo.githubRepositoryId, repo);
    categoriesById.set(repo.githubRepositoryId, new Set(["supplied_seed_repository"]));
    discoveryById.set(repo.githubRepositoryId, new Set([`seed:${fullName}`]));
    await sleep(150);
  }

  for (const category of categories) {
    for (const order of ["desc", "asc"]) {
      for (let page = 1; page <= pagesPerOrder; page += 1) {
        const result = await searchRepositories(category, order, page);
        if (!result.ok) {
          errors.push({ stage: "search", detail: `${category.id} ${order} page ${page} returned ${result.status}; remaining=${result.rateLimitRemaining}` });
          continue;
        }
        for (const item of result.data.items || []) {
          const repo = normalizeRepo(item, `search:${category.id}:stars:${order}:page:${page}`);
          if (!reposById.has(repo.githubRepositoryId)) reposById.set(repo.githubRepositoryId, repo);
          if (!categoriesById.has(repo.githubRepositoryId)) categoriesById.set(repo.githubRepositoryId, new Set());
          categoriesById.get(repo.githubRepositoryId).add(category.id);
          if (!discoveryById.has(repo.githubRepositoryId)) discoveryById.set(repo.githubRepositoryId, new Set());
          discoveryById.get(repo.githubRepositoryId).add(`search:${category.id}:stars:${order}:page:${page}`);
        }
        await sleep(250);
      }
    }
    if (pagesPerOrder > 0) {
      const zero = await searchZeroStarRepositories(category, 1);
      if (!zero.ok) {
        errors.push({ stage: "zero-star-search", detail: `${category.id} returned ${zero.status}; remaining=${zero.rateLimitRemaining}` });
      } else {
        for (const item of zero.data.items || []) {
          const repo = normalizeRepo(item, `search:${category.id}:stars:0:page:1`);
          if (!reposById.has(repo.githubRepositoryId)) reposById.set(repo.githubRepositoryId, repo);
          if (!categoriesById.has(repo.githubRepositoryId)) categoriesById.set(repo.githubRepositoryId, new Set());
          categoriesById.get(repo.githubRepositoryId).add(category.id);
          if (!discoveryById.has(repo.githubRepositoryId)) discoveryById.set(repo.githubRepositoryId, new Set());
          discoveryById.get(repo.githubRepositoryId).add(`search:${category.id}:stars:0:page:1`);
        }
      }
      await sleep(250);
    }
  }

  const catalogue = [];
  for (const repo of reposById.values()) {
    const latestCommitSha = await getLatestSha(repo.fullName, repo.defaultBranch);
    const readme = await inspectReadme(repo.fullName, repo.defaultBranch);
    let releases = [];
    if (githubToken || catalogue.length < seedRepos.length) {
      releases = await getReleases(repo.fullName);
      await sleep(100);
    }
    const categoriesSeen = [...(categoriesById.get(repo.githubRepositoryId) || new Set())].sort();
    const classification = classifyRepository(repo, categoriesSeen, readme.readmeSignals);
    catalogue.push({
      ...repo,
      categories: categoriesSeen,
      discoverySources: [...(discoveryById.get(repo.githubRepositoryId) || new Set())].sort(),
      latestCommitSha,
      latestCommitUrl: latestCommitSha ? `${repo.htmlUrl}/commit/${latestCommitSha}` : "",
      readmeUrl: readme.readmeUrl,
      readmeBytes: readme.readmeBytes,
      readmeSignals: readme.readmeSignals,
      releaseCountSampled: releases.length,
      latestReleases: releases,
      verifiedAvailabilityAt: now,
      ...classification,
    });
  }

  catalogue.sort((a, b) => b.stars - a.stars || a.fullName.localeCompare(b.fullName));
  const incidentCatalogue = catalogue.filter((repo) => repo.repositoryClass === "incident_documentation");

  const csvRows = catalogue.map((repo) => ({
    github_repository_id: repo.githubRepositoryId,
    full_name: repo.fullName,
    html_url: repo.htmlUrl,
    categories: repo.categories,
    repository_class: repo.repositoryClass,
    disha_use: repo.dishaUse,
    stars: repo.stars,
    forks: repo.forks,
    created_at: repo.createdAt,
    pushed_at: repo.pushedAt,
    license: repo.license,
    archived: repo.archived,
    latest_commit_sha: repo.latestCommitSha,
    availability_status: repo.availabilityStatus,
    readme_url: repo.readmeUrl,
    retrieval_timestamp: repo.retrievalTimestamp,
  }));

  const incidentRows = incidentCatalogue.map((repo) => ({
    github_repository_id: repo.githubRepositoryId,
    full_name: repo.fullName,
    html_url: repo.htmlUrl,
    categories: repo.categories,
    stars: repo.stars,
    forks: repo.forks,
    created_at: repo.createdAt,
    pushed_at: repo.pushedAt,
    license: repo.license,
    archived: repo.archived,
    latest_commit_sha: repo.latestCommitSha,
    source_urls: [repo.htmlUrl, repo.readmeUrl].filter(Boolean),
    retrieval_timestamp: repo.retrievalTimestamp,
    sensitive_data_policy: repo.sensitiveDataPolicy,
  }));

  const payload = {
    generatedAt: now,
    safetyRule: "Metadata and documentation catalogue only. Do not collect or redistribute stolen personal, medical, biometric, financial or authentication data.",
    githubSearchLimits: {
      pagesPerOrder,
      perPage,
      authenticated: Boolean(githubToken),
      exhaustiveCoverageClaimed: false,
    },
    seedRepositories: seedRepos,
    categories,
    totalRepositories: catalogue.length,
    catalogue,
    errors,
  };

  const outputs = new Map([
    ["github_master_catalogue.json", JSON.stringify(payload, null, 2)],
    ["github_master_catalogue.csv", toCsv(csvRows)],
    ["breach_incident_catalogue.csv", toCsv(incidentRows)],
    ["repository_verification_report.md", renderReport(catalogue, errors, { pagesPerOrder, perPage, authenticated: Boolean(githubToken) })],
    ["installation_plan.md", renderInstallationPlan(catalogue)],
  ]);

  for (const [fileName, content] of outputs) {
    await fs.writeFile(path.join(OUT_DIR, fileName), content, "utf8");
    await fs.writeFile(path.join(WEB_OUT_DIR, fileName), content, "utf8");
    await fs.writeFile(path.join(REPORT_OUT_DIR, fileName), content, "utf8");
  }

  console.info(JSON.stringify({
    generatedAt: now,
    outputDir: OUT_DIR,
    webOutputDir: WEB_OUT_DIR,
    reportOutputDir: REPORT_OUT_DIR,
    totalRepositories: catalogue.length,
    incidentDocumentation: incidentCatalogue.length,
    errors: errors.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
