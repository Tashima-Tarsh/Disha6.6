import { getDbPool } from "../server/db";
import type { AdapterPlan } from "../investigation/types";
import {
  getAstra6ToolManifest,
  type DishaToolManifest,
} from "./astra6-tool-manifest";
import { hashValue } from "./hash";
import type {
  AdapterEvidence,
  AdapterExecutionResult,
} from "./osint-adapter-bus";

export type Astra6PollResult =
  | { pending: true; status: "queued" | "running" }
  | { pending: false; status: string; result: AdapterExecutionResult<unknown> };

export interface Astra6InvestigationBridge {
  isAdapter(adapterId: string): boolean;
  enqueue(plan: AdapterPlan, userId: string, investigationId: string): Promise<string>;
  poll(runId: string, userId: string): Promise<Astra6PollResult>;
  cleanup(investigationId: string, userId: string): Promise<void>;
}

export function isAstra6AdapterId(adapterId: string): boolean {
  return adapterId.startsWith("astra6-");
}

function toolId(adapterId: string): string {
  return adapterId.replace(/^astra6-/, "");
}

function toolEnabled(manifest: DishaToolManifest): boolean {
  const envKey = `DISHA_ASTRA6_${manifest.toolId.toUpperCase().replace(/-/g, "_")}_ENABLED`;
  return process.env[envKey] === "true" || process.env.DISHA_ASTRA6_ALL_TOOLS_ENABLED === "true";
}

function identitySensitive(targetType: string): boolean {
  return ["email", "phone_number", "username"].includes(targetType);
}

async function upsertManifest(manifest: DishaToolManifest) {
  const pool = getDbPool();
  if (!pool) throw new Error("astra6_not_configured");

  await pool.query(
    `insert into astra6_tool_manifests (
       tool_id,name,version,repository,license,execution_class,target_types,capabilities,
       passive_module_allowlist,blocked_modules,worker_runtime,cli_command,output_format,
       timeout_ms,max_retries,rate_limit_per_minute,manifest_hash,enabled,registered_at,updated_at
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,now()
     )
     on conflict (tool_id) do update set
       name=excluded.name,version=excluded.version,repository=excluded.repository,license=excluded.license,
       execution_class=excluded.execution_class,target_types=excluded.target_types,capabilities=excluded.capabilities,
       passive_module_allowlist=excluded.passive_module_allowlist,blocked_modules=excluded.blocked_modules,
       worker_runtime=excluded.worker_runtime,cli_command=excluded.cli_command,output_format=excluded.output_format,
       timeout_ms=excluded.timeout_ms,max_retries=excluded.max_retries,
       rate_limit_per_minute=excluded.rate_limit_per_minute,manifest_hash=excluded.manifest_hash,
       enabled=excluded.enabled,updated_at=now()`,
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
      toolEnabled(manifest),
      manifest.registeredAt,
    ],
  );
}

function jsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

