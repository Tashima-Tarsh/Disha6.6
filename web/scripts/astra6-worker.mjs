import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Pool } from "pg";
import { createClient } from "redis";

const execFileAsync = promisify(execFile);

const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
const WORKER_ID = process.env.DISHA_WORKER_ID || `astra6-worker-${process.pid}`;
const WORKER_CLASS = process.env.WORKER_CLASS || "generic";
const POLL_INTERVAL_MS = Math.max(250, Number.parseInt(process.env.DISHA_OSINT_POLL_MS || "3000", 10));
const HEARTBEAT_INTERVAL_MS = Math.max(5_000, Number.parseInt(process.env.DISHA_OSINT_HEARTBEAT_MS || "15000", 10));
let lastHeartbeatAt = 0;

const WORKER_CLASS_TOOLS = {
  identity: ["phoneinfoga", "sherlock", "maigret", "holehe", "instaloader", "telegram-public"],
  infrastructure: ["theharvester", "owasp-amass", "subfinder"],
  advanced: ["spiderfoot", "recon-ng", "photon"],
  document: [],
  cti: [],
};

const ALLOWED_TOOLS = Object.prototype.hasOwnProperty.call(WORKER_CLASS_TOOLS, WORKER_CLASS)
  ? WORKER_CLASS_TOOLS[WORKER_CLASS]
  : null;

const IDENTITY_TOOLS = new Set(WORKER_CLASS_TOOLS.identity);
const IDENTITY_TARGET_TYPES = new Set(["email", "phone_number", "username", "instagram_username", "telegram_username"]);

const TOOL_DEFAULT_TIMEOUT_MS = {
  phoneinfoga: 30_000,
  sherlock: 120_000,
  maigret: 120_000,
  holehe: 90_000,
  instaloader: 45_000,
  "telegram-public": 45_000,
  theharvester: 120_000,
  "owasp-amass": 120_000,
  subfinder: 90_000,
  spiderfoot: 180_000,
  "recon-ng": 120_000,
  photon: 90_000,
};

const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;
const redis = createClient({ url: REDIS_URL });

redis.on("error", (error) => {
  console.info(`[ASTRA 6 Worker] Redis notice: ${error.message}`);
});

function hashValue(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function buildEvidence(sourceId, sourceName, summary, sourceUrl) {
  const retrievedAt = new Date().toISOString();
  const base = { sourceId, sourceName, sourceUrl, summary, retrievedAt };
  return {
    id: `adapter-${hashValue(base).slice(0, 16)}`,
    ...base,
    provenanceHash: hashValue(base),
  };
}

function validateTarget(toolId, target) {
  const value = String(target ?? "").trim();
  if (!value || value.length > 512 || /[\u0000\r\n]/.test(value)) {
    throw new Error("target_invalid");
  }

  if (["sherlock", "maigret"].includes(toolId) && !/^[A-Za-z0-9_.-]{2,64}$/.test(value.replace(/^@/, ""))) {
    throw new Error("invalid_username");
  }

  if (toolId === "holehe" && !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,63}$/.test(value)) {
    throw new Error("invalid_email");
  }

  if (toolId === "instaloader" && !/^[A-Za-z0-9._]{1,30}$/.test(value.replace(/^@/, ""))) {
    throw new Error("invalid_instagram_username");
  }

  if (toolId === "telegram-public" && !/^[A-Za-z0-9_]{5,32}$/.test(value.replace(/^@/, ""))) {
    throw new Error("invalid_telegram_username");
  }

  if (toolId === "phoneinfoga" && !/^\+[1-9][0-9]{7,14}$/.test(value.replace(/[\s().-]/g, ""))) {
    throw new Error("invalid_phone_number");
  }

  if (["theharvester", "owasp-amass", "subfinder", "recon-ng", "photon"].includes(toolId) && !/^(?=.{1,253}$)(?!-)(?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,63}$/.test(value)) {
    throw new Error("invalid_domain");
  }

  if (toolId === "spiderfoot") {
    const validDomain = /^(?=.{1,253}$)(?!-)(?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,63}$/.test(value);
    const validIpv4 = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(value);
    if (!validDomain && !validIpv4) throw new Error("invalid_spiderfoot_target");
  }

  return value;
}

