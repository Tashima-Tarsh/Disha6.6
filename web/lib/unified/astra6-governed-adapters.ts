import { randomUUID } from "node:crypto";

import { getDbPool } from "../server/db";
import { hashValue } from "./hash";
import { buildAdapterEvidence, type AdapterContext, type GovernedOsintAdapter, type AdapterEvidence } from "./osint-adapter-bus";
import {
  phoneInfogaManifest,
  sherlockManifest,
  maigretManifest,
  holeheManifest,
  instaloaderManifest,
  telegramPublicManifest,
  theHarvesterManifest,
  spiderfootManifest,
  amassManifest,
  subfinderManifest,
  reconNgManifest,
  photonManifest,
  userScannerManifest,
  toutatisManifest,
  mrHolmesManifest,
  onionSearchManifest,
  xurlfind3rManifest,
  validateCommandTarget,
  type DishaToolManifest,
} from "./astra6-tool-manifest";

export type Astra6DispatchInput = {
  target: string;
  targetType: string;
  options?: Record<string, string>;
};

export type Astra6DispatchOutput = {
  runId?: string;
  toolId: string;
  target: string;
  targetType: string;
  dispatchStatus: "completed" | "blocked_by_policy" | "tool_not_available";
  workerRuntime: string;
  cliCommand: string;
  estimatedTimeoutMs: number;
  policyApprovalRequired: boolean;
  workerId?: string;
  durationMs?: number;
  result?: unknown;
  options?: Record<string, string>;
};

type Astra6RunRow = {
  run_id: string;
  status: "queued" | "running" | "completed" | "partial" | "failed" | "cancelled" | "timed_out" | "blocked_by_policy";
  parsed_output: unknown;
  evidence: unknown;
  warnings: unknown;
  error: string | null;
  worker_id: string | null;
  duration_ms: number;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isToolAvailable(manifest: DishaToolManifest): boolean {
  const envKey = `DISHA_ASTRA6_${manifest.toolId.toUpperCase().replace(/-/g, "_")}_ENABLED`;
  return process.env[envKey] === "true" || process.env.DISHA_ASTRA6_ALL_TOOLS_ENABLED === "true";
}

function identityDeploymentApproved(): boolean {
  return process.env.DISHA_IDENTITY_ENUMERATION_APPROVED === "true";
}

function activeReconDeploymentApproved(): boolean {
  return process.env.DISHA_ACTIVE_RECON_APPROVED === "true";
}

function isIdentityManifest(manifest: DishaToolManifest): boolean {
  return manifest.targetTypes.some((type) => ["username", "phone_number", "email", "instagram_username", "telegram_username"].includes(type));
}

function configurationIssue(manifest: DishaToolManifest): string | undefined {
  if (manifest.toolId === "telegram-public") {
    if (!process.env.TELEGRAM_API_ID || !process.env.TELEGRAM_API_HASH || !process.env.TELEGRAM_SESSION) {
      return "Telegram public metadata requires TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_SESSION from an authorized operator session.";
    }
  }
  return undefined;
}

async function ensureManifestRegistered(manifest: DishaToolManifest): Promise<void> {
  const pool = getDbPool();
  if (!pool) throw new Error("not_configured: DATABASE_URL is required for ASTRA 6 workers");

  await pool.query(
    `insert into astra6_tool_manifests (
       tool_id, name, version, repository, license, execution_class, target_types, capabilities,
       passive_module_allowlist, blocked_modules, worker_runtime, cli_command, output_format,
       timeout_ms, max_retries, rate_limit_per_minute, manifest_hash, enabled, registered_at, updated_at
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,true,now(),now()
     )
     on conflict (tool_id) do update set
       name = excluded.name,
       version = excluded.version,
       repository = excluded.repository,
       license = excluded.license,
       execution_class = excluded.execution_class,
       target_types = excluded.target_types,
       capabilities = excluded.capabilities,
       passive_module_allowlist = excluded.passive_module_allowlist,
       blocked_modules = excluded.blocked_modules,
       worker_runtime = excluded.worker_runtime,
       cli_command = excluded.cli_command,
       output_format = excluded.output_format,
       timeout_ms = excluded.timeout_ms,
       max_retries = excluded.max_retries,
       rate_limit_per_minute = excluded.rate_limit_per_minute,
       manifest_hash = excluded.manifest_hash,
       enabled = true,
       updated_at = now()`,
    [
      manifest.toolId,
      manifest.name,
      manifest.version,
      manifest.repository,
      manifest.license,
      manifest.executionClass,
      manifest.targetTypes,
      manifest.capabilities,
      manifest.passiveModuleAllowlist ?? [],
      manifest.blockedModules ?? [],
      manifest.workerRuntime,
      manifest.cliCommand,
      manifest.outputFormat,
      manifest.timeoutMs,
      manifest.maxRetries,
      manifest.rateLimitPerMinute,
      manifest.manifestHash,
    ],
  );
}

async function queueRun(
  manifest: DishaToolManifest,
  input: Astra6DispatchInput,
  context: AdapterContext,
): Promise<string> {
  const pool = getDbPool();
  if (!pool) throw new Error("not_configured: DATABASE_URL is required for ASTRA 6 workers");

  await ensureManifestRegistered(manifest);
  const runId = randomUUID();
  const dispatchInput = {
    options: input.options ?? {},
    ...(context.identityAuthorization === true ? { identityAuthorization: true } : {}),
    ...(context.activeAuthorization === true ? { activeAuthorization: true } : {}),
  };
  const provenanceHash = hashValue({
    runId,
    missionId: context.missionId,
    userId: context.userId,
    toolId: manifest.toolId,
    target: input.target,
    targetType: input.targetType,
    dispatchInput,
  });

  await pool.query(
    `insert into astra6_connector_runs (
       run_id, tool_id, mission_id, user_id, target, target_type, status,
       dispatch_input, provenance_hash, queued_at
     ) values ($1,$2,$3,$4,$5,$6,'queued',$7::jsonb,$8,now())`,
    [
      runId,
      manifest.toolId,
      context.missionId,
      context.userId,
      input.target,
      input.targetType,
      JSON.stringify(dispatchInput),
      provenanceHash,
    ],
  );
  return runId;
}

function evidenceArray(value: unknown): AdapterEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is AdapterEvidence => {
    if (!item || typeof item !== "object") return false;
    const row = item as Partial<AdapterEvidence>;
    return typeof row.id === "string"
      && typeof row.sourceId === "string"
      && typeof row.sourceName === "string"
      && typeof row.summary === "string"
      && typeof row.retrievedAt === "string"
      && typeof row.provenanceHash === "string";
  });
}

function warningArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 30) : [];
}

async function waitForRun(runId: string, manifest: DishaToolManifest, signal?: AbortSignal): Promise<Astra6RunRow> {
  const pool = getDbPool();
  if (!pool) throw new Error("not_configured: DATABASE_URL is required for ASTRA 6 workers");
  const deadline = Date.now() + Math.max(1_000, manifest.timeoutMs - 2_000);

  for (;;) {
    if (signal?.aborted) {
      await pool.query(
        `update astra6_connector_runs set status='cancelled', completed_at=now()
         where run_id=$1 and status in ('queued','running')`,
        [runId],
      );
      throw new Error("adapter_cancelled");
    }

    const response = await pool.query<Astra6RunRow>(
      `select run_id, status, parsed_output, evidence, warnings, error, worker_id, duration_ms
       from astra6_connector_runs where run_id=$1`,
      [runId],
    );
    const row = response.rows[0];
    if (!row) throw new Error("astra6_run_missing");

    if (row.status === "completed" || row.status === "partial") return row;
    if (row.status === "failed") throw new Error(row.error || `${manifest.toolId}_worker_failed`);
    if (row.status === "cancelled") throw new Error("adapter_cancelled");
    if (row.status === "blocked_by_policy") throw new Error("policy_denied");
    if (row.status === "timed_out") throw new Error("adapter_timeout");

    if (Date.now() >= deadline) {
      await pool.query(
        `update astra6_connector_runs set status='timed_out', error='worker_result_timeout', completed_at=now()
         where run_id=$1 and status in ('queued','running')`,
        [runId],
      );
      throw new Error("adapter_timeout");
    }
    await sleep(400);
  }
}

