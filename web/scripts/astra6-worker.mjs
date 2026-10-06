import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { Pool } from "pg";
import { createClient } from "redis";

const execFileAsync = promisify(execFile);

const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
const WORKER_ID = process.env.DISHA_WORKER_ID || `astra6-worker-${process.pid}`;
const WORKER_CLASS = process.env.WORKER_CLASS || "generic";
const POLL_INTERVAL_MS = Math.max(250, Number.parseInt(process.env.DISHA_OSINT_POLL_MS || "3000", 10));

const WORKER_CLASS_TOOLS = {
  identity: ["phoneinfoga", "sherlock", "maigret", "holehe", "instaloader", "telegram-public"],
  infrastructure: ["theharvester", "owasp-amass", "subfinder"],
  document: [],
  cti: [],
};
const ALLOWED_TOOLS = Object.prototype.hasOwnProperty.call(WORKER_CLASS_TOOLS, WORKER_CLASS)
  ? WORKER_CLASS_TOOLS[WORKER_CLASS]
  : null;

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
  if (!value || value.length > 512 || /[\u0000\r\n]/.test(value)) throw new Error("target_invalid");

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
  if (["theharvester", "owasp-amass", "subfinder"].includes(toolId) && !/^(?=.{1,253}$)(?!-)(?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,63}$/.test(value)) {
    throw new Error("invalid_domain");
  }
  return value;
}

function lastJsonObject(raw, toolId) {
  const lines = String(raw).trim().split(/\r?\n/).filter(Boolean).reverse();
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        if (typeof parsed.error === "string" && parsed.error) throw new Error(`${toolId}_worker_error:${parsed.error}`);
        return parsed;
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith(`${toolId}_worker_error:`)) throw error;
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
  // The local scanner has no validity boolean. Reaching a normalized E.164/local result
  // is evidence that PhoneInfoga parsed the number; Numverify can additionally set valid.
  if (!data.valid && (data.e164 || data.localFormat || data.country)) data.valid = true;
  return data;
}

function parseSherlockLike(data, target) {
  const found = Array.isArray(data.found) ? data.found.filter((row) => row && typeof row === "object").slice(0, 500) : [];
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
      try { parsed = JSON.parse(match[0]); } catch { parsed = {}; }
    }
  }
  const strings = (value) => Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
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
      if (kind === "subfinder" && line.includes(".")) rows.push({ host: line.trim(), source: "subfinder" });
    }
  }
  return rows.slice(0, 1000);
}

function buildToolCommand(toolId, target) {
  switch (toolId) {
    case "phoneinfoga":
      return { binary: "phoneinfoga", args: ["scan", "-n", target] };
    case "sherlock":
      return { binary: "python3", args: ["/opt/disha-worker/scripts/identity-osint-adapter.py", "sherlock", target] };
    case "maigret":
      return { binary: "python3", args: ["/opt/disha-worker/scripts/identity-osint-adapter.py", "maigret", target] };
    case "holehe":
      return { binary: "python3", args: ["/opt/disha-worker/scripts/identity-osint-adapter.py", "holehe", target] };
    case "instaloader":
      return { binary: "python3", args: ["/opt/disha-worker/scripts/identity-osint-adapter.py", "instagram", target] };
    case "telegram-public":
      return { binary: "python3", args: ["/opt/disha-worker/scripts/identity-osint-adapter.py", "telegram", target] };
    case "theharvester":
      return { binary: "theHarvester", args: ["-d", target, "-b", "anubis,crtsh,dnsdumpster,duckduckgo,hackertarget,otx,rapiddns,urlscan", "-l", "100"] };
    case "owasp-amass":
      return { binary: "amass", args: ["enum", "-passive", "-d", target, "-json", "/dev/stdout"] };
    case "subfinder":
      return { binary: "subfinder", args: ["-d", target, "-silent", "-json"] };
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
        evidence: [buildEvidence("phoneinfoga", "PhoneInfoga", `PhoneInfoga parsed ${target}: country=${data.country ?? "unknown"}, carrier=${data.carrier ?? "unknown"}.`, "https://github.com/sundowndev/phoneinfoga")],
      };
    }
    case "sherlock": {
      const data = parseSherlockLike(lastJsonObject(raw, toolId), target);
      return {
        data,
        evidence: [buildEvidence("sherlock", "Sherlock", `Sherlock checked ${data.checked ?? "configured"} public services and found ${data.found.length} candidate profile(s) for '${target}'.`, "https://github.com/sherlock-project/sherlock")],
      };
    }
    case "maigret": {
      const data = parseSherlockLike(lastJsonObject(raw, toolId), target);
      return {
        data,
        evidence: [buildEvidence("maigret", "Maigret", `Maigret checked ${data.checked ?? "configured"} public services and found ${data.found.length} candidate profile(s) for '${target}'.`, "https://github.com/soxoj/maigret")],
      };
    }
    case "holehe": {
      const data = lastJsonObject(raw, toolId);
      const found = Array.isArray(data.found) ? data.found.length : 0;
      return {
        data,
        evidence: [buildEvidence("holehe", "Holehe", `Holehe completed bounded account-presence checks for the authorized email target: ${found} positive service signal(s).`, "https://github.com/megadose/holehe")],
      };
    }
    case "instaloader": {
      const data = lastJsonObject(raw, toolId);
      return {
        data,
        evidence: [buildEvidence("instaloader", "Instaloader", `Instaloader resolved the supplied public Instagram profile target.`, "https://github.com/instaloader/instaloader")],
      };
    }
    case "telegram-public": {
      const data = lastJsonObject(raw, toolId);
      return {
        data,
        evidence: [buildEvidence("telegram-public", "Telegram Public Metadata", `Telegram API resolved the supplied public username/channel using the configured authorized operator session.`, "https://github.com/LonamiWebs/Telethon")],
      };
    }
    case "theharvester": {
      const data = parseTheHarvester(raw, target);
      return {
        data,
        evidence: [buildEvidence("theharvester", "theHarvester", `Passive domain collection returned ${data.emails.length} email(s), ${data.hosts.length} host(s), and ${data.ips.length} IP(s).`, "https://github.com/laramies/theHarvester")],
      };
    }
    case "owasp-amass": {
      const rows = parseNdjson(raw, "amass");
      const data = { domain: target, subdomains: rows };
      return {
        data,
        evidence: [buildEvidence("owasp-amass", "OWASP Amass", `Passive Amass enumeration returned ${rows.length} record(s) for ${target}.`, "https://github.com/owasp-amass/amass")],
      };
    }
    case "subfinder": {
      const rows = parseNdjson(raw, "subfinder").map((row) => ({
        host: typeof row.host === "string" ? row.host : typeof row.subdomain === "string" ? row.subdomain : "",
        source: typeof row.source === "string" ? row.source : "subfinder",
        input: typeof row.input === "string" ? row.input : undefined,
      })).filter((row) => row.host);
      const data = { domain: target, subdomains: rows };
      return {
        data,
        evidence: [buildEvidence("subfinder", "ProjectDiscovery Subfinder", `Passive Subfinder enumeration returned ${rows.length} subdomain record(s) for ${target}.`, "https://github.com/projectdiscovery/subfinder")],
      };
    }
    default:
      throw new Error(`unsupported_parser:${toolId}`);
  }
}