function lastJsonObject(raw, toolId) {
  const lines = String(raw).trim().split(/\r?\n/).filter(Boolean).reverse();
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        if (typeof parsed.error === "string" && parsed.error) {
          throw new Error(`${toolId}_worker_error:${parsed.error}`);
        }
        return parsed;
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith(`${toolId}_worker_error:`)) {
        throw error;
      }
    }
  }
  throw new Error(`${toolId}_invalid_json_output`);
}

function parsePhoneInfoga(raw, target) {
  const data = {
    number: target,
    valid: false,
    localFormat: undefined,
    e164: undefined,
    internationalFormat: undefined,
    country: undefined,
    countryCode: undefined,
    countryName: undefined,
    countryPrefix: undefined,
    carrier: undefined,
    lineType: undefined,
  };

  let section = "";
  for (const rawLine of String(raw).split(/\r?\n/)) {
    const line = rawLine.trim();
    const sectionMatch = line.match(/^Results for\s+(.+)$/i);
    if (sectionMatch) {
      section = sectionMatch[1].trim().toLowerCase();
      continue;
    }

    const pair = line.match(/^([^:]{2,40}):\s*(.*)$/);
    if (!pair) continue;

    const key = pair[1].trim().toLowerCase();
    const value = pair[2].trim();
    if (!value) continue;

    if (section === "local") {
      if (key === "local") data.localFormat = value;
      else if (key === "e164") data.e164 = value;
      else if (key === "international") data.internationalFormat = value;
      else if (key === "country") data.country = value;
    } else if (section === "numverify") {
      if (key === "valid") data.valid = value.toLowerCase() === "true";
      else if (key === "number") data.number = value;
      else if (key === "local format") data.localFormat = value;
      else if (key === "international format") data.internationalFormat = value;
      else if (key === "country prefix") data.countryPrefix = value;
      else if (key === "country code") data.countryCode = value;
      else if (key === "country name") data.countryName = value;
      else if (key === "carrier") data.carrier = value;
      else if (key === "line type") data.lineType = value;
    }
  }

  if (!data.e164 && target.startsWith("+")) data.e164 = target;
  if (!data.country && data.countryCode) data.country = data.countryCode;
  if (!data.valid && (data.e164 || data.localFormat || data.country)) data.valid = true;

  return data;
}

function parseSherlockLike(data, target) {
  const found = Array.isArray(data.found)
    ? data.found.filter((row) => row && typeof row === "object").slice(0, 500)
    : [];

  return {
    username: typeof data.username === "string" ? data.username : target,
    checked: typeof data.checked === "number" ? data.checked : undefined,
    found,
    notFound: typeof data.notFound === "number" ? data.notFound : undefined,
    errors: typeof data.errors === "number" ? data.errors : undefined,
  };
}

function parseTheHarvester(raw, target) {
  let parsed = {};
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    const match = String(raw).match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        parsed = {};
      }
    }
  }

  const strings = (value) => Array.isArray(value)
    ? value.filter((entry) => typeof entry === "string")
    : [];

  return {
    domain: target,
    emails: strings(parsed.emails),
    hosts: strings(parsed.hosts),
    ips: strings(parsed.ips),
    subdomains: strings(parsed.subdomains ?? parsed.asns),
    urls: strings(parsed.urls ?? parsed.interesting_urls),
  };
}

function parseNdjson(raw, kind) {
  const rows = [];
  for (const line of String(raw).split(/\r?\n/).filter(Boolean)) {
    try {
      const value = JSON.parse(line);
      if (value && typeof value === "object") rows.push(value);
    } catch {
      if ((kind === "subfinder" || kind === "amass") && line.includes(".")) {
        const trimmed = line.trim();
        rows.push({ host: trimmed, name: trimmed, source: kind });
      }
    }
  }
  return rows.slice(0, 1000);
}

function parseSpiderFootJson(raw) {
  const text = String(raw).trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.filter((row) => row && typeof row === "object").slice(0, 1000) : [];
  } catch {
    const rows = [];
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      const clean = line.replace(/^\s*[,\[]?/, "").replace(/[,\]]\s*$/, "").trim();
      if (!clean) continue;
      try {
        const row = JSON.parse(clean);
        if (row && typeof row === "object" && !Array.isArray(row)) rows.push(row);
      } catch {
        // Ignore non-JSON log lines from upstream.
      }
    }
    return rows.slice(0, 1000);
  }
}

