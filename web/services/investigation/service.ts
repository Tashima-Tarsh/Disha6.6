import { createHash, randomUUID } from "node:crypto";
import { audit } from "../../lib/server/audit";
import { investigationStore, type InvestigationStore, type TemporaryInvestigation } from "../../lib/server/investigation-store";
import type { RequestContext } from "../../lib/server/types";
import type { AdapterPlan, Investigation, InvestigationRun, RunStatus } from "../../lib/investigation/types";
import type { AdapterExecutionResult } from "../../lib/unified/osint-adapter-bus";
import {
  astra6InvestigationBridge,
  type Astra6InvestigationBridge,
} from "../../lib/unified/astra6-investigation-bridge";
import { investigationInput, classifyTarget, planInvestigation } from "./plan";
import { executeProvider } from "./providers";
import { appendEvidence, normalizeRecords, record } from "./normalize";
import { analyzeImage } from "./image";

const controllers = new Map<string, AbortController>();
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const failure = (message: string, status: number) => Object.assign(new Error(message), { status });

export function publicInvestigation(value: TemporaryInvestigation): Investigation {
  const { ownerId: _ownerId, ...view } = value;
  return view;
}

export function runFailure(error: string): { status: RunStatus; error: string } {
  if (/not_configured|worker_unavailable/.test(error)) return { status: "NOT_CONFIGURED", error: "Provider or worker is not configured" };
  if (/429|rate_limit|credits_exhausted/.test(error)) return { status: "RATE_LIMITED", error: "Provider rate limit or query credits reached" };
  if (/execution_class_denied|policy_denied|adapter_disabled/.test(error)) return { status: "BLOCKED", error: "Source execution is blocked by policy" };
  if (/401|403/.test(error)) return { status: "RESTRICTED", error: "Provider denied this credential or entitlement" };
  if (/cancel/.test(error)) return { status: "SKIPPED", error: "Source execution stopped" };
  return { status: "FAILED", error: /timeout|timed_out/.test(error) ? "Provider timed out" : "Provider request failed" };
}

function applyResult(
  value: TemporaryInvestigation,
  run: InvestigationRun,
  plan: AdapterPlan,
  result: AdapterExecutionResult<unknown>,
) {
  if (result.status === "completed" || result.status === "partial") {
    const evidence = normalizeRecords(plan, result);
    appendEvidence(value, plan, evidence);
    run.status = evidence.length ? "COMPLETED" : "NO_RESULTS";
    run.evidenceCount = evidence.length;
    run.warnings = result.warnings.map(warning => warning.slice(0, 300));
    if (record(result.data).providerHealth === "REST_HEALTHY") run.providerHealth = "REST_HEALTHY";
  } else {
    Object.assign(run, runFailure(result.error ?? result.status));
  }
}

export class InvestigationService {
  constructor(
    private store: InvestigationStore = investigationStore,
    private execute = executeProvider,
    private log = audit,
    private astra: Astra6InvestigationBridge = astra6InvestigationBridge,
  ) {}

