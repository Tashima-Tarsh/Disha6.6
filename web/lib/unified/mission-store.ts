import crypto from "node:crypto";
import type { Pool, PoolClient } from "pg";

import { getDbPool } from "../server/db";
import { hashValue } from "./hash";
import type { MissionResult } from "./orchestrator";

export type MissionLifecycleStatus = "received" | "analyzing" | "awaiting_approval" | "completed" | "denied" | "escalated" | "failed";

export type MissionApprovalRecord = {
  approvalId: string;
  missionId: string;
  approvalType: string;
  requestedRoles: string[];
  status: "pending" | "approved" | "rejected" | "expired" | "cancelled";
  requestedBy: string;
  resolvedBy?: string;
  reason?: string;
  evidenceEventId?: string;
  requestedAt: string;
  resolvedAt?: string;
};

type MissionStore = {
  save(result: MissionResult): Promise<void>;
  get(missionId: string): Promise<MissionResult | null>;
  clearForTests(): Promise<void>;
};

class MemoryMissionStore implements MissionStore {
  private readonly missions = new Map<string, MissionResult>();

  async save(result: MissionResult): Promise<void> {
    this.missions.set(result.missionId, structuredClone(result));
  }

  async get(missionId: string): Promise<MissionResult | null> {
    const result = this.missions.get(missionId);
    return result ? structuredClone(result) : null;
  }

  async clearForTests(): Promise<void> {
    this.missions.clear();
  }
}

class PostgresMissionStore implements MissionStore {
  constructor(private readonly pool: Pool) {}

  async save(result: MissionResult): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await persistMissionLifecycle(client, result);
      await persistMissionSnapshot(client, result);
      await persistApprovalRequest(client, result);
      await persistFinalMissionResult(client, result);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async get(missionId: string): Promise<MissionResult | null> {
    const row = await this.pool.query<{ result: MissionResult | string; result_hash: string }>(
      "select result, result_hash from mission_results where mission_id = $1 limit 1",
      [missionId],
    );
    const found = row.rows[0];
    if (!found) return null;

    const result = typeof found.result === "string" ? JSON.parse(found.result) as MissionResult : found.result;
    if (hashValue(result) !== found.result_hash) {
      throw new Error(`Stored mission result hash mismatch for ${missionId}`);
    }
    return result;
  }

  async clearForTests(): Promise<void> {
    await this.pool.query("truncate table mission_approvals, mission_results, missions cascade");
  }
}

const memoryMissionStore = new MemoryMissionStore();
let overrideStore: MissionStore | null = null;

export async function saveMissionResult(result: MissionResult): Promise<void> {
  await getMissionStore().save(result);
}

export async function getMissionResult(missionId: string): Promise<MissionResult | null> {
  return getMissionStore().get(missionId);
}