async function executeBinary(binary, args, timeoutMs) {
  try {
    const { stdout } = await execFileAsync(binary, args, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      env: process.env,
    });
    return stdout;
  } catch (error) {
    // Some helpers deliberately return non-zero together with a structured JSON error.
    if (typeof error?.stdout === "string" && error.stdout.trim()) return error.stdout;
    if (error?.killed || error?.code === "ETIMEDOUT") throw new Error("tool_timeout");
    throw error;
  }
}

async function claimNextJob(client) {
  const allowed = Array.isArray(ALLOWED_TOOLS) ? ALLOWED_TOOLS : Object.values(WORKER_CLASS_TOOLS).flat();
  if (!allowed.length) return null;

  const result = await client.query(
    `SELECT r.run_id, r.tool_id, r.mission_id, r.user_id, r.target, r.target_type, r.dispatch_input,
            COALESCE(m.timeout_ms, 60000) AS timeout_ms
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
  await client.query(
    `UPDATE astra6_connector_runs
     SET status='running', started_at=NOW(), worker_id=$1, attempts=attempts+1
     WHERE run_id=$2`,
    [WORKER_ID, job.run_id],
  );
  return job;
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
    const { binary, args } = buildToolCommand(job.tool_id, target);
    const timeoutMs = Math.max(1_000, Math.min(Number(job.timeout_ms) || TOOL_DEFAULT_TIMEOUT_MS[job.tool_id] || 60_000, 240_000));
    const raw = await executeBinary(binary, args, timeoutMs);
    const parsed = parseToolResult(job.tool_id, raw, target);
    const durationMs = Date.now() - started;
    const provenanceHash = hashValue({ runId: job.run_id, toolId: job.tool_id, data: parsed.data, raw });

    await pool.query(
      `UPDATE astra6_connector_runs
       SET status='completed', raw_output=$1, parsed_output=$2::jsonb, evidence=$3::jsonb,
           warnings='[]'::jsonb, duration_ms=$4, provenance_hash=$5, completed_at=NOW()
       WHERE run_id=$6`,
      [raw, JSON.stringify(parsed.data), JSON.stringify(parsed.evidence), durationMs, provenanceHash, job.run_id],
    );
    console.info(`[ASTRA 6 Worker] completed run=${job.run_id} tool=${job.tool_id} durationMs=${durationMs}`);
  } catch (error) {
    const durationMs = Date.now() - started;
    const message = error instanceof Error ? error.message : String(error);
    const status = /timeout/i.test(message) ? "timed_out" : "failed";
    await pool.query(
      `UPDATE astra6_connector_runs
       SET status=$1, error=$2, duration_ms=$3, completed_at=NOW()
       WHERE run_id=$4`,
      [status, message.slice(0, 1000), durationMs, job.run_id],
    );
    console.info(`[ASTRA 6 Worker] failed run=${job.run_id} tool=${job.tool_id}: ${message}`);
  }
}

async function main() {
  if (!pool) throw new Error("DATABASE_URL is required");
  console.info(`[ASTRA 6 Worker] start id=${WORKER_ID} class=${WORKER_CLASS} tools=${Array.isArray(ALLOWED_TOOLS) ? ALLOWED_TOOLS.join(",") : "all"}`);

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
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main().catch((error) => {
  console.error(`[ASTRA 6 Worker] fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