function parsePhotonJson(raw) {
  let parsed = {};
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    parsed = {};
  }
  const records = [];
  for (const kind of ["internal", "external", "files", "scripts"]) {
    const values = Array.isArray(parsed[kind]) ? parsed[kind] : [];
    for (const value of values.slice(0, 500)) {
      if (typeof value === "string" && /^https?:\/\//i.test(value)) records.push({ kind, url: value });
    }
  }
  return { records: records.slice(0, 1000) };
}

function buildToolCommand(toolId, target) {
  switch (toolId) {
    case "phoneinfoga":
      return { binary: "phoneinfoga", args: ["scan", "-n", target] };
    case "sherlock":
      return { binary: "/opt/venvs/sherlock/bin/python", args: ["/opt/disha-worker/scripts/identity-osint-adapter.py", "sherlock", target] };
    case "maigret":
      return { binary: "/opt/venvs/maigret/bin/python", args: ["/opt/disha-worker/scripts/identity-osint-adapter.py", "maigret", target] };
    case "holehe":
      return { binary: "/opt/venvs/holehe/bin/python", args: ["/opt/disha-worker/scripts/identity-osint-adapter.py", "holehe", target] };
    case "instaloader":
      return { binary: "/opt/venvs/instaloader/bin/python", args: ["/opt/disha-worker/scripts/identity-osint-adapter.py", "instagram", target] };
    case "telegram-public":
      return { binary: "/opt/venvs/telethon/bin/python", args: ["/opt/disha-worker/scripts/identity-osint-adapter.py", "telegram", target] };
    case "theharvester": {
      const outputBase = `/tmp/disha-theharvester-${createHash("sha256").update(target).digest("hex").slice(0, 16)}`;
      return {
        binary: "theHarvester",
        args: ["-d", target, "-b", "anubis,crtsh,dnsdumpster,duckduckgo,hackertarget,otx,rapiddns,urlscan", "-l", "100", "-f", outputBase],
        outputFile: `${outputBase}.json`,
      };
    }
    case "owasp-amass":
      return { binary: "amass", args: ["enum", "-passive", "-d", target] };
    case "subfinder":
      return { binary: "subfinder", args: ["-d", target, "-silent", "-json"] };
    case "spiderfoot":
      return {
        binary: "/opt/venvs/spiderfoot/bin/python",
        args: [
          "/opt/osint/spiderfoot/sf.py",
          "-s",
          target,
          "-m",
          "sfp_archiveorg,sfp_bgpview,sfp_certspotter,sfp_crt,sfp_grep_app,sfp_hackertarget,sfp_ipinfo,sfp_opnicwhois,sfp_ripe,sfp_robtex,sfp_threatminer,sfp_urlscan,sfp_viewdns",
          "-o",
          "json",
          "-q",
          "-max-threads",
          "2",
        ],
      };
    case "recon-ng":
      return {
        binary: "/opt/venvs/recon/bin/python",
        args: ["/opt/disha-worker/scripts/recon-ng-adapter.py", target],
      };
    case "photon": {
      const outputDir = `/tmp/disha-photon-${process.pid}-${createHash("sha256").update(target).digest("hex").slice(0, 16)}`;
      return {
        binary: "/opt/venvs/photon/bin/python",
        args: [
          "/opt/osint/photon/photon.py",
          "-u",
          `https://${target}`,
          "-e",
          "json",
          "-o",
          outputDir,
          "-l",
          "1",
          "-t",
          "2",
          "--timeout",
          "5",
          "--only-urls",
        ],
        outputFile: `${outputDir}/exported.json`,
        cleanupPath: outputDir,
      };
    }
    default:
      throw new Error(`unsupported_tool:${toolId}`);
  }
}

