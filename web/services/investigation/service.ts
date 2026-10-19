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
import { executeIntelligencePipeline } from "./intelligence-pipeline";

const controllers = new Map<string, AbortController>();
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const failure = (message: string, status: number) => Object.assign(new Error(message), { status });

export function publicInvestigation(value: TemporaryInvestigation): Investigation {
  const { ownerId: _ownerId, ...view } = value;
  return view;
}

export function runFailure(error: string): { status: RunStatus; error: string } {
  if (/incompatible/.test(error)) return { status: "INCOMPATIBLE", error: "Source is incompatible with target type" };
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
    if (!await this.store.budget(`create:${ctx.principal.userId}`, 10)) throw failure("Investigation rate limit exceeded", 429);
    let values: ReturnType<typeof investigationInput.parse>;
    if (upload) {
      values = {
        target: "Uploaded image",
        targetType: "auto",
        searchUniverse: "universal",
        investigationMode: "standard",
        sourcePolicy: "all_approved",
        jurisdiction: "global",
        timeRange: "30d",
        selectedToolIds: [],
        identityAuthorization: false,
        activeAuthorization: false,
      };
    } else {
      const parsed = investigationInput.safeParse(input);
      if (!parsed.success) {
        throw failure(
          "Invalid investigation request: " + parsed.error.issues.map((i: { message: string }) => i.message).join(", "),
          400,
        );
      }
      values = parsed.data;
    }
    const identityAuthorized = !upload
      && "identityAuthorization" in values
      && values.identityAuthorization === true;
    if (identityAuthorized && !ctx.principal.roles.some((role) => role === "admin" || role === "operator")) {
      throw failure("Identity enumeration authorization requires operator or admin role", 403);
    }
    const activeAuthorized = !upload
      && "activeAuthorization" in values
      && values.activeAuthorization === true;
    if (activeAuthorized && !ctx.principal.roles.some((role) => role === "admin" || role === "operator")) {
      throw failure("Active public-site crawl authorization requires operator or admin role", 403);
    }

    const classification = upload
      ? { targetType: "image" as const, normalizedTarget: "Uploaded image", searchUniverse: "universal" as const }
      : classifyTarget(values.target, values.targetType, values.searchUniverse);
    const metadata = upload ? await analyzeImage(upload.bytes, upload.type) : undefined;
    const now = Date.now();
    const plannedAdapters = planInvestigation(
      classification.normalizedTarget,
      classification.targetType,
      {
        identityAuthorized,
        activeAuthorized,
        searchUniverse: values.searchUniverse,
        investigationMode: values.investigationMode,
        sourcePolicy: values.sourcePolicy,
        jurisdiction: values.jurisdiction,
        timeRange: values.timeRange,
        selectedToolIds: values.selectedToolIds,
      },
    );

    const value: TemporaryInvestigation = {
      investigationId: randomUUID(),
      revision: 0,
      ownerId: ctx.principal.userId,
      target: values.target,
      normalizedTarget: classification.normalizedTarget,
      targetType: classification.targetType,
      searchUniverse: values.searchUniverse,
      investigationMode: values.investigationMode,
      sourcePolicy: values.sourcePolicy,
      jurisdiction: values.jurisdiction,
      timeRange: values.timeRange,
      selectedToolIds: values.selectedToolIds,
      identityAuthorization: identityAuthorized,
      activeAuthorization: activeAuthorized,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 15 * 60_000).toISOString(),
      plannedAdapters,
      runs: plannedAdapters.map((plan) => ({
        adapterId: plan.adapterId,
        sourceName: plan.sourceName,
        status: plan.initialStatus ?? "QUEUED",
        evidenceCount: 0,
        warnings: plan.initialStatus ? [plan.reason] : [],
      })),
      status: plannedAdapters.some((plan) => !plan.initialStatus) ? "QUEUED" : "COMPLETED",
      evidence: [],
      candidateClusters: [],
      edges: [],
      rankedFindings: [],
      timeline: [],
      markers: [],
      contradictions: [],
      corroborations: [],
    };

    if (metadata) {
      const evidenceId = randomUUID();
      const contentHash = createHash("sha256").update(JSON.stringify(metadata)).digest("hex");
      value.evidence.push({
        evidenceId,
        sourceId: "uploaded-image",
        sourceName: "Uploaded image · local analysis",
        adapterId: "image-metadata",
        retrievedAt: value.createdAt,
        summary: `${metadata.width} × ${metadata.height} ${metadata.format.toUpperCase()} · image metadata`,
        contentHash,
        provenanceHash: createHash("sha256").update(`${evidenceId}:${metadata.sha256}:${value.createdAt}`).digest("hex"),
        corroborationState: "unverified",
        contradictionState: "not_assessed",
        fields: { ...metadata },
      });
      value.runs.unshift({
        adapterId: "image-metadata",
        sourceName: "Image metadata",
        status: "COMPLETED",
        evidenceCount: 1,
        warnings: ["Image metadata is not identity evidence. Embedded timestamps are unverified."],
      });
      value.edges.push({
        id: randomUUID(),
        sourceId: evidenceId,
        targetId: "image-metadata",
        type: "DERIVED_FROM",
        evidenceId,
      });
    }

    const insights = executeIntelligencePipeline(value);
    value.rankedFindings = insights.rankedFindings;
    value.timeline = insights.timeline;
    value.markers = insights.markers;
    value.contradictions = insights.contradictions;
    value.corroborations = insights.corroborations;

    await this.store.create(value, upload?.bytes);
    await this.log({
      requestId: ctx.requestId,
      userId: ctx.principal.userId,
      action: "investigation.started",
      resource: value.investigationId,
      outcome: "success",
      metadata: {
        targetClass: value.targetType,
        searchUniverse: value.searchUniverse,
        investigationMode: value.investigationMode,
        startTime: value.createdAt,
        expiresAt: value.expiresAt,
        identityAuthorized,
        activeAuthorized,
        adapters: value.runs.map((run) => run.adapterId),
      },
    });

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

      // In-request inline runs interrupted previously are cleaned up
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
          // While the Astra job is still running, also process any remaining inline (non-Astra) queued adapters
          const inlineQueued = value.runs.filter(
            (item) => item.status === "QUEUED" && !this.astra.isAdapter(item.adapterId),
          );
          if (inlineQueued.length === 0) {
            await sleep(350);
            skipFinalSave = true;
            return publicInvestigation(value);
          }
          // Fall through to process inline batch below
          run = undefined; // clear so we don't double-apply
        } else {
          applyResult(value, run, plan, polled.result);
          run.endedAt = new Date().toISOString();
        }
      }

      // Process inline queued adapters (when no Astra job is blocking OR while Astra is pending)
      if (!external?.externalRunId || (external?.externalRunId && run === undefined)) {
        const queuedRuns = value.runs.filter((item) => item.status === "QUEUED");
        if (queuedRuns.length === 0 && !value.runs.some(r => r.status === "RUNNING" && r.externalRunId)) {
          const insights = executeIntelligencePipeline(value);
          value.rankedFindings = insights.rankedFindings;
          value.timeline = insights.timeline;
          value.markers = insights.markers;
          value.contradictions = insights.contradictions;
          value.corroborations = insights.corroborations;
          value.edges = insights.edges;
          value.status = "COMPLETED";
          await this.save(value);
          skipFinalSave = true;
          return publicInvestigation(value);
        }

        const firstQueued = queuedRuns[0];
        if (!firstQueued) {
          // Only Astra jobs remain in queue — wait for them
          await sleep(350);
          skipFinalSave = true;
          return publicInvestigation(value);
        }
        const planFirst = value.plannedAdapters.find((item) => item.adapterId === firstQueued.adapterId);
        if (!planFirst) throw failure("Investigation source plan is missing", 500);

        if (this.astra.isAdapter(planFirst.adapterId)) {
          run = firstQueued;
          value.status = "RUNNING";
          firstQueued.status = "RUNNING";
          firstQueued.startedAt = new Date().toISOString();
          firstQueued.externalRunId = await this.astra.enqueue(planFirst, ctx.principal.userId, id);
          if (!await this.save(value)) {
            await this.astra.cleanup(id, ctx.principal.userId);
            throw failure("Investigation closed", 409);
          }
          skipFinalSave = true;
          return publicInvestigation(value);
        }

        // Bounded concurrency for inline queued adapters (up to 3) (Bug 17)
        const batch = queuedRuns.slice(0, 3).filter((item) => !this.astra.isAdapter(item.adapterId));
        value.status = "RUNNING";
        for (const item of batch) {
          item.status = "RUNNING";
          item.startedAt = new Date().toISOString();
        }
        if (!await this.save(value)) throw failure("Investigation closed", 409);

        const signal = AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(Math.max(1, Math.min(24_000, Date.parse(value.expiresAt) - Date.now()))),
          ...(requestSignal ? [requestSignal] : []),
        ]);
        const image = value.targetType === "image" ? await this.store.image(id) : null;

        try {
          await Promise.all(
            batch.map(async (batchRun) => {
              const plan = value!.plannedAdapters.find((item) => item.adapterId === batchRun.adapterId);
              if (!plan) return;
              const providerLimit = plan.adapterId === "public-nvd-cve" ? 5 : plan.adapterId === "passive-shodan" ? 10 : 25;
              if (!await this.store.budget(`provider:${plan.adapterId}`, providerLimit)) {
                Object.assign(batchRun, {
                  status: "RATE_LIMITED",
                  error: "Shared provider request limit reached",
                  endedAt: new Date().toISOString(),
                });
                return;
              }
              try {
                const result = await this.execute(plan, ctx.principal.userId, id, signal, image);
                if (signal.aborted || await this.store.stopped(id)) throw failure("Investigation stopped", 409);
                applyResult(value!, batchRun, plan, result);
              } catch (err) {
                Object.assign(batchRun, runFailure(err instanceof Error ? err.message : "provider_failed"));
              } finally {
                batchRun.endedAt = new Date().toISOString();
              }
            }),
          );
        } finally {
          image?.fill(0);
        }
      }

      const insights = executeIntelligencePipeline(value);
      value.rankedFindings = insights.rankedFindings;
      value.timeline = insights.timeline;
      value.markers = insights.markers;
      value.contradictions = insights.contradictions;
      value.corroborations = insights.corroborations;
      value.edges = insights.edges;

    } catch (error) {
      if (!value) throw error;
      if (run) {
        Object.assign(run, runFailure(error instanceof Error ? error.message : "provider_failed"), { endedAt: new Date().toISOString() });
      }
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
    await this.log({
      requestId: ctx.requestId,
      userId: ctx.principal.userId,
      action: "investigation.closed",
      resource: id,
      outcome: "success",
      metadata: {
        targetClass: value?.targetType,
        startTime: value?.createdAt,
        closeTime: new Date().toISOString(),
        runs: (value?.runs ?? []).map((item) => ({
          adapterId: item.adapterId,
          status: item.status === "RUNNING" || item.status === "QUEUED" ? "SKIPPED" : item.status,
        })),
      },
    });
    return { investigationId: id, status: "CLOSED" as const, cleanupConfirmed: true };
  }
}

export const investigations = new InvestigationService();
