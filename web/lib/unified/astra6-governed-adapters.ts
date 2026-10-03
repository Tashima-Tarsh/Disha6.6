import crypto from "node:crypto";

import { getDbPool } from "../server/db";
import { hashValue } from "./hash";
import { buildAdapterEvidence, type AdapterContext, type GovernedOsintAdapter, type AdapterEvidence } from "./osint-adapter-bus";
import {
  phoneInfogaManifest,
  sherlockManifest,
  theHarvesterManifest,
  spiderfootManifest,
  amassManifest,
  subfinderManifest,
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
  dispatchStatus: "queued" | "blocked_by_policy" | "tool_not_available";
  workerRuntime: string;
  cliCommand: string;
  estimatedTimeoutMs: number;
  policyApprovalRequired: boolean;
  options?: Record<string, string>;
};

function isToolAvailable(manifest: DishaToolManifest): boolean {
  const envKey = `DISHA_ASTRA6_${manifest.toolId.toUpperCase().replace(/-/g, "_")}_ENABLED`;
  return process.env[envKey] === "true" || process.env.DISHA_ASTRA6_ALL_TOOLS_ENABLED === "true";
}

function identityPolicyApproved(): boolean {
  return process.env.DISHA_IDENTITY_ENUMERATION_APPROVED === "true";
}

function isIdentityTarget(targetType: string): boolean {
  return ["username", "phone_number", "email"].includes(targetType);
}

