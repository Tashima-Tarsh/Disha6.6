import { afterEach, describe, expect, it, vi } from "vitest";

import type { InvestigationStore, TemporaryInvestigation } from "../lib/server/investigation-store";
import type { AdapterPlan } from "../lib/investigation/types";
import type { Astra6InvestigationBridge } from "../lib/unified/astra6-investigation-bridge";
import type { AdapterExecutionResult } from "../lib/unified/osint-adapter-bus";
import type { RequestContext } from "../lib/server/types";
import { InvestigationService } from "../services/investigation/service";

const ctx: RequestContext = {
  requestId: "astra-investigation-test",
  principal: { userId: "owner-1", email: "owner@example.com", roles: ["operator"] },
};

class MemoryStore implements InvestigationStore {
  states = new Map<string, TemporaryInvestigation>();
  locks = new Map<string, string>();
  stops = new Set<string>();

  async create(value: TemporaryInvestigation) {
    this.states.set(value.investigationId, structuredClone(value));
  }

  async authorized(id: string, owner: string) {
    return this.states.get(id)?.ownerId === owner;
  }

  async read(id: string) {
    const value = this.states.get(id);
    return value ? structuredClone(value) : null;
  }

  async save(value: TemporaryInvestigation) {
    if (!this.states.has(value.investigationId) || this.stops.has(value.investigationId)) return false;
    this.states.set(value.investigationId, structuredClone(value));
    return true;
  }

  async image() {
    return null;
  }

  async acquire(id: string) {
    if (this.locks.has(id) || this.stops.has(id)) return null;
    const token = "lease";
    this.locks.set(id, token);
    return token;
  }

  async release(id: string) {
    this.locks.delete(id);
  }

  async busy(id: string) {
    return this.locks.has(id);
  }

  async stop(id: string) {
    this.stops.add(id);
  }

  async stopped(id: string) {
    return this.stops.has(id);
  }

  async remove(id: string) {
    this.states.delete(id);
  }

  async budget() {
    return true;
  }
}

const emptyPublicResult = (plan: AdapterPlan): AdapterExecutionResult<unknown> => ({
  adapterId: plan.adapterId,
  status: "completed",
  data: { articles: [], records: [] },
  evidence: [{
    id: "public-summary",
    sourceId: plan.adapterId,
    sourceName: plan.sourceName,
    summary: "Lookup completed",
    retrievedAt: "2026-10-06T00:00:00.000Z",
    provenanceHash: "public-provenance",
  }],
  warnings: [],
  attempts: 1,
  durationMs: 5,
});

afterEach(() => vi.unstubAllEnvs());

describe("ASTRA investigation lifecycle", () => {
  it("enqueues, polls and normalizes a configured PhoneInfoga worker result", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://configured");
    vi.stubEnv("DISHA_ASTRA6_PHONEINFOGA_ENABLED", "true");
    vi.stubEnv("DISHA_ASTRA6_SPIDERFOOT_ENABLED", "");
    vi.stubEnv("DISHA_IDENTITY_ENUMERATION_APPROVED", "true");
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "");

    const store = new MemoryStore();
    const execute = vi.fn(async (plan: AdapterPlan) => emptyPublicResult(plan));
    const log = vi.fn(async () => {});
    let pollCount = 0;

    const astra: Astra6InvestigationBridge = {
      isAdapter: adapterId => adapterId.startsWith("astra6-"),
      enqueue: vi.fn(async (_plan, _userId, _investigationId) => "worker-run-1"),
      poll: vi.fn(async () => {
        pollCount += 1;
        if (pollCount === 1) return { pending: true as const, status: "running" as const };
        return {
          pending: false as const,
          status: "completed",
          result: {
            adapterId: "astra6-phoneinfoga",
            status: "completed" as const,
            data: {
              number: "+919876543210",
              valid: true,
              carrier: "Example Carrier",
              country: "IN",
              lineType: "mobile",
              reputation: [],
            },
            evidence: [{
              id: "phoneinfoga-summary",
              sourceId: "phoneinfoga",
              sourceName: "PhoneInfoga",
              summary: "Phone scan completed",
              retrievedAt: "2026-10-06T00:00:00.000Z",
              provenanceHash: "phone-provenance",
            }],
            warnings: [],
            attempts: 1,
            durationMs: 20,
          },
        };
      }),
      cleanup: vi.fn(async () => {}),
    };

    const service = new InvestigationService(store, execute, log, astra);
    const created = await service.create({
      target: "+919876543210",
      targetType: "phone",
      identityAuthorization: true,
    }, ctx);

    expect(created.runs.find(run => run.adapterId === "astra6-phoneinfoga")?.status).toBe("QUEUED");

    const afterPublic = await service.advance(created.investigationId, ctx);
    expect(afterPublic.runs.find(run => run.adapterId === "public-gdelt-news")?.status).toBe("NO_RESULTS");

    const afterEnqueue = await service.advance(created.investigationId, ctx);
    expect(afterEnqueue.runs.find(run => run.adapterId === "astra6-phoneinfoga")).toMatchObject({
      status: "RUNNING",
      externalRunId: "worker-run-1",
    });
    expect(astra.enqueue).toHaveBeenCalledOnce();

    const whileRunning = await service.advance(created.investigationId, ctx);
    expect(whileRunning.runs.find(run => run.adapterId === "astra6-phoneinfoga")?.status).toBe("RUNNING");

    const completed = await service.advance(created.investigationId, ctx);
    expect(completed.runs.find(run => run.adapterId === "astra6-phoneinfoga")).toMatchObject({
      status: "COMPLETED",
      evidenceCount: 1,
    });
    expect(completed.evidence).toHaveLength(1);
    expect(completed.evidence[0]).toMatchObject({
      adapterId: "astra6-phoneinfoga",
      sourceName: "PhoneInfoga",
    });
    expect(completed.evidence[0].fields).toMatchObject({
      carrier: "Example Carrier",
      country: "IN",
      valid: true,
    });

    await service.close(created.investigationId, ctx);
    expect(astra.cleanup).toHaveBeenCalledWith(created.investigationId, ctx.principal.userId);
  });
});