  async create(input: unknown, ctx: RequestContext, upload?: { bytes: Buffer; type: string }): Promise<Investigation> {
    if (!await this.store.budget(`create:${ctx.principal.userId}`, 6)) throw failure("Investigation rate limit exceeded", 429);
    const parsed = upload ? { target: "Uploaded image", targetType: "auto" as const } : investigationInput.safeParse(input);
    if ("success" in parsed && !parsed.success) throw failure("Invalid target or target type", 400);
    const values = "success" in parsed ? parsed.data : parsed;
    const classification = upload ? { targetType: "image" as const, normalizedTarget: "Uploaded image" } : classifyTarget(values.target, values.targetType);
    const metadata = upload ? await analyzeImage(upload.bytes, upload.type) : undefined;
    const now = Date.now();
    const plannedAdapters = planInvestigation(classification.normalizedTarget, classification.targetType);
    const value: TemporaryInvestigation = {
      investigationId: randomUUID(), revision: 0, ownerId: ctx.principal.userId, target: values.target, ...classification,
      createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 15 * 60_000).toISOString(),
      plannedAdapters, runs: plannedAdapters.map(plan => ({ adapterId: plan.adapterId, sourceName: plan.sourceName, status: plan.initialStatus ?? "QUEUED", evidenceCount: 0, warnings: plan.initialStatus ? [plan.reason] : [] })),
      status: plannedAdapters.some(plan => !plan.initialStatus) ? "QUEUED" : "COMPLETED", evidence: [], candidateClusters: [], edges: [],
    };
    if (metadata) {
      const evidenceId = randomUUID();
      const contentHash = createHash("sha256").update(JSON.stringify(metadata)).digest("hex");
      value.evidence.push({ evidenceId, sourceId: "uploaded-image", sourceName: "Uploaded image · local analysis", adapterId: "image-metadata", retrievedAt: value.createdAt, summary: `${metadata.width} × ${metadata.height} ${metadata.format.toUpperCase()} · image metadata`, contentHash, provenanceHash: createHash("sha256").update(`${evidenceId}:${metadata.sha256}:${value.createdAt}`).digest("hex"), corroborationState: "unverified", contradictionState: "not_assessed", fields: { ...metadata } });
      value.runs.unshift({ adapterId: "image-metadata", sourceName: "Image metadata", status: "COMPLETED", evidenceCount: 1, warnings: ["Image metadata is not identity evidence. Embedded timestamps are unverified."] });
      value.edges.push({ id: randomUUID(), sourceId: evidenceId, targetId: "image-metadata", type: "DERIVED_FROM", evidenceId });
    }
    await this.store.create(value, upload?.bytes);
    await this.log({ requestId: ctx.requestId, userId: ctx.principal.userId, action: "investigation.started", resource: value.investigationId, outcome: "success", metadata: { targetClass: value.targetType, startTime: value.createdAt, expiresAt: value.expiresAt, adapters: value.runs.map(run => run.adapterId) } });
    return publicInvestigation(value);
  }

  private save(value: TemporaryInvestigation) {
    value.revision += 1;
    return this.store.save(value);
  }

  private async owned(id: string, ownerId: string) {
    if (!/^[\da-f-]{36}$/i.test(id)) throw failure("Investigation not found", 404);
    const value = await this.store.read(id);
    if (!value || value.ownerId !== ownerId) throw failure("Investigation not found or expired", 404);
    if (Date.parse(value.expiresAt) <= Date.now()) {
      controllers.get(id)?.abort();
      await this.store.stop(id);
      await this.astra.cleanup(id, value.ownerId);
      await this.store.remove(id);
      throw failure("Investigation expired", 410);
    }
    return value;
  }

  async get(id: string, ownerId: string) {
    const value = await this.owned(id, ownerId);
    if (await this.store.stopped(id)) value.status = "CLOSING";
    return publicInvestigation(value);
  }

  async advance(id: string, ctx: RequestContext, requestSignal?: AbortSignal) {
    await this.owned(id, ctx.principal.userId);
    const token = await this.store.acquire(id);
    if (!token) return this.get(id, ctx.principal.userId);

    const controller = new AbortController();
    controllers.set(id, controller);
    let heartbeat: ReturnType<typeof setTimeout> | undefined;
    let finished = false;
    let skipFinalSave = false;

    const monitor = async () => {
      try {
        if (await this.store.stopped(id) || !await this.store.read(id)) controller.abort();
      } catch {
        controller.abort();
      }
      if (!finished) heartbeat = setTimeout(() => void monitor(), 200);
    };
    heartbeat = setTimeout(() => void monitor(), 200);

    const cancel = () => controller.abort();
    requestSignal?.addEventListener("abort", cancel, { once: true });

    let value: TemporaryInvestigation | undefined;
    let run: InvestigationRun | undefined;

    try {
      value = await this.owned(id, ctx.principal.userId);
      if (await this.store.stopped(id)) throw failure("Investigation is closing", 409);

      // Only in-request inline runs are considered orphaned. ASTRA runs are durable external jobs.
      for (const orphan of value.runs.filter(item => item.status === "RUNNING" && !item.externalRunId)) {
        Object.assign(orphan, { status: "FAILED", error: "Source worker interrupted", endedAt: new Date().toISOString() });
      }

      const external = value.runs.find(item => item.status === "RUNNING" && item.externalRunId);
      if (external?.externalRunId) {
        run = external;
        const plan = value.plannedAdapters.find(item => item.adapterId === run?.adapterId);
        if (!plan) throw failure("Investigation source plan is missing", 500);

        const polled = await this.astra.poll(external.externalRunId, ctx.principal.userId);
        if (polled.pending) {
          value.status = "RUNNING";
          await sleep(350);
          skipFinalSave = true;
          return publicInvestigation(value);
        }

        applyResult(value, run, plan, polled.result);
        run.endedAt = new Date().toISOString();
      } else {
        run = value.runs.find(item => item.status === "QUEUED");
        if (!run) {
          value.status = "COMPLETED";
          await this.save(value);
          skipFinalSave = true;
          return publicInvestigation(value);
        }

        const plan = value.plannedAdapters.find(item => item.adapterId === run?.adapterId);
        if (!plan) throw failure("Investigation source plan is missing", 500);

        const providerLimit = plan.adapterId === "public-nvd-cve" ? 5 : plan.adapterId === "passive-shodan" ? 10 : 25;
        if (!await this.store.budget(`provider:${plan.adapterId}`, providerLimit)) {
          Object.assign(run, { status: "RATE_LIMITED", error: "Shared provider request limit reached", endedAt: new Date().toISOString() });
        } else if (this.astra.isAdapter(plan.adapterId)) {
          value.status = "RUNNING";
          run.status = "RUNNING";
          run.startedAt = new Date().toISOString();
          run.externalRunId = await this.astra.enqueue(plan, ctx.principal.userId, id);
          if (!await this.save(value)) {
            await this.astra.cleanup(id, ctx.principal.userId);
            throw failure("Investigation closed", 409);
          }
          skipFinalSave = true;
          return publicInvestigation(value);
        } else {
          value.status = "RUNNING";
          run.status = "RUNNING";
          run.startedAt = new Date().toISOString();
          if (!await this.save(value)) throw failure("Investigation closed", 409);

          const signal = AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(Math.max(1, Math.min(24_000, Date.parse(value.expiresAt) - Date.now()))),
            ...(requestSignal ? [requestSignal] : []),
          ]);
          const image = value.targetType === "image" ? await this.store.image(id) : null;
          try {
            const result = await this.execute(plan, ctx.principal.userId, id, signal, image);
            if (signal.aborted || await this.store.stopped(id)) throw failure("Investigation stopped", 409);
            applyResult(value, run, plan, result);
          } finally {
            image?.fill(0);
          }
          run.endedAt = new Date().toISOString();
        }
      }
    } catch (error) {
      if (!value || !run) throw error;
      Object.assign(run, runFailure(error instanceof Error ? error.message : "provider_failed"), { endedAt: new Date().toISOString() });
    } finally {
      finished = true;
      if (heartbeat) clearTimeout(heartbeat);
      requestSignal?.removeEventListener("abort", cancel);
      controllers.delete(id);
      try {
        if (value && !skipFinalSave) {
          value.status = value.runs.some(item => item.status === "QUEUED" || item.status === "RUNNING") ? "RUNNING" : "COMPLETED";
          await this.save(value);
        }
      } finally {
        await this.store.release(id, token);
      }
    }

    return this.get(id, ctx.principal.userId);
  }

  async close(id: string, ctx: RequestContext) {
    if (!/^[\da-f-]{36}$/i.test(id) || !await this.store.authorized(id, ctx.principal.userId)) throw failure("Investigation not found", 404);
    const value = await this.store.read(id);
    await this.store.stop(id);
    controllers.get(id)?.abort();
    await this.astra.cleanup(id, ctx.principal.userId);

    const deadline = Date.now() + 10_000;
    while (await this.store.busy(id)) {
      if (Date.now() > deadline) throw failure("Cleanup pending: source execution is still stopping. Retry Close.", 409);
      await sleep(100);
    }

    await this.store.remove(id);
    if (await this.store.read(id) || await this.store.image(id)) throw failure("Cleanup could not be confirmed. Retry Close.", 503);
    await this.log({ requestId: ctx.requestId, userId: ctx.principal.userId, action: "investigation.closed", resource: id, outcome: "success", metadata: { targetClass: value?.targetType, startTime: value?.createdAt, closeTime: new Date().toISOString(), runs: (value?.runs ?? []).map(item => ({ adapterId: item.adapterId, status: item.status === "RUNNING" || item.status === "QUEUED" ? "SKIPPED" : item.status })) } });
    return { investigationId: id, status: "CLOSED" as const, cleanupConfirmed: true };
  }
}

export const investigations = new InvestigationService();