export async function recordMissionApproval(input: {
  missionId: string;
  approvalType: string;
  requestedRoles: string[];
  status: MissionApprovalRecord["status"];
  requestedBy: string;
  resolvedBy?: string;
  reason?: string;
  evidenceEventId?: string;
}): Promise<MissionApprovalRecord> {
  const now = new Date().toISOString();
  const record: MissionApprovalRecord = {
    approvalId: crypto.randomUUID(),
    missionId: input.missionId,
    approvalType: input.approvalType,
    requestedRoles: input.requestedRoles,
    status: input.status,
    requestedBy: input.requestedBy,
    resolvedBy: input.resolvedBy,
    reason: input.reason,
    evidenceEventId: input.evidenceEventId,
    requestedAt: now,
    resolvedAt: input.status === "pending" ? undefined : now,
  };
  const pool = getDbPool();
  if (!pool) return record;
  await pool.query(
    `insert into mission_approvals (
      approval_id, mission_id, approval_type, requested_roles, status, requested_by,
      resolved_by, reason, evidence_event_id, requested_at, resolved_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [record.approvalId, record.missionId, record.approvalType, record.requestedRoles, record.status, record.requestedBy, record.resolvedBy ?? null, record.reason ?? null, record.evidenceEventId ?? null, record.requestedAt, record.resolvedAt ?? null],
  );
  return record;
}

export function useMissionStoreForTests(store: MissionStore | null): void {
  overrideStore = store;
}

export async function clearMissionStoreForTests(): Promise<void> {
  await getMissionStore().clearForTests();
}

function getMissionStore(): MissionStore {
  if (overrideStore) return overrideStore;
  const pool = getDbPool();
  if (pool) return new PostgresMissionStore(pool);
  return memoryMissionStore;
}

async function persistMissionLifecycle(client: PoolClient, result: MissionResult): Promise<void> {
  const status = lifecycleStatus(result);
  await client.query(
    `insert into missions (
      mission_id, user_id, status, raw_input, normalized_signal, current_policy_decision,
      current_risk_score, evidence_event_ids, created_at, updated_at, completed_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,now(),now(),$9)
    on conflict (mission_id) do update set
      user_id = excluded.user_id,
      status = excluded.status,
      normalized_signal = excluded.normalized_signal,
      current_policy_decision = excluded.current_policy_decision,
      current_risk_score = excluded.current_risk_score,
      evidence_event_ids = excluded.evidence_event_ids,
      updated_at = now(),
      completed_at = excluded.completed_at`,
    [
      result.missionId,
      result.signal.userId,
      status,
      JSON.stringify(result.signal.input),
      JSON.stringify(result.signal),
      JSON.stringify(result.policyDecision),
      result.riskScore,
      result.evidenceEventIds,
      status === "awaiting_approval" ? null : new Date().toISOString(),
    ],
  );
}

async function persistMissionSnapshot(client: PoolClient, result: MissionResult): Promise<void> {
  const snapshot = {
    missionId: result.missionId,
    stage: "final_analysis",
    selectedLenses: result.selectedLenses,
    lensResults: result.lensResults,
    fusedIntelligence: result.fusedIntelligence,
    policyDecision: result.policyDecision,
    evidenceEventIds: result.evidenceEventIds,
  };
  const snapshotHash = hashValue(snapshot);
  await client.query(
    `insert into mission_analysis_snapshots (
      snapshot_id, mission_id, stage, selected_lenses, lens_results, fused_intelligence,
      policy_decision, evidence_event_ids, snapshot_hash, created_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
    on conflict (snapshot_hash) do nothing`,
    [snapshotHash.slice(0, 24), result.missionId, snapshot.stage, result.selectedLenses, JSON.stringify(result.lensResults), JSON.stringify(result.fusedIntelligence), JSON.stringify(result.policyDecision), result.evidenceEventIds, snapshotHash],
  );
}

async function persistApprovalRequest(client: PoolClient, result: MissionResult): Promise<void> {
  if (!result.approvalRequired) return;
  const evidenceEventId = result.policyDecision.evidenceEventId;
  const requestedRoles = result.policyDecision.requiredApprovals ?? ["operator"];
  const fingerprint = hashValue({ missionId: result.missionId, decision: result.policyDecision.decision, requestedRoles, evidenceEventId });
  await client.query(
    `insert into mission_approvals (
      approval_id, mission_id, approval_type, requested_roles, status, requested_by,
      reason, evidence_event_id, requested_at
    ) values ($1,$2,$3,$4,'pending',$5,$6,$7,now())
    on conflict (approval_id) do nothing`,
    [fingerprint.slice(0, 24), result.missionId, result.policyDecision.decision, requestedRoles, "policy-gate", result.policyDecision.reasons.join("; "), evidenceEventId ?? null],
  );
}

async function persistFinalMissionResult(client: PoolClient, result: MissionResult): Promise<void> {
  await client.query(
    `insert into mission_results (
      mission_id, user_id, policy_decision, safe_execution, risk_score, selected_lenses,
      evidence_event_ids, result, result_hash, created_at, updated_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())
    on conflict (mission_id) do update set
      user_id = excluded.user_id,
      policy_decision = excluded.policy_decision,
      safe_execution = excluded.safe_execution,
      risk_score = excluded.risk_score,
      selected_lenses = excluded.selected_lenses,
      evidence_event_ids = excluded.evidence_event_ids,
      result = excluded.result,
      result_hash = excluded.result_hash,
      updated_at = now()`,
    [result.missionId, result.signal.userId, result.policyDecision.decision, result.safeExecution, result.riskScore, result.selectedLenses, result.evidenceEventIds, JSON.stringify(result), hashValue(result)],
  );
}

function lifecycleStatus(result: MissionResult): MissionLifecycleStatus {
  if (result.policyDecision.decision === "DENY") return "denied";
  if (result.policyDecision.decision === "ESCALATE") return "escalated";
  if (result.approvalRequired) return "awaiting_approval";
  return "completed";
}
