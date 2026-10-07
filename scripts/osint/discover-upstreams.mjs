import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const REGISTRY_PATH = path.join(ROOT_DIR, "data/osint/upstream-registry.json");
const CSV_URL = "https://raw.githubusercontent.com/osintshifu/awesome-osint-repos/main/osint-repositories.csv";

// Mandatory repositories discussed across chat
const MANDATORY_CHAT_REPOS = [
  // Identity / Username
  { name: "SpiderFoot", repoUrl: "https://github.com/smicallef/spiderfoot", category: "framework", targetTypes: ["domain", "ip", "email", "phone_number", "username"], runtimeType: "python", license: "MIT" },
  { name: "theHarvester", repoUrl: "https://github.com/laramies/theHarvester", category: "network", targetTypes: ["domain"], runtimeType: "python", license: "GPL-2.0" },
  { name: "OWASP Amass", repoUrl: "https://github.com/owasp-amass/amass", category: "network", targetTypes: ["domain"], runtimeType: "go", license: "Apache-2.0" },
  { name: "IntelOwl", repoUrl: "https://github.com/intelowlproject/IntelOwl", category: "threat-intelligence", targetTypes: ["ip", "domain", "hash", "url"], runtimeType: "docker", license: "AGPL-3.0" },
  { name: "OpenSanctions", repoUrl: "https://github.com/opensanctions/opensanctions", category: "identity", targetTypes: ["name", "company"], runtimeType: "python", license: "MIT" },
  { name: "OpenCTI", repoUrl: "https://github.com/OpenCTI-Platform/opencti", category: "threat-intelligence", targetTypes: ["ip", "domain", "cve"], runtimeType: "node", license: "Apache-2.0" },
  { name: "Recon-ng", repoUrl: "https://github.com/lanmaster53/recon-ng", category: "network", targetTypes: ["domain", "company"], runtimeType: "python", license: "GPL-3.0" },
  { name: "Photon", repoUrl: "https://github.com/s0md3v/Photon", category: "network", targetTypes: ["domain", "url"], runtimeType: "python", license: "GPL-3.0" },
  { name: "Sherlock", repoUrl: "https://github.com/sherlock-project/sherlock", category: "identity", targetTypes: ["username"], runtimeType: "python", license: "MIT" },
  { name: "Maigret", repoUrl: "https://github.com/soxoj/maigret", category: "identity", targetTypes: ["username"], runtimeType: "python", license: "MIT" },
  { name: "Holehe", repoUrl: "https://github.com/megadose/holehe", category: "identity", targetTypes: ["email"], runtimeType: "python", license: "GPL-3.0" },
  { name: "PhoneInfoga", repoUrl: "https://github.com/sundowndev/phoneinfoga", category: "identity", targetTypes: ["phone_number"], runtimeType: "go", license: "GPL-3.0" },
  { name: "Instaloader", repoUrl: "https://github.com/instaloader/instaloader", category: "identity", targetTypes: ["username"], runtimeType: "python", license: "MIT" },
  { name: "Telethon", repoUrl: "https://github.com/LonamiWebs/Telethon", category: "identity", targetTypes: ["telegram_username"], runtimeType: "python", license: "MIT" },
  { name: "GHunt", repoUrl: "https://github.com/mxrch/GHunt", category: "identity", targetTypes: ["email"], runtimeType: "python", license: "GPL-3.0" },
  { name: "WhatsMyName", repoUrl: "https://github.com/WebBreacher/WhatsMyName", category: "identity", targetTypes: ["username"], runtimeType: "dataset-only", license: "CC-BY-SA-4.0" },
  { name: "Blackbird", repoUrl: "https://github.com/p1ngul1n0/blackbird", category: "identity", targetTypes: ["username"], runtimeType: "python", license: "GPL-3.0" },
  { name: "Social Analyzer", repoUrl: "https://github.com/qeeqbox/social-analyzer", category: "identity", targetTypes: ["username", "name", "email", "phone_number"], runtimeType: "node", license: "AGPL-3.0" },
  { name: "Snoop", repoUrl: "https://github.com/snooppr/snoop", category: "identity", targetTypes: ["username"], runtimeType: "python", license: "GPL-3.0" },
  { name: "Toutatis", repoUrl: "https://github.com/megadose/toutatis", category: "identity", targetTypes: ["username"], runtimeType: "python", license: "GPL-3.0" },
  { name: "Osintgram", repoUrl: "https://github.com/Datalux/Osintgram", category: "identity", targetTypes: ["username"], runtimeType: "python", license: "GPL-3.0" },
  { name: "OpenOSINT", repoUrl: "https://github.com/The-Art-of-Hacking/OpenOSINT", category: "framework", targetTypes: ["general"], runtimeType: "library-only", license: "MIT" },
  { name: "OSINT Framework", repoUrl: "https://github.com/lockfale/OSINT-Framework", category: "framework", targetTypes: ["general"], runtimeType: "gui-only", license: "MIT" },

  // Infrastructure / Domain / Network
  { name: "BBOT", repoUrl: "https://github.com/blacklanternsecurity/bbot", category: "network", targetTypes: ["domain", "ip", "asn", "cidr"], runtimeType: "python", license: "GPL-3.0" },
  { name: "Findomain", repoUrl: "https://github.com/Findomain/Findomain", category: "network", targetTypes: ["domain"], runtimeType: "rust", license: "GPL-3.0" },
  { name: "Assetfinder", repoUrl: "https://github.com/tomnomnom/assetfinder", category: "network", targetTypes: ["domain"], runtimeType: "go", license: "MIT" },
  { name: "dnsx", repoUrl: "https://github.com/projectdiscovery/dnsx", category: "network", targetTypes: ["domain"], runtimeType: "go", license: "MIT" },
  { name: "httpx", repoUrl: "https://github.com/projectdiscovery/httpx", category: "network", targetTypes: ["domain", "url"], runtimeType: "go", license: "MIT" },
  { name: "gau", repoUrl: "https://github.com/lc/gau", category: "network", targetTypes: ["domain"], runtimeType: "go", license: "MIT" },
  { name: "waybackurls", repoUrl: "https://github.com/tomnomnom/waybackurls", category: "network", targetTypes: ["domain"], runtimeType: "go", license: "MIT" },
  { name: "waymore", repoUrl: "https://github.com/xnl-h4ck3r/waymore", category: "network", targetTypes: ["domain"], runtimeType: "python", license: "MIT" },
  { name: "Unfurl", repoUrl: "https://github.com/obsidianforensics/unfurl", category: "network", targetTypes: ["url"], runtimeType: "python", license: "Apache-2.0" },
  { name: "sn0int", repoUrl: "https://github.com/kpcyrd/sn0int", category: "framework", targetTypes: ["domain", "ip", "email", "phone_number"], runtimeType: "rust", license: "GPL-3.0" },
  { name: "Subfinder", repoUrl: "https://github.com/projectdiscovery/subfinder", category: "network", targetTypes: ["domain"], runtimeType: "go", license: "MIT" },

  // Metadata / File Intelligence
  { name: "ExifTool", repoUrl: "https://github.com/exiftool/exiftool", category: "metadata", targetTypes: ["file"], runtimeType: "binary", license: "Artistic-1.0" },
  { name: "MetaDetective", repoUrl: "https://github.com/accidental-rebel/MetaDetective", category: "metadata", targetTypes: ["file"], runtimeType: "python", license: "GPL-3.0" },
  { name: "Metagoofil", repoUrl: "https://github.com/laramies/metagoofil", category: "metadata", targetTypes: ["domain"], runtimeType: "python", license: "GPL-2.0" },
  { name: "Apache Tika", repoUrl: "https://github.com/apache/tika", category: "documents", targetTypes: ["file"], runtimeType: "binary", license: "Apache-2.0" },
  { name: "MediaInfo", repoUrl: "https://github.com/MediaArea/MediaInfo", category: "media", targetTypes: ["file"], runtimeType: "binary", license: "BSD-2-Clause" },
  { name: "ExifLooter", repoUrl: "https://github.com/aydinnydn/ExifLooter", category: "metadata", targetTypes: ["file", "url"], runtimeType: "go", license: "GPL-3.0" },
  { name: "Sherloq", repoUrl: "https://github.com/GuidoBartoli/sherloq", category: "media", targetTypes: ["file"], runtimeType: "python", license: "GPL-3.0" },
  { name: "pyWhat", repoUrl: "https://github.com/bee-san/pyWhat", category: "metadata", targetTypes: ["text", "hash"], runtimeType: "python", license: "MIT" },
  { name: "Name-That-Hash", repoUrl: "https://github.com/HashPals/Name-That-Hash", category: "metadata", targetTypes: ["hash"], runtimeType: "python", license: "GPL-3.0" },

  // Leak / Secret Intelligence
  { name: "TruffleHog", repoUrl: "https://github.com/trufflesecurity/trufflehog", category: "secrets", targetTypes: ["git_repo", "filesystem"], runtimeType: "go", license: "AGPL-3.0" },
  { name: "Gitleaks", repoUrl: "https://github.com/gitleaks/gitleaks", category: "secrets", targetTypes: ["git_repo", "filesystem"], runtimeType: "go", license: "MIT" },
  { name: "detect-secrets", repoUrl: "https://github.com/Yelp/detect-secrets", category: "secrets", targetTypes: ["git_repo", "filesystem"], runtimeType: "python", license: "Apache-2.0" },
  { name: "ggshield", repoUrl: "https://github.com/GitGuardian/ggshield", category: "secrets", targetTypes: ["git_repo", "filesystem"], runtimeType: "python", license: "MIT" },
  { name: "git-hound", repoUrl: "https://github.com/tillson/git-hound", category: "secrets", targetTypes: ["company", "keyword"], runtimeType: "go", license: "MIT" },
  { name: "gitGraber", repoUrl: "https://github.com/hisxo/gitGraber", category: "secrets", targetTypes: ["keyword", "domain"], runtimeType: "python", license: "MIT" },
  { name: "github-dorks", repoUrl: "https://github.com/techgaun/github-dorks", category: "secrets", targetTypes: ["keyword", "domain"], runtimeType: "python", license: "MIT" },
  { name: "KeyLeak-Detector", repoUrl: "https://github.com/0xcyber/KeyLeak-Detector", category: "secrets", targetTypes: ["file", "text"], runtimeType: "python", license: "MIT" },
  { name: "Cariddi", repoUrl: "https://github.com/edoardottt/cariddi", category: "secrets", targetTypes: ["domain", "url"], runtimeType: "go", license: "GPL-3.0" },
  { name: "SubDomainizer", repoUrl: "https://github.com/nsonaniya2010/SubDomainizer", category: "secrets", targetTypes: ["domain", "url"], runtimeType: "python", license: "GPL-3.0" },
  { name: "Leaker", repoUrl: "https://github.com/The404Hacking/Leaker", category: "secrets", targetTypes: ["email", "username"], runtimeType: "python", license: "GPL-3.0" },
  { name: "MailAccess", repoUrl: "https://github.com/Lone-Ranger-Op/MailAccess", category: "secrets", targetTypes: ["email"], runtimeType: "python", license: "GPL-3.0" },
  { name: "pwnedOrNot", repoUrl: "https://github.com/thewhiteh4t/pwnedOrNot", category: "secrets", targetTypes: ["email"], runtimeType: "python", license: "GPL-3.0" },
  { name: "WhatBreach", repoUrl: "https://github.com/Ekultek/WhatBreach", category: "secrets", targetTypes: ["email"], runtimeType: "python", license: "Apache-2.0" },
  { name: "h8mail", repoUrl: "https://github.com/khast3x/h8mail", category: "secrets", targetTypes: ["email"], runtimeType: "python", license: "BSD-3-Clause" },
  { name: "emploleaks", repoUrl: "https://github.com/dievus/emploleaks", category: "secrets", targetTypes: ["company"], runtimeType: "python", license: "MIT" },

  // Document / Evidence
  { name: "ICIJ Datashare", repoUrl: "https://github.com/ICIJ/datashare", category: "documents", targetTypes: ["file", "document"], runtimeType: "docker", license: "GPL-3.0" },
  { name: "ICIJ Extract", repoUrl: "https://github.com/ICIJ/extract", category: "documents", targetTypes: ["file", "document"], runtimeType: "docker", license: "Apache-2.0" },
  { name: "IPED", repoUrl: "https://github.com/sepinf-inc/IPED", category: "documents", targetTypes: ["file", "disk_image"], runtimeType: "binary", license: "GPL-3.0" },
  { name: "OCRmyPDF", repoUrl: "https://github.com/ocrmypdf/OCRmyPDF", category: "documents", targetTypes: ["file", "pdf"], runtimeType: "python", license: "MPL-2.0" },
  { name: "Tesseract", repoUrl: "https://github.com/tesseract-ocr/tesseract", category: "documents", targetTypes: ["file", "image"], runtimeType: "binary", license: "Apache-2.0" },
  { name: "Docling", repoUrl: "https://github.com/DS4SD/docling", category: "documents", targetTypes: ["file", "document"], runtimeType: "python", license: "MIT" },
  { name: "MarkItDown", repoUrl: "https://github.com/microsoft/markitdown", category: "documents", targetTypes: ["file", "document"], runtimeType: "python", license: "MIT" },

  // Web Archiving
  { name: "ArchiveBox", repoUrl: "https://github.com/ArchiveBox/ArchiveBox", category: "web-archive", targetTypes: ["url"], runtimeType: "docker", license: "MIT" },
  { name: "Browsertrix Crawler", repoUrl: "https://github.com/webrecorder/browsertrix-crawler", category: "web-archive", targetTypes: ["url"], runtimeType: "docker", license: "AGPL-3.0" },
  { name: "ArchiveWeb.page", repoUrl: "https://github.com/webrecorder/archiveweb.page", category: "web-archive", targetTypes: ["url"], runtimeType: "node", license: "AGPL-3.0" },
  { name: "ReplayWeb.page", repoUrl: "https://github.com/webrecorder/replayweb.page", category: "web-archive", targetTypes: ["file"], runtimeType: "node", license: "AGPL-3.0" },
  { name: "waybackpack", repoUrl: "https://github.com/jsvine/waybackpack", category: "web-archive", targetTypes: ["url"], runtimeType: "python", license: "MIT" },
  { name: "Bellingcat Auto Archiver", repoUrl: "https://github.com/bellingcat/auto-archiver", category: "web-archive", targetTypes: ["url"], runtimeType: "python", license: "MIT" },
  { name: "kronikier", repoUrl: "https://github.com/marnix/kronikier", category: "web-archive", targetTypes: ["url"], runtimeType: "python", license: "GPL-3.0" },

  // Media Intelligence
  { name: "yt-dlp", repoUrl: "https://github.com/yt-dlp/yt-dlp", category: "media", targetTypes: ["url"], runtimeType: "python", license: "Unlicense" },
  { name: "pyannote.audio", repoUrl: "https://github.com/pyannote/pyannote-audio", category: "media", targetTypes: ["audio"], runtimeType: "python", license: "MIT" },
  { name: "Vosk API", repoUrl: "https://github.com/alphacep/vosk-api", category: "media", targetTypes: ["audio"], runtimeType: "python", license: "Apache-2.0" },

  // Threat Intelligence
  { name: "MISP", repoUrl: "https://github.com/MISP/MISP", category: "threat-intelligence", targetTypes: ["cve", "indicator", "domain", "ip", "hash"], runtimeType: "docker", license: "GPL-3.0" },
  { name: "MISP Modules", repoUrl: "https://github.com/MISP/misp-modules", category: "threat-intelligence", targetTypes: ["cve", "indicator"], runtimeType: "python", license: "AGPL-3.0" },
  { name: "Yeti", repoUrl: "https://github.com/yeti-platform/yeti", category: "threat-intelligence", targetTypes: ["indicator", "ip", "domain", "hash"], runtimeType: "docker", license: "Apache-2.0" },
  { name: "Cortex", repoUrl: "https://github.com/TheHive-Project/Cortex", category: "threat-intelligence", targetTypes: ["indicator", "ip", "domain", "hash"], runtimeType: "docker", license: "AGPL-3.0" },
  { name: "Malwoverview", repoUrl: "https://github.com/alexandreborges/malwoverview", category: "threat-intelligence", targetTypes: ["hash", "ip", "domain"], runtimeType: "python", license: "GPL-3.0" },
];

