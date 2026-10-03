import { describe, expect, it } from "vitest";
import {
  computeJobIdempotencyKey,
  leaseJob,
  recoverAbandonedJob,
  type WorkerJob,
} from "../lib/unified/worker-queue-manager";

describe("Worker Queue Manager", () => {
  const baseJob: WorkerJob = {
    jobId: "job-101",
    missionId: "mission-999",
    toolId: "subfinder",
    target: "cert-in.org.in",
    targetType: "domain",
    state: "QUEUED",
    workerClass: "infrastructure",
    attempts: 0,
    maxAttempts: 3,
    correlationId: "corr-123",
    idempotencyKey: computeJobIdempotencyKey("mission-999", "subfinder", "cert-in.org.in"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    observationCount: 0,
  };

  it("computes deterministic idempotency keys", () => {
    const key1 = computeJobIdempotencyKey("m1", "phoneinfoga", "+919876543210");
    const key2 = computeJobIdempotencyKey("m1", "phoneinfoga", "+919876543210");
    const key3 = computeJobIdempotencyKey("m2", "phoneinfoga", "+919876543210");

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
  });

  it("leases queued jobs with an expiration timestamp and increments attempts", () => {
    const leased = leaseJob(baseJob, "worker-node-alpha", 60);

    expect(leased.state).toBe("LEASED");
    expect(leased.workerId).toBe("worker-node-alpha");
    expect(leased.attempts).toBe(1);
    expect(leased.leaseExpiresAt).toBeDefined();
  });

  it("does not allow leasing jobs that are already RUNNING or COMPLETED", () => {
    const runningJob: WorkerJob = { ...baseJob, state: "RUNNING" };
    expect(() => leaseJob(runningJob, "worker-2")).toThrow("cannot_lease_job_in_state_RUNNING");
  });

  it("recovers abandoned jobs when lease has expired and re-queues them", () => {
    const past = new Date(Date.now() - 10000).toISOString();
    const expiredJob: WorkerJob = {
      ...baseJob,
      state: "LEASED",
      workerId: "crashed-worker",
      attempts: 1,
      leaseExpiresAt: past,
    };

    const recovered = recoverAbandonedJob(expiredJob);
    expect(recovered.state).toBe("QUEUED");
    expect(recovered.workerId).toBeUndefined();
    expect(recovered.leaseExpiresAt).toBeUndefined();
  });

  it("moves repeatedly abandoned jobs to FAILED dead letter once maxAttempts reached", () => {
    const past = new Date(Date.now() - 10000).toISOString();
    const deadJob: WorkerJob = {
      ...baseJob,
      state: "LEASED",
      workerId: "crashed-worker",
      attempts: 3,
      maxAttempts: 3,
      leaseExpiresAt: past,
    };

    const failed = recoverAbandonedJob(deadJob);
    expect(failed.state).toBe("FAILED");
    expect(failed.error).toContain("exceeded max attempts");
  });
});