export const astra6InvestigationBridge: Astra6InvestigationBridge = {
  isAdapter: isAstra6AdapterId,

  async enqueue(plan, userId, investigationId) {
    const pool = getDbPool();
    if (!pool) throw new Error("astra6_not_configured");

    const id = toolId(plan.adapterId);
    const manifest = getAstra6ToolManifest(id);
    if (!manifest || !toolEnabled(manifest)) throw new Error("astra6_not_configured");

    const target = String(plan.input.target ?? "").trim();
    const targetType = String(plan.input.targetType ?? "").trim();
    if (!target || !manifest.targetTypes.includes(targetType)) throw new Error("astra6_target_type_mismatch");
    if (identitySensitive(targetType)) {
      const deploymentApproved = process.env.DISHA_IDENTITY_ENUMERATION_APPROVED === "true";
      const investigationApproved = plan.input.identityAuthorization === true;
      if (!deploymentApproved || !investigationApproved) {
        throw new Error("policy_denied_identity_enumeration");
      }
    }
    if (manifest.executionClass === "active_recon") {
      const deploymentApproved = process.env.DISHA_ACTIVE_RECON_APPROVED === "true";
      const investigationApproved = plan.input.activeAuthorization === true;
      if (!deploymentApproved || !investigationApproved) {
        throw new Error("policy_denied_active_recon");
      }
    }

    await upsertManifest(manifest);

    const runId = hashValue({ investigationId, adapterId: plan.adapterId, target, targetType });
    const provenanceHash = hashValue({
      runId,
      investigationId,
      userId,
      toolId: manifest.toolId,
      target,
      targetType,
      queued: true,
    });

    await pool.query(
      `insert into astra6_connector_runs (
         run_id,tool_id,mission_id,user_id,target,target_type,status,dispatch_input,
         attempts,duration_ms,provenance_hash,queued_at
       ) values ($1,$2,$3,$4,$5,$6,'queued',$7::jsonb,0,0,$8,now())
       on conflict (run_id) do nothing`,
      [
        runId,
        manifest.toolId,
        investigationId,
        userId,
        target,
        targetType,
        JSON.stringify(plan.input),
        provenanceHash,
      ],
    );

    return runId;
  },

  async poll(runId, userId) {
    const pool = getDbPool();
    if (!pool) throw new Error("astra6_not_configured");

    const query = await pool.query(
      `select tool_id,status,parsed_output,evidence,warnings,error,attempts,duration_ms,queued_at,started_at
         from astra6_connector_runs
        where run_id=$1 and user_id=$2
        limit 1`,
      [runId, userId],
    );
    const row = query.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return {
        pending: false,
        status: "failed",
        result: {
          adapterId: "astra6-worker",
          status: "failed",
          evidence: [],
          warnings: [],
          attempts: 0,
          durationMs: 0,
          error: "astra6_run_missing",
        },
      };
    }

    let status = String(row.status ?? "failed");
    if (status === "queued" || status === "running") {
      const now = Date.now();
      const queuedAt = row.queued_at instanceof Date ? row.queued_at.getTime() : Date.parse(String(row.queued_at ?? ""));
      const startedAt = row.started_at instanceof Date ? row.started_at.getTime() : Date.parse(String(row.started_at ?? ""));
      const queueTimeoutMs = Math.max(5_000, Number(process.env.DISHA_ASTRA6_QUEUE_TIMEOUT_MS ?? 45_000));
      const manifest = getAstra6ToolManifest(String(row.tool_id ?? ""));
      const executionTimeoutMs = (manifest?.timeoutMs ?? 180_000) + 30_000;
      const staleQueued = status === "queued" && Number.isFinite(queuedAt) && now - queuedAt > queueTimeoutMs;
      const staleRunning = status === "running" && Number.isFinite(startedAt) && now - startedAt > executionTimeoutMs;

      if (staleQueued || staleRunning) {
        const error = staleQueued ? "astra6_worker_unavailable" : "astra6_worker_timed_out";
        await pool.query(
          `update astra6_connector_runs
              set status='timed_out', error=$3, completed_at=now()
            where run_id=$1 and user_id=$2 and status=$4`,
          [runId, userId, error, status],
        );
        status = "timed_out";
        row.error = error;
      } else {
        return { pending: true, status };
      }
    }

    const evidence = jsonArray<AdapterEvidence>(row.evidence);
    const warnings = jsonArray<string>(row.warnings).map(value => String(value).slice(0, 300));
    const attempts = typeof row.attempts === "number" ? row.attempts : Number(row.attempts ?? 0);
    const durationMs = typeof row.duration_ms === "number" ? row.duration_ms : Number(row.duration_ms ?? 0);

    if (status === "completed" || status === "partial") {
      return {
        pending: false,
        status,
        result: {
          adapterId: "astra6-worker",
          status,
          data: row.parsed_output,
          evidence,
          warnings,
          attempts,
          durationMs,
        },
      };
    }

    return {
      pending: false,
      status,
      result: {
        adapterId: "astra6-worker",
        status: "failed",
        data: row.parsed_output,
        evidence,
        warnings,
        attempts,
        durationMs,
        error: typeof row.error === "string" && row.error ? row.error : `astra6_${status}`,
      },
    };
  },

  async cleanup(investigationId, userId) {
    const pool = getDbPool();
    if (!pool) return;
    await pool.query(
      `update astra6_connector_runs
          set status='cancelled', error=coalesce(error,'investigation_closed'), completed_at=coalesce(completed_at,now())
        where mission_id=$1 and user_id=$2 and status in ('queued','running')`,
      [investigationId, userId],
    );
    await pool.query(
      "delete from astra6_connector_runs where mission_id=$1 and user_id=$2",
      [investigationId, userId],
    );
  },
};