function parseCsv(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentField = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField);
      currentField = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentField);
      currentField = "";
      if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
        lines.push(row);
      }
      row = [];
    } else {
      currentField += char;
    }
  }

  if (currentField !== "" || row.length > 0) {
    row.push(currentField);
    lines.push(row);
  }

  return lines;
}

function parseGithubUrl(rawUrl) {
  if (!rawUrl) return null;
  const match = rawUrl.trim().match(/https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (!match) return null;
  const owner = match[1];
  let repo = match[2];
  if (repo.endsWith(".git")) repo = repo.slice(0, -4);
  return {
    canonicalUrl: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
    fullName: `${owner}/${repo}`.toLowerCase(),
  };
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapCategory(catRaw) {
  const str = String(catRaw || "").toLowerCase();
  if (str.includes("social") || str.includes("identity") || str.includes("username") || str.includes("person") || str.includes("phone") || str.includes("email")) return "identity";
  if (str.includes("domain") || str.includes("subdomain") || str.includes("network") || str.includes("dns") || str.includes("ip") || str.includes("web")) return "network";
  if (str.includes("secret") || str.includes("leak") || str.includes("credential") || str.includes("breach")) return "secrets";
  if (str.includes("metadata") || str.includes("exif") || str.includes("hash")) return "metadata";
  if (str.includes("doc") || str.includes("pdf") || str.includes("text") || str.includes("ocr")) return "documents";
  if (str.includes("archive") || str.includes("history")) return "web-archive";
  if (str.includes("media") || str.includes("video") || str.includes("audio") || str.includes("image")) return "media";
  if (str.includes("threat") || str.includes("malware") || str.includes("cve") || str.includes("intel")) return "threat-intelligence";
  return "framework";
}

function mapRuntime(typeRaw, descRaw) {
  const combined = `${typeRaw || ""} ${descRaw || ""}`.toLowerCase();
  if (combined.includes("python") || combined.includes("pip ") || combined.includes("py")) return "python";
  if (combined.includes("golang") || combined.includes("go ")) return "go";
  if (combined.includes("javascript") || combined.includes("typescript") || combined.includes("node") || combined.includes("npm")) return "node";
  if (combined.includes("rust") || combined.includes("cargo")) return "rust";
  if (combined.includes("docker") || combined.includes("container")) return "docker";
  if (combined.includes("dataset") || combined.includes("list") || combined.includes("dorks")) return "dataset-only";
  if (combined.includes("gui") || combined.includes("web-app") || combined.includes("frontend")) return "gui-only";
  if (combined.includes("library") || combined.includes("sdk") || combined.includes("api wrapper")) return "library-only";
  return "python";
}

export async function discoverUpstreams() {
  console.info("Starting OSINT upstream discovery...");

  let existingRegistry = [];
  try {
    const raw = await fs.readFile(REGISTRY_PATH, "utf8");
    existingRegistry = JSON.parse(raw);
  } catch {
    existingRegistry = [];
  }

  const existingMap = new Map();
  for (const entry of existingRegistry) {
    if (entry.fullName) {
      existingMap.set(entry.fullName.toLowerCase(), entry);
    }
  }

  // 1. Fetch remote CSV
  console.info(`Fetching curated OSINT repositories from ${CSV_URL}...`);
  let csvRows = [];
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const text = await response.text();
    csvRows = parseCsv(text);
    console.info(`Fetched ${csvRows.length} rows from CSV.`);
  } catch (err) {
    console.error("Failed to fetch remote CSV, falling back to local/mandatory list:", err.message);
  }

  const header = csvRows[0] || [];
  const colIndex = {};
  header.forEach((name, idx) => {
    colIndex[name.trim()] = idx;
  });

  const parsedEntries = [];

  // Parse CSV entries
  for (let r = 1; r < csvRows.length; r++) {
    const row = csvRows[r];
    const repoUrl = row[colIndex["Repository"]];
    const gh = parseGithubUrl(repoUrl);
    if (!gh) continue;

    const name = row[colIndex["Project"]] || gh.repo;
    const description = row[colIndex["Description"]] || "";
    const rawCategory = row[colIndex["Categories"]] || "";
    const rawType = row[colIndex["Type"]] || "";
    const rawTarget = row[colIndex["Target Input"]] || "";
    const license = row[colIndex["License"]] || "Unknown";
    const stars = parseInt(row[colIndex["Stars"]] || "0", 10) || 0;
    const isArchived = (row[colIndex["Archived"]] || "").toLowerCase() === "true";

    const toolId = slugify(name);
    const category = mapCategory(rawCategory);
    const runtimeType = mapRuntime(rawType, description);

    parsedEntries.push({
      toolId,
      name,
      fullName: gh.fullName,
      upstreamUrl: gh.canonicalUrl,
      owner: gh.owner,
      repo: gh.repo,
      description,
      category,
      categories: rawCategory ? rawCategory.split(";").map((s) => s.trim()).filter(Boolean) : [category],
      targetInputs: rawTarget ? rawTarget.split(";").map((s) => s.trim().toLowerCase()).filter(Boolean) : ["general"],
      runtimeType,
      license,
      stars,
      isArchived,
      source: "awesome-osint-repos",
    });
  }

  // Add / merge mandatory chat repositories
  for (const m of MANDATORY_CHAT_REPOS) {
    const gh = parseGithubUrl(m.repoUrl);
    if (!gh) continue;
    const toolId = slugify(m.name);
    const existing = parsedEntries.find((e) => e.fullName === gh.fullName);
    if (existing) {
      existing.name = m.name;
      existing.category = m.category;
      existing.targetInputs = m.targetTypes;
      existing.runtimeType = m.runtimeType;
      existing.license = m.license;
      existing.isMandatoryChat = true;
    } else {
      parsedEntries.push({
        toolId,
        name: m.name,
        fullName: gh.fullName,
        upstreamUrl: gh.canonicalUrl,
        owner: gh.owner,
        repo: gh.repo,
        description: `${m.name} OSINT tool`,
        category: m.category,
        categories: [m.category],
        targetInputs: m.targetTypes,
        runtimeType: m.runtimeType,
        license: m.license,
        stars: 0,
        isArchived: false,
        source: "mandatory-chat-upstream",
        isMandatoryChat: true,
      });
    }
  }

  // Deduplicate and assemble full registry records
  const unifiedRegistry = [];
  const seenFullNames = new Set();
  const seenToolIds = new Map();

  for (const entry of parsedEntries) {
    if (seenFullNames.has(entry.fullName)) continue;
    seenFullNames.add(entry.fullName);

    let finalToolId = entry.toolId;
    if (seenToolIds.has(finalToolId)) {
      const count = seenToolIds.get(finalToolId) + 1;
      seenToolIds.set(finalToolId, count);
      finalToolId = `${finalToolId}-${entry.owner.toLowerCase()}`;
    } else {
      seenToolIds.set(finalToolId, 1);
    }

    const previous = existingMap.get(entry.fullName) || {};

    const record = {
      toolId: finalToolId,
      name: entry.name,
      fullName: entry.fullName,
      upstreamUrl: entry.upstreamUrl,
      owner: entry.owner,
      repo: entry.repo,
      description: entry.description || previous.description || "",
      category: entry.category,
      categories: entry.categories || [entry.category],
      targetInputs: entry.targetInputs || ["general"],
      runtimeType: entry.runtimeType,
      status: previous.status || "CATALOGED",
      defaultBranch: previous.defaultBranch || "main",
      pinnedSha: previous.pinnedSha || null,
      upstreamSha: previous.upstreamSha || null,
      upstreamStatus: previous.upstreamStatus || "UNVERIFIED",
      upstreamVerifiedAt: previous.upstreamVerifiedAt || null,
      forkUrl: previous.forkUrl || null,
      forkStatus: previous.forkStatus || "FORK_PENDING",
      license: entry.license || previous.license || "Unknown",
      stars: entry.stars || previous.stars || 0,
      isArchived: entry.isArchived ?? previous.isArchived ?? false,
      isMandatoryChat: entry.isMandatoryChat ?? previous.isMandatoryChat ?? false,
      workerCommand: previous.workerCommand || null,
      workerRuntime: previous.workerRuntime || (["python", "go", "node"].includes(entry.runtimeType) ? entry.runtimeType : null),
      requiresAuth: previous.requiresAuth ?? false,
      requiresApiKey: previous.requiresApiKey ?? false,
      apiKeys: previous.apiKeys || [],
      lastVerified: previous.lastVerified || new Date().toISOString(),
      lastSmokeTested: previous.lastSmokeTested || null,
      smokeResult: previous.smokeResult || null,
      healthStatus: previous.healthStatus || "UNCONFIGURED",
      executionClass: previous.executionClass || "passive_public",
    };

    unifiedRegistry.push(record);
  }

  // Write back to data/osint/upstream-registry.json
  await fs.mkdir(path.dirname(REGISTRY_PATH), { recursive: true });
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(unifiedRegistry, null, 2), "utf8");

  console.info(`OSINT discovery complete: ${unifiedRegistry.length} unique upstreams cataloged in ${REGISTRY_PATH}`);
  return unifiedRegistry;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  discoverUpstreams().catch((err) => {
    console.error("Discovery error:", err);
    process.exitCode = 1;
  });
}
