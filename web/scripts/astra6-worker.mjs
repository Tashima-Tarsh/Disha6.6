import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Pool } from "pg";
import { createClient } from "redis";
import { hashValue } from "../lib/unified/hash.js";
import {
  getAstra6ToolManifest,
  validateCommandTarget,
} from "../lib/unified/astra6-tool-manifest.js";
import {
  parsePhoneInfogaOutput,
  parseSherlockOutput,
  parseTheHarvesterOutput,
  parseSpiderfootOutput,
  parseAmassOutput,
  parseSubfinderOutput,
  parseStructuredIdentityWorkerOutput,
} from "../lib/unified/astra6-output-parsers.js";

const execFileAsync = promisify(execFile);

const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
const WORKER_ID = process.env.DISHA_WORKER_ID || `astra6-worker-${process.pid}`;
const POLL_INTERVAL_MS = parseInt(process.env.DISHA_OSINT_POLL_MS || "3000", 10);

const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;
const redis = createClient({ url: REDIS_URL });

redis.on("error", (err) => {
  console.info(`[ASTRA 6 Worker] Redis connection notice: ${err.message}`);
});

async function main() {
  console.info(`[ASTRA 6 Worker] Initializing autonomous OSINT engine (ID: ${WORKER_ID})...`);

  try {
    await redis.connect();
    console.info("[ASTRA 6 Worker] Connected to Redis job broker.");
  } catch (err) {
    console.info(`[ASTRA 6 Worker] Redis unavailable (${err.message}), falling back to PostgreSQL polling mode.`);
  }

  if (pool) {
    console.info("[ASTRA 6 Worker] Connected to PostgreSQL sovereign ledger.");
  }

  console.info("[ASTRA 6 Worker] Engine ready. Waiting for OSINT dispatch jobs...");

  while (true) {
    try {
      await processNextJob();
    } catch (error) {
      console.info(`[ASTRA 6 Worker] Job execution loop notice: ${error instanceof Error ? error.message : String(error)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

async function processNextJob() {
  if (!pool) return;

  // Poll for queued jobs with row-level lock
  const client = await pool.connect();
  let job = null;
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT run_id, tool_id, mission_id, user_id, target, target_type, dispatch_input
       FROM astra6_connector_runs
       WHERE status = 'queued'
       ORDER BY queued_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`
    );

    if (result.rows.length > 0) {
      job = result.rows[0];
      await client.query(
        `UPDATE astra6_connector_runs
         SET status = 'running', started_at = NOW(), worker_id = $1
         WHERE run_id = $2`,
        [WORKER_ID, job.run_id]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  if (!job) return;

  console.info(`[ASTRA 6 Worker] Processing job ${job.run_id}: Tool=${job.tool_id}, Target=${job.target} (${job.target_type})`);
  const started = Date.now();

  try {
    const manifest = getAstra6ToolManifest(job.tool_id);
    if (!manifest) throw new Error(`Unknown tool manifest: ${job.tool_id}`);

    // Command injection guard validation
    const safeTarget = validateCommandTarget(job.target, manifest.commandInjectionGuard);

    // Build tool arguments according to manifest
    const { binary, args } = buildToolArgs(manifest, safeTarget, job.dispatch_input);

    // Execute tool binary with strict process bounds
    const rawOutput = await executeBinaryWithTimeout(binary, args, manifest.timeoutMs);

    // Parse and normalize output using zero-mock parsers
    const { parsedData, evidence } = parseToolResult(job.tool_id, rawOutput, safeTarget, job.target_type);

    const durationMs = Date.now() - started;
    const provenanceHash = hashValue({ runId: job.run_id, toolId: job.tool_id, data: parsedData, raw: rawOutput });

    // Store completed run and observations
    await recordJobSuccess(job.run_id, job.tool_id, rawOutput, parsedData, evidence, durationMs, provenanceHash);
    console.info(`[ASTRA 6 Worker] Job ${job.run_id} completed successfully in ${durationMs}ms.`);
  } catch (err) {
    const durationMs = Date.now() - started;
    const errorMsg = err instanceof Error ? err.message : String(err);
    await recordJobFailure(job.run_id, errorMsg, durationMs);
    console.info(`[ASTRA 6 Worker] Job ${job.run_id} failed: ${errorMsg}`);
  }
}

function buildToolArgs(manifest, target, inputOptions) {
  switch (manifest.toolId) {
    case "phoneinfoga":
      return { binary: "phoneinfoga", args: ["scan", "-n", target, "-o", "json"] };
    case "sherlock":
      return { binary: "sherlock", args: ["--timeout", "15", "--print-found", "--json", target] };
    case "maigret":
      return { binary: "python3", args: ["/opt/disha-worker/scripts/identity-osint-adapter.py", "maigret", target] };
    case "holehe":
      return { binary: "python3", args: ["/opt/disha-worker/scripts/identity-osint-adapter.py", "holehe", target] };
    case "instaloader":
      return { binary: "python3", args: ["/opt/disha-worker/scripts/identity-osint-adapter.py", "instagram", target] };
    case "telegram-public":
      return { binary: "python3", args: ["/opt/disha-worker/scripts/identity-osint-adapter.py", "telegram", target] };
    case "theharvester": {
      const sources = manifest.passiveModuleAllowlist ? manifest.passiveModuleAllowlist.slice(0, 8).join(",") : "crtsh,dnsdumpster";
      return { binary: "theHarvester", args: ["-d", target, "-b", sources, "-l", "100"] };
    }
    case "spiderfoot":
      return { binary: "python3", args: ["/opt/spiderfoot/sfcli.py", "-s", target, "-u", "passive"] };
    case "owasp-amass":
      return { binary: "amass", args: ["enum", "-passive", "-d", target, "-json", "/dev/stdout"] };
    case "subfinder":
      return { binary: "subfinder", args: ["-d", target, "-silent", "-json"] };
    default:
      throw new Error(`Unsupported tool: ${manifest.toolId}`);
  }
}

async function executeBinaryWithTimeout(binary, args, timeoutMs) {
  try {
    const { stdout } = await execFileAsync(binary, args, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024, // 10MB max buffer
    });
    return stdout;
  } catch (err) {
    if (err.stdout) return err.stdout; // Some tools return partial results on nonzero exit
    throw err;
  }
}

function parseToolResult(toolId, raw, target, targetType) {
  switch (toolId) {
    case "phoneinfoga": {
      const res = parsePhoneInfogaOutput(raw, target);
      return { parsedData: res.data, evidence: res.evidence };
    }
    case "sherlock": {
      const res = parseSherlockOutput(raw, target);
      return { parsedData: res.data, evidence: res.evidence };
    }
    case "maigret": {
      const res = parseStructuredIdentityWorkerOutput(raw, toolId, "Maigret", target);
      return { parsedData: res.data, evidence: res.evidence };
    }
    case "holehe": {
      const res = parseStructuredIdentityWorkerOutput(raw, toolId, "Holehe", target);
      return { parsedData: res.data, evidence: res.evidence };
    }
    case "instaloader": {
      const res = parseStructuredIdentityWorkerOutput(raw, toolId, "Instaloader", target);
      return { parsedData: res.data, evidence: res.evidence };
    }
    case "telegram-public": {
      const res = parseStructuredIdentityWorkerOutput(raw, toolId, "Telegram Public Metadata", target);
      return { parsedData: res.data, evidence: res.evidence };
    }
    case "theharvester": {
      const res = parseTheHarvesterOutput(raw, target);
      return { parsedData: res.data, evidence: res.evidence };
    }
    case "spiderfoot": {
      const res = parseSpiderfootOutput(raw, target, targetType);
      return { parsedData: res.data, evidence: res.evidence };
    }
    case "owasp-amass": {
      const res = parseAmassOutput(raw, target);
      return { parsedData: res.data, evidence: res.evidence };
    }
    case "subfinder": {
      const res = parseSubfinderOutput(raw, target);
      return { parsedData: res.data, evidence: res.evidence };
    }
    default:
      throw new Error(`Unknown parser for tool: ${toolId}`);
  }
}

async function recordJobSuccess(runId, toolId, rawOutput, parsedData, evidence, durationMs, provenanceHash) {
  if (!pool) return;
  await pool.query(
    `UPDATE astra6_connector_runs
     SET status = 'completed', raw_output = $1, parsed_output = $2, evidence = $3,
         duration_ms = $4, provenance_hash = $5, completed_at = NOW()
     WHERE run_id = $6`,
    [rawOutput, JSON.stringify(parsedData), JSON.stringify(evidence), durationMs, provenanceHash, runId]
  );
}

async function recordJobFailure(runId, errorMessage, durationMs) {
  if (!pool) return;
  await pool.query(
    `UPDATE astra6_connector_runs
     SET status = 'failed', error = $1, duration_ms = $2, completed_at = NOW()
     WHERE run_id = $3`,
    [errorMessage, durationMs, runId]
  );
}

main().catch((err) => {
  console.info(`[ASTRA 6 Worker] Fatal engine error: ${err.message}`);
  process.exit(1);
});