function parseToolResult(toolId, raw, target) {
  switch (toolId) {
    case "phoneinfoga": {
      const data = parsePhoneInfoga(raw, target);
      return {
        data,
        evidence: [
          buildEvidence(
            "phoneinfoga",
            "PhoneInfoga",
            `PhoneInfoga parsed ${target}: country=${data.country ?? "unknown"}, carrier=${data.carrier ?? "unknown"}.`,
            "https://github.com/sundowndev/phoneinfoga",
          ),
        ],
      };
    }
    case "sherlock": {
      const data = parseSherlockLike(lastJsonObject(raw, toolId), target);
      return {
        data,
        evidence: [
          buildEvidence(
            "sherlock",
            "Sherlock",
            `Sherlock checked ${data.checked ?? "configured"} public services and found ${data.found.length} candidate profile(s) for '${target}'.`,
            "https://github.com/sherlock-project/sherlock",
          ),
        ],
      };
    }
    case "maigret": {
      const data = parseSherlockLike(lastJsonObject(raw, toolId), target);
      return {
        data,
        evidence: [
          buildEvidence(
            "maigret",
            "Maigret",
            `Maigret checked ${data.checked ?? "configured"} public services and found ${data.found.length} candidate profile(s) for '${target}'.`,
            "https://github.com/soxoj/maigret",
          ),
        ],
      };
    }
    case "holehe": {
      const data = lastJsonObject(raw, toolId);
      const found = Array.isArray(data.found) ? data.found.length : 0;
      return {
        data,
        evidence: [
          buildEvidence(
            "holehe",
            "Holehe",
            `Holehe completed bounded account-presence checks for the authorized email target: ${found} positive service signal(s).`,
            "https://github.com/megadose/holehe",
          ),
        ],
      };
    }
    case "instaloader": {
      const data = lastJsonObject(raw, toolId);
      return {
        data,
        evidence: [
          buildEvidence(
            "instaloader",
            "Instaloader",
            "Instaloader resolved the supplied public Instagram profile target.",
            "https://github.com/instaloader/instaloader",
          ),
        ],
      };
    }
    case "telegram-public": {
      const data = lastJsonObject(raw, toolId);
      return {
        data,
        evidence: [
          buildEvidence(
            "telegram-public",
            "Telegram Public Metadata",
            "Telegram API resolved the supplied public username/channel using the configured authorized operator session.",
            "https://core.telegram.org/api",
          ),
        ],
      };
    }
    case "theharvester": {
      const data = parseTheHarvester(raw, target);
      return {
        data,
        evidence: [
          buildEvidence(
            "theharvester",
            "theHarvester",
            `Passive domain collection returned ${data.emails.length} email(s), ${data.hosts.length} host(s), and ${data.ips.length} IP(s).`,
            "https://github.com/laramies/theHarvester",
          ),
        ],
      };
    }
    case "owasp-amass": {
      const rows = parseNdjson(raw, "amass");
      const data = { domain: target, subdomains: rows };
      return {
        data,
        evidence: [
          buildEvidence(
            "owasp-amass",
            "OWASP Amass",
            `Passive Amass enumeration returned ${rows.length} record(s) for ${target}.`,
            "https://github.com/owasp-amass/amass",
          ),
        ],
      };
    }
    case "subfinder": {
      const rows = parseNdjson(raw, "subfinder")
        .map((row) => ({
          host: typeof row.host === "string" ? row.host : typeof row.subdomain === "string" ? row.subdomain : "",
          source: typeof row.source === "string" ? row.source : "subfinder",
          input: typeof row.input === "string" ? row.input : undefined,
        }))
        .filter((row) => row.host);
      const data = { domain: target, subdomains: rows };
      return {
        data,
        evidence: [
          buildEvidence(
            "subfinder",
            "ProjectDiscovery Subfinder",
            `Passive Subfinder enumeration returned ${rows.length} subdomain record(s) for ${target}.`,
            "https://github.com/projectdiscovery/subfinder",
          ),
        ],
      };
    }
    case "spiderfoot": {
      const events = parseSpiderFootJson(raw);
      const data = { target, events };
      return {
        data,
        evidence: [
          buildEvidence(
            "spiderfoot",
            "SpiderFoot",
            `Passive SpiderFoot profile returned ${events.length} event(s) for ${target}.`,
            "https://github.com/smicallef/spiderfoot",
          ),
        ],
      };
    }
    case "recon-ng": {
      const data = lastJsonObject(raw, toolId);
      const hosts = Array.isArray(data.hosts) ? data.hosts : [];
      return {
        data,
        evidence: [
          buildEvidence(
            "recon-ng",
            "Recon-ng",
            `Allowlisted Recon-ng modules returned ${hosts.length} host record(s) for ${target}.`,
            "https://github.com/lanmaster53/recon-ng",
          ),
        ],
      };
    }
    case "photon": {
      const data = parsePhotonJson(raw);
      return {
        data,
        evidence: [
          buildEvidence(
            "photon",
            "Photon",
            `Bounded authorized Photon crawl returned ${data.records.length} public URL record(s) for ${target}.`,
            "https://github.com/s0md3v/Photon",
          ),
        ],
      };
    }
    default:
      throw new Error(`unsupported_parser:${toolId}`);
  }
}

