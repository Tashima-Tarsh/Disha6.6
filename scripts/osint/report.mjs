import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const REGISTRY_PATH = path.join(ROOT_DIR, "data/osint/upstream-registry.json");
const REPORT_JSON_PATH = path.join(ROOT_DIR, "reports/osint-runtime-report.json");
const REPORT_MD_PATH = path.join(ROOT_DIR, "reports/osint-runtime-report.md");

export async function generateReport() {
  console.info("Generating comprehensive OSINT runtime report...");
  const raw = await fs.readFile(REGISTRY_PATH, "utf8");
  const registry = JSON.parse(raw);

  const reportDate = new Date().toISOString();

  // Metrics computation
  const total = registry.length;
  const byRuntime = {};
  const byCategory = {};
  const byStatus = {};
  const byHealth = {};
  const byForkStatus = {};

  for (const tool of registry) {
    const r = tool.runtimeType || "unspecified";
    byRuntime[r] = (byRuntime[r] || 0) + 1;

    const c = tool.category || "general";
    byCategory[c] = (byCategory[c] || 0) + 1;

    const s = tool.status || "UNKNOWN";
    byStatus[s] = (byStatus[s] || 0) + 1;

    const h = tool.healthStatus || "UNKNOWN";
    byHealth[h] = (byHealth[h] || 0) + 1;

    const f = tool.forkStatus || "FORK_PENDING";
    byForkStatus[f] = (byForkStatus[f] || 0) + 1;
  }

  const reportData = {
    generatedAt: reportDate,
    totalCataloged: total,
    metrics: {
      byRuntime,
      byCategory,
      byStatus,
      byHealth,
      byForkStatus,
    },
    tools: registry.map((t) => ({
      toolId: t.toolId,
      name: t.name,
      fullName: t.fullName,
      upstreamUrl: t.upstreamUrl,
      category: t.category,
      runtimeType: t.runtimeType,
      status: t.status,
      healthStatus: t.healthStatus,
      forkUrl: t.forkUrl,
      forkStatus: t.forkStatus,
      pinnedSha: t.pinnedSha,
      license: t.license,
      stars: t.stars,
      lastVerified: t.lastVerified,
      lastSmokeTested: t.lastSmokeTested,
      smokeResult: t.smokeResult,
    })),
  };

  // Write JSON report
  await fs.mkdir(path.dirname(REPORT_JSON_PATH), { recursive: true });
  await fs.writeFile(REPORT_JSON_PATH, JSON.stringify(reportData, null, 2), "utf8");

  // Markdown Report Generation
  const mdLines = [
    "# DISHA 6.6 — Truthful OSINT Runtime & Upstream Integration Report",
    "",
    `**Generated:** ${reportDate}<br />`,
    `**Total Upstream Repositories Cataloged:** ${total}<br />`,
    `**Truthful Data Policy:** ZERO MOCK / REAL REPOSITORIES / VERIFIED ARCHITECTURE<br />`,
    "",
    "---",
    "",
    "## 1. Executive Summary & Status Metrics",
    "",
    "| Metric Category | Detail / Count |",
    "| :--- | :--- |",
    `| **Total Cataloged Upstreams** | **${total}** |`,
    `| **Fork Status** | Verified Forks: **${byForkStatus["FORKED"] || 0}**, Pending: **${byForkStatus["FORK_PENDING"] || 0}** |`,
    `| **Health Classification** | Healthy: **${byHealth["HEALTHY"] || 0}**, Unconfigured: **${byHealth["UNCONFIGURED"] || 0}**, Reference Only: **${(byHealth["REFERENCE_ONLY"] || 0)}**, Degraded: **${byHealth["DEGRADED"] || 0}**, Unavailable: **${byHealth["UNAVAILABLE"] || 0}** |`,
    `| **Runtime Breakdown** | Python: **${byRuntime["python"] || 0}**, Go: **${byRuntime["go"] || 0}**, Node: **${byRuntime["node"] || 0}**, Rust: **${byRuntime["rust"] || 0}**, Docker: **${byRuntime["docker"] || 0}**, Reference/Other: **${(byRuntime["dataset-only"] || 0) + (byRuntime["gui-only"] || 0) + (byRuntime["library-only"] || 0) + (byRuntime["binary"] || 0)}** |`,
    "",
    "### Runtime Distribution",
    "",
    "```",
    Object.entries(byRuntime)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k.padEnd(20)} : ${v}`)
      .join("\n"),
    "```",
    "",
    "### Category Distribution",
    "",
    "```",
    Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k.padEnd(20)} : ${v}`)
      .join("\n"),
    "```",
    "",
    "---",
    "",
    "## 2. Mandatory Core OSINT Tools Status",
    "",
    "| Tool | Category | Runtime | Upstream Repository | Fork Status | Execution Class | Status |",
    "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
  ];

  const mandatoryTools = registry.filter((t) => t.isMandatoryChat);
  for (const m of mandatoryTools) {
    const forkDisplay = m.forkUrl ? `[Forked](${m.forkUrl})` : "Pending";
    mdLines.push(`| **${m.name}** | ${m.category} | \`${m.runtimeType}\` | [${m.fullName}](${m.upstreamUrl}) | ${forkDisplay} | \`${m.executionClass}\` | \`${m.status}\` |`);
  }

  mdLines.push("");
  mdLines.push("---");
  mdLines.push("");
  mdLines.push("## 3. Complete Upstream Repository Inventory (Top 100 Sample)");
  mdLines.push("");
  mdLines.push("| Tool ID | Name | Category | Runtime | Upstream URL | License | Status |");
  mdLines.push("| :--- | :--- | :--- | :--- | :--- | :--- | :--- |");

  for (const tool of registry.slice(0, 100)) {
    mdLines.push(`| \`${tool.toolId}\` | ${tool.name} | ${tool.category} | \`${tool.runtimeType}\` | [GitHub](${tool.upstreamUrl}) | ${tool.license} | \`${tool.status}\` |`);
  }

  mdLines.push("");
  mdLines.push("*(Full machine-readable manifest containing all " + total + " repositories is available in `reports/osint-runtime-report.json`)*");
  mdLines.push("");

  await fs.writeFile(REPORT_MD_PATH, mdLines.join("\n"), "utf8");
  console.info(`Report generated at: ${REPORT_JSON_PATH} and ${REPORT_MD_PATH}`);
  return { jsonPath: REPORT_JSON_PATH, mdPath: REPORT_MD_PATH };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateReport().catch((err) => {
    console.error("Report generation error:", err);
    process.exitCode = 1;
  });
}