async function enqueueConnectorRun(
  manifest: DishaToolManifest,
  input: Astra6DispatchInput,
  context: AdapterContext,
  target: string,
): Promise<{ runId: string; provenanceHash: string }> {
  const pool = getDbPool();
  if (!pool) throw new Error("astra6_dispatch_database_unavailable");

  const queuedAt = new Date().toISOString();
  const runId = `astra6-${hashValue({
    toolId: manifest.toolId,
    missionId: context.missionId,
    userId: context.userId,
    target,
    targetType: input.targetType,
    queuedAt,
    nonce: crypto.randomUUID(),
  }).slice(0, 24)}`;
  const provenanceHash = hashValue({
    runId,
    toolId: manifest.toolId,
    missionId: context.missionId,
    userId: context.userId,
    target,
    targetType: input.targetType,
    purpose: context.purpose,
    options: input.options ?? {},
    queuedAt,
  });

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into astra6_tool_manifests (
        tool_id,name,version,repository,license,execution_class,target_types,capabilities,
        passive_module_allowlist,blocked_modules,worker_runtime,cli_command,output_format,
        timeout_ms,max_retries,rate_limit_per_minute,manifest_hash,enabled,registered_at,updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,true,$18,$18
      )
      on conflict (tool_id) do update set
        name=excluded.name,
        version=excluded.version,
        repository=excluded.repository,
        license=excluded.license,
        execution_class=excluded.execution_class,
        target_types=excluded.target_types,
        capabilities=excluded.capabilities,
        passive_module_allowlist=excluded.passive_module_allowlist,
        blocked_modules=excluded.blocked_modules,
        worker_runtime=excluded.worker_runtime,
        cli_command=excluded.cli_command,
        output_format=excluded.output_format,
        timeout_ms=excluded.timeout_ms,
        max_retries=excluded.max_retries,
        rate_limit_per_minute=excluded.rate_limit_per_minute,
        manifest_hash=excluded.manifest_hash,
        enabled=true,
        updated_at=excluded.updated_at`,
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
        queuedAt,
      ],
    );
    await client.query(
      `insert into astra6_connector_runs (
        run_id,tool_id,mission_id,user_id,target,target_type,status,dispatch_input,
        evidence,warnings,attempts,duration_ms,provenance_hash,queued_at
      ) values ($1,$2,$3,$4,$5,$6,'queued',$7::jsonb,'[]'::jsonb,'[]'::jsonb,0,0,$8,$9)`,
      [
        runId,
        manifest.toolId,
        context.missionId || null,
        context.userId,
        target,
        input.targetType,
        JSON.stringify({
          options: input.options ?? {},
          purpose: context.purpose,
          requestedAt: queuedAt,
        }),
        provenanceHash,
        queuedAt,
      ],
    );
    await client.query("commit");
    return { runId, provenanceHash };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

function createAstra6Adapter(manifest: DishaToolManifest): GovernedOsintAdapter<Astra6DispatchInput, Astra6DispatchOutput> {
  return {
    metadata: {
      id: `astra6-${manifest.toolId}`,
      name: `ASTRA 6 ${manifest.name}`,
      version: manifest.version,
      capability: manifest.capabilities[0] ?? manifest.toolId,
      auth: "none",
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
        return {
          status: "not_configured" as const,
          detail: `${manifest.name} is not enabled. Set DISHA_ASTRA6_${manifest.toolId.toUpperCase().replace(/-/g, "_")}_ENABLED=true or DISHA_ASTRA6_ALL_TOOLS_ENABLED=true.`,
        };
      }
      if (!getDbPool()) {
        return {
          status: "not_configured" as const,
          detail: `${manifest.name} requires DATABASE_URL because ASTRA 6 dispatch is a durable worker queue.`,
        };
      }
      return { status: "healthy" as const, detail: `${manifest.name} durable worker dispatch ready.` };
    },
    async execute(input: Astra6DispatchInput, context: AdapterContext) {
      const target = validateCommandTarget(input.target, manifest.commandInjectionGuard);
      if (!manifest.targetTypes.includes(input.targetType)) {
        throw new Error(`target_type_mismatch: ${manifest.name} does not accept ${input.targetType}, expected ${manifest.targetTypes.join("/")}`);
      }

      if (isIdentityTarget(input.targetType) && !identityPolicyApproved()) {
        const data: Astra6DispatchOutput = {
          toolId: manifest.toolId,
          target,
          targetType: input.targetType,
          dispatchStatus: "blocked_by_policy",
          workerRuntime: manifest.workerRuntime,
          cliCommand: manifest.cliCommand,
          estimatedTimeoutMs: manifest.timeoutMs,
          policyApprovalRequired: true,
          options: input.options,
        };
        return {
          data,
          evidence: [buildAdapterEvidence({
            sourceId: manifest.toolId,
            sourceName: manifest.name,
            summary: `${manifest.name} dispatch blocked: identity-enumeration approval is required for ${input.targetType} targets.`,
          })],
          warnings: [`${manifest.name} requires DISHA_IDENTITY_ENUMERATION_APPROVED=true for ${input.targetType} targets.`],
        };
      }

      const queued = await enqueueConnectorRun(manifest, input, context, target);
      const data: Astra6DispatchOutput = {
        runId: queued.runId,
        toolId: manifest.toolId,
        target,
        targetType: input.targetType,
        dispatchStatus: "queued",
        workerRuntime: manifest.workerRuntime,
        cliCommand: manifest.cliCommand,
        estimatedTimeoutMs: manifest.timeoutMs,
        policyApprovalRequired: false,
        options: input.options,
      };

      const evidence: AdapterEvidence[] = [buildAdapterEvidence({
        sourceId: manifest.toolId,
        sourceName: manifest.name,
        sourceUrl: manifest.repository,
        summary: `${manifest.name} run ${queued.runId} durably queued for ${input.targetType} target via the ${manifest.workerRuntime} worker.`,
      })];

      return { data, evidence };
    },
  };
}

export const phoneInfogaAdapter = createAstra6Adapter(phoneInfogaManifest);
export const sherlockAdapter = createAstra6Adapter(sherlockManifest);
export const theHarvesterAdapter = createAstra6Adapter(theHarvesterManifest);
export const spiderfootAdapter = createAstra6Adapter(spiderfootManifest);
export const amassAdapter = createAstra6Adapter(amassManifest);
export const subfinderAdapter = createAstra6Adapter(subfinderManifest);

export const astra6Adapters = [
  phoneInfogaAdapter,
  sherlockAdapter,
  theHarvesterAdapter,
  spiderfootAdapter,
  amassAdapter,
  subfinderAdapter,
];
