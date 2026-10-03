import { hashValue } from "./hash";

export type WorkerJobState =
  | "QUEUED"
  | "LEASED"
  | "RUNNING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED"
  | "TIMED_OUT"
  | "CANCELLED"
  | "POLICY_BLOCKED"
  | "AUTH_REQUIRED"
  | "NOT_CONFIGURED"
  | "RATE_LIMITED";

export type WorkerJob = {
  jobId: string;
  missionId: string;
  toolId: string;
  target: string;
  targetType: string;
  state: WorkerJobState;
  workerId?: string;
  workerClass: "identity" | "infrastructure" | "document" | "cti";
  leaseExpiresAt?: string;
  attempts: number;
  maxAttempts: number;
  correlationId: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  rawOutputRef?: string;
  observationCount: number;
};

export type WorkerHeartbeat = {
  workerId: string;
  workerClass: string;
  hostname: string;
  activeJobs: number;
  memoryUsageMb: number;
  cpuPercent: number;
  lastHeartbeat: string;
  status: "HEALTHY" | "DEGRADED" | "DRAINING";
};

// Computes deterministic idempotency key for deduplication (Task 13)
export function computeJobIdempotencyKey(missionId: string, toolId: string, target: string): string {
  return hashValue({ missionId, toolId, target: target.trim().toLowerCase() });
}

// Leases a job to an active worker, enforcing lease duration (e.g. 120 seconds)
export function leaseJob(job: WorkerJob, workerId: string, leaseDurationSec = 120): WorkerJob {
  if (job.state !== "QUEUED" && job.state !== "TIMED_OUT") {
    throw new Error(`cannot_lease_job_in_state_${job.state}`);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + leaseDurationSec * 1000).toISOString();

  return {
    ...job,
    state: "LEASED",
    workerId,
    attempts: job.attempts + 1,
    leaseExpiresAt: expiresAt,
    updatedAt: now.toISOString(),
  };
}

// Recovers abandoned jobs whose lease has expired without completion
export function recoverAbandonedJob(job: WorkerJob, now = new Date()): WorkerJob {
  if (job.state !== "LEASED" && job.state !== "RUNNING") {
    return job;
  }

  if (!job.leaseExpiresAt || new Date(job.leaseExpiresAt) > now) {
    return job; // lease still valid
  }

  if (job.attempts >= job.maxAttempts) {
    return {
      ...job,
      state: "FAILED",
      error: `Job abandoned by worker ${job.workerId ?? "unknown"} and exceeded max attempts (${job.maxAttempts}). Moved to dead letter.`,
      updatedAt: now.toISOString(),
    };
  }

  return {
    ...job,
    state: "QUEUED",
    workerId: undefined,
    leaseExpiresAt: undefined,
    updatedAt: now.toISOString(),
  };
}