async function executeBinary(binary, args, timeoutMs, outputFile, cleanupPath) {
  try {
    const { stdout } = await execFileAsync(binary, args, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      env: process.env,
    });
    if (outputFile) {
      try {
        return await readFile(outputFile, "utf8");
      } catch {
        return stdout;
      }
    }
    return stdout;
  } catch (error) {
    if (outputFile) {
      try {
        return await readFile(outputFile, "utf8");
      } catch {
        // Fall back to captured stdout below.
      }
    }
    if (typeof error?.stdout === "string" && error.stdout.trim()) return error.stdout;
    if (error?.killed || error?.code === "ETIMEDOUT") throw new Error("tool_timeout");
    throw error;
  } finally {
    if (outputFile) {
      await Promise.all([
        rm(outputFile, { force: true }),
        rm(outputFile.replace(/\.json$/, ".xml"), { force: true }),
      ]);
    }
    if (cleanupPath) await rm(cleanupPath, { recursive: true, force: true });
  }
}

function objectInput(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function deploymentToolEnabled(toolId) {
  const envKey = `DISHA_ASTRA6_${String(toolId).toUpperCase().replace(/-/g, "_")}_ENABLED`;
  return process.env[envKey] === "true" || process.env.DISHA_ASTRA6_ALL_TOOLS_ENABLED === "true";
}

export function authorizeQueuedJob(job) {
  if (job.manifest_enabled !== true) {
    return { allowed: false, error: "policy_denied_tool_disabled" };
  }
  if (!deploymentToolEnabled(job.tool_id)) {
    return { allowed: false, error: "policy_denied_tool_disabled_live" };
  }

  const input = objectInput(job.dispatch_input);

  // Identity enumeration checks
  const identitySensitive = IDENTITY_TOOLS.has(job.tool_id) || IDENTITY_TARGET_TYPES.has(job.target_type);
  if (identitySensitive) {
    if (process.env.DISHA_IDENTITY_ENUMERATION_APPROVED !== "true") {
      return { allowed: false, error: "policy_denied_identity_deployment" };
    }
    const requestApproved = input.identityAuthorization === true
      || (input.authorization && typeof input.authorization === "object" && input.authorization.identityEnumeration === true);
    if (!requestApproved) {
      return { allowed: false, error: "policy_denied_identity_request" };
    }
  }

  // Active reconnaissance checks (Photon)
  const activeSensitive = job.tool_id === "photon";
  if (activeSensitive) {
    if (process.env.DISHA_ACTIVE_RECON_APPROVED !== "true") {
      return { allowed: false, error: "policy_denied_active_deployment" };
    }
    const requestApproved = input.activeAuthorization === true
      || (input.authorization && typeof input.authorization === "object" && input.authorization.activeRecon === true);
    if (!requestApproved) {
      return { allowed: false, error: "policy_denied_active_request" };
    }
  }

  return { allowed: true };
}

async function claimNextJob(client) {
  const allowed = Array.isArray(ALLOWED_TOOLS) ? ALLOWED_TOOLS : Object.values(WORKER_CLASS_TOOLS).flat();
  if (!allowed.length) return null;

  const result = await client.query(
    `SELECT r.run_id, r.tool_id, r.mission_id, r.user_id, r.target, r.target_type, r.dispatch_input,
            COALESCE(m.timeout_ms, 60000) AS timeout_ms,
            COALESCE(m.enabled, false) AS manifest_enabled
     FROM astra6_connector_runs r
     LEFT JOIN astra6_tool_manifests m ON m.tool_id = r.tool_id
     WHERE r.status = 'queued' AND r.tool_id = ANY($1::text[])
     ORDER BY r.queued_at ASC
     LIMIT 1
     FOR UPDATE OF r SKIP LOCKED`,
    [allowed],
  );

  if (!result.rows.length) return null;

  const job = result.rows[0];
  const authorization = authorizeQueuedJob(job);
  if (!authorization.allowed) {
    await client.query(
      `UPDATE astra6_connector_runs
       SET status = 'blocked_by_policy', error = $1, completed_at = NOW(),
           worker_id = $2, attempts = attempts + 1
       WHERE run_id = $3 AND status = 'queued'`,
      [authorization.error, WORKER_ID, job.run_id],
    );
    console.info(`[ASTRA 6 Worker] blocked run=${job.run_id} tool=${job.tool_id}: ${authorization.error}`);
    return null;
  }

  await client.query(
    `UPDATE astra6_connector_runs
     SET status = 'running', started_at = NOW(), worker_id = $1, attempts = attempts + 1
     WHERE run_id = $2`,
    [WORKER_ID, job.run_id],
  );

  return job;
}

async function publishWorkerHeartbeat(force = false) {
  if (!pool) return;
  const now = Date.now();
  if (!force && now - lastHeartbeatAt < HEARTBEAT_INTERVAL_MS) return;
  await pool.query(
    `insert into disha_worker_heartbeats (
       worker_id, worker_class, hostname, active_jobs, cpu_percent, memory_mb, last_heartbeat, status
     ) values ($1,$2,$3,0,0,0,now(),'HEALTHY')
     on conflict (worker_id) do update set
       worker_class=excluded.worker_class,
       hostname=excluded.hostname,
       last_heartbeat=now(),
       status='HEALTHY'`,
    [WORKER_ID, WORKER_CLASS, process.env.HOSTNAME || WORKER_ID],
  );
  lastHeartbeatAt = now;
}

async function processNextJob() {
  if (!pool) return;

  const client = await pool.connect();
  let job = null;

  try {
    await client.query("BEGIN");
    job = await claimNextJob(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (!job) return;

  const started = Date.now();

  try {
    const target = validateTarget(job.tool_id, job.target);
    const authCheck = authorizeQueuedJob(job);
    if (!authCheck.allowed) {
      throw new Error(authCheck.error);
    }
    const { binary, args, outputFile, cleanupPath } = buildToolCommand(job.tool_id, target);
    const timeoutMs = Math.max(1_000, Math.min(Number(job.timeout_ms) || TOOL_DEFAULT_TIMEOUT_MS[job.tool_id] || 60_000, 240_000));
    const raw = await executeBinary(binary, args, timeoutMs, outputFile, cleanupPath);
    const parsed = parseToolResult(job.tool_id, raw, target);
    const durationMs = Date.now() - started;
    const provenanceHash = hashValue({ runId: job.run_id, toolId: job.tool_id, data: parsed.data, raw });

    const completion = await pool.query(
      `UPDATE astra6_connector_runs
       SET status='completed', raw_output=$1, parsed_output=$2::jsonb, evidence=$3::jsonb,
           warnings='[]'::jsonb, duration_ms=$4, provenance_hash=$5, completed_at=NOW()
       WHERE run_id=$6 AND status='running'`,
      [raw, JSON.stringify(parsed.data), JSON.stringify(parsed.evidence), durationMs, provenanceHash, job.run_id],
    );

    if (completion.rowCount === 0) {
      console.info(`[ASTRA 6 Worker] discarded late result run=${job.run_id} tool=${job.tool_id}`);
      return;
    }
    console.info(`[ASTRA 6 Worker] completed run=${job.run_id} tool=${job.tool_id} durationMs=${durationMs}`);
  } catch (error) {
    const durationMs = Date.now() - started;
    const message = error instanceof Error ? error.message : String(error);
    const status = message.startsWith("policy_denied")
      ? "blocked_by_policy"
      : /timeout/i.test(message) ? "timed_out" : "failed";

    await pool.query(
      `UPDATE astra6_connector_runs
       SET status=$1, error=$2, duration_ms=$3, completed_at=NOW()
       WHERE run_id=$4 AND status='running'`,
      [status, message.slice(0, 1000), durationMs, job.run_id],
    );

    console.info(`[ASTRA 6 Worker] ${status} run=${job.run_id} tool=${job.tool_id}: ${message}`);
  }
}

async function main() {
  if (!pool) throw new Error("DATABASE_URL is required");
  console.info(`[ASTRA 6 Worker] start id=${WORKER_ID} class=${WORKER_CLASS} tools=${Array.isArray(ALLOWED_TOOLS) ? ALLOWED_TOOLS.join(",") : "all"}`);
  await publishWorkerHeartbeat(true);

  try {
    await redis.connect();
    console.info("[ASTRA 6 Worker] Redis connected");
  } catch (error) {
    console.info(`[ASTRA 6 Worker] Redis unavailable; PostgreSQL polling continues: ${error.message}`);
  }

  for (;;) {
    try {
      await processNextJob();
    } catch (error) {
      console.info(`[ASTRA 6 Worker] loop error: ${error instanceof Error ? error.message : String(error)}`);
    }
    try {
      await publishWorkerHeartbeat();
    } catch (error) {
      console.info(`[ASTRA 6 Worker] heartbeat error: ${error instanceof Error ? error.message : String(error)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(`[ASTRA 6 Worker] fatal: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