function createAstra6Adapter(manifest: DishaToolManifest): GovernedOsintAdapter<Astra6DispatchInput, Astra6DispatchOutput> {
  const isIdentityTool = isIdentityManifest(manifest);

  return {
    metadata: {
      id: `astra6-${manifest.toolId}`,
      name: `ASTRA 6 ${manifest.name}`,
      version: manifest.version,
      capability: manifest.capabilities[0] ?? manifest.toolId,
      auth: manifest.toolId === "telegram-public" ? "session" : "none",
      legalUse: manifest.legalUse,
      blockedUse: manifest.blockedUse,
      rateLimitPerMinute: manifest.rateLimitPerMinute,
      timeoutMs: manifest.timeoutMs,
      maxRetries: manifest.maxRetries,
      executionClass: manifest.executionClass,
      defaultEnabled: true,
      upstreamRepository: manifest.repository,
    },
    async health() {
      if (!isToolAvailable(manifest)) {
        return { status: "not_configured" as const, detail: `${manifest.name} is not enabled. Set DISHA_ASTRA6_${manifest.toolId.toUpperCase().replace(/-/g, "_")}_ENABLED=true or DISHA_ASTRA6_ALL_TOOLS_ENABLED=true.` };
      }
      if (!getDbPool()) {
        return { status: "not_configured" as const, detail: `${manifest.name} requires DATABASE_URL so the web process can dispatch to the worker.` };
      }
      const configIssue = configurationIssue(manifest);
      if (configIssue) {
        return { status: "not_configured" as const, detail: configIssue };
      }
      if (manifest.toolId === "instaloader" && (!process.env.INSTAGRAM_LOGIN || !process.env.INSTAGRAM_SESSION_FILE)) {
        return { status: "degraded" as const, detail: "Instaloader will use anonymous public-profile access; Instagram may rate-limit or block some requests." };
      }
      if (isIdentityTool && !identityDeploymentApproved()) {
        return { status: "degraded" as const, detail: `${manifest.name} requires DISHA_IDENTITY_ENUMERATION_APPROVED=true for authorized identity investigations.` };
      }
      if (manifest.executionClass === "active_recon" && !activeReconDeploymentApproved()) {
        return { status: "degraded" as const, detail: `${manifest.name} requires DISHA_ACTIVE_RECON_APPROVED=true before active crawling can run.` };
      }
      return { status: "healthy" as const, detail: `${manifest.name} database-backed worker dispatch ready.` };
    },
    async execute(input: Astra6DispatchInput, context: AdapterContext) {
      const target = validateCommandTarget(input.target, manifest.commandInjectionGuard);
      if (!manifest.targetTypes.includes(input.targetType)) {
        throw new Error(`target_type_mismatch: ${manifest.name} does not accept ${input.targetType}, expected ${manifest.targetTypes.join("/")}`);
      }
      if (!isToolAvailable(manifest)) throw new Error("not_configured");
      if (configurationIssue(manifest)) throw new Error("not_configured");
      if (isIdentityTool && (!identityDeploymentApproved() || context.identityAuthorization !== true)) {
        throw new Error("policy_denied");
      }
      if (manifest.executionClass === "active_recon" && (!activeReconDeploymentApproved() || context.activeAuthorization !== true)) {
        throw new Error("policy_denied");
      }

      const runId = await queueRun(manifest, { ...input, target }, context);
      const row = await waitForRun(runId, manifest, context.signal);
      const evidence = evidenceArray(row.evidence);
      const warnings = warningArray(row.warnings);
      const data: Astra6DispatchOutput = {
        runId,
        toolId: manifest.toolId,
        target,
        targetType: input.targetType,
        dispatchStatus: "completed",
        workerRuntime: manifest.workerRuntime,
        cliCommand: manifest.cliCommand,
        estimatedTimeoutMs: manifest.timeoutMs,
        policyApprovalRequired: isIdentityTool,
        workerId: row.worker_id ?? undefined,
        durationMs: row.duration_ms,
        result: row.parsed_output,
        options: input.options,
      };

      return {
        data,
        evidence: evidence.length ? evidence : [buildAdapterEvidence({
          sourceId: manifest.toolId,
          sourceName: manifest.name,
          sourceUrl: manifest.repository,
          summary: `${manifest.name} worker completed for ${input.targetType} target '${target}'.`,
        })],
        warnings,
      };
    },
  };
}

export const phoneInfogaAdapter = createAstra6Adapter(phoneInfogaManifest);
export const sherlockAdapter = createAstra6Adapter(sherlockManifest);
export const maigretAdapter = createAstra6Adapter(maigretManifest);
export const holeheAdapter = createAstra6Adapter(holeheManifest);
export const instaloaderAdapter = createAstra6Adapter(instaloaderManifest);
export const telegramPublicAdapter = createAstra6Adapter(telegramPublicManifest);
export const theHarvesterAdapter = createAstra6Adapter(theHarvesterManifest);
export const spiderfootAdapter = createAstra6Adapter(spiderfootManifest);
export const amassAdapter = createAstra6Adapter(amassManifest);
export const subfinderAdapter = createAstra6Adapter(subfinderManifest);
export const reconNgAdapter = createAstra6Adapter(reconNgManifest);
export const photonAdapter = createAstra6Adapter(photonManifest);
export const userScannerAdapter = createAstra6Adapter(userScannerManifest);
export const toutatisAdapter = createAstra6Adapter(toutatisManifest);
export const mrHolmesAdapter = createAstra6Adapter(mrHolmesManifest);
export const onionSearchAdapter = createAstra6Adapter(onionSearchManifest);
export const xurlfind3rAdapter = createAstra6Adapter(xurlfind3rManifest);

export const astra6Adapters = [
  phoneInfogaAdapter,
  sherlockAdapter,
  maigretAdapter,
  holeheAdapter,
  instaloaderAdapter,
  telegramPublicAdapter,
  theHarvesterAdapter,
  spiderfootAdapter,
  amassAdapter,
  subfinderAdapter,
  reconNgAdapter,
  photonAdapter,
  userScannerAdapter,
  toutatisAdapter,
  mrHolmesAdapter,
  onionSearchAdapter,
  xurlfind3rAdapter,
];
