import { hashValue } from "./hash";
import { getDbPool } from "../server/db";
import {
  type EvidenceLifecycleState,
  type DISHAStateTransition,
  dishaStateTransitionSchema,
} from "./canonical/types";

const ALLOWED_TRANSITIONS: Record<EvidenceLifecycleState, readonly EvidenceLifecycleState[]> = {
  RAW: ["OBSERVED", "REJECTED"],
  OBSERVED: ["EXTRACTED", "REJECTED", "SUPERSEDED"],
  EXTRACTED: ["NORMALIZED", "REJECTED", "SUPERSEDED"],
  NORMALIZED: ["ADMITTED", "REJECTED", "SUPERSEDED"],
  ADMITTED: ["CORROBORATED", "REVIEW_REQUIRED", "DISPUTED", "REJECTED", "SUPERSEDED"],
  CORROBORATED: ["REVIEW_REQUIRED", "DISPUTED", "SUPERSEDED"],
  REVIEW_REQUIRED: ["VERIFIED", "DISPUTED", "REJECTED", "SUPERSEDED"],
  VERIFIED: ["DISPUTED", "SUPERSEDED"],
  DISPUTED: ["REVIEW_REQUIRED", "REJECTED", "SUPERSEDED"],
  REJECTED: [],
  SUPERSEDED: [],
};

const memoryTransitions = new Map<string, DISHAStateTransition[]>();

export type StateTransitionRequest = {
  targetType: "evidence" | "claim" | "observation";
  targetId: string;
  currentState: EvidenceLifecycleState;
  targetState: EvidenceLifecycleState;
  actor: string;
  isAiActor: boolean;
  reason: string;
  policyVersion?: string;
  evidenceRefs?: string[];
  missionId?: string;
  executionId?: string;
};

export class EvidenceStateMachine {
  static canTransition(from: EvidenceLifecycleState, to: EvidenceLifecycleState): boolean {
    const allowed = ALLOWED_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  static async transition(req: StateTransitionRequest): Promise<DISHAStateTransition> {
    if (!this.canTransition(req.currentState, req.targetState)) {
      throw new Error(
        `Invalid state transition: cannot transition from ${req.currentState} to ${req.targetState}`,
      );
    }

    if (req.targetState === "VERIFIED" && req.isAiActor) {
      throw new Error(
        "Constitutional Violation: AI agent may never directly assign VERIFIED state. Evidence verification requires human analyst authorization or constitutional policy verdict.",
      );
    }

    const timestamp = new Date().toISOString();
    const transitionId = `trans_${hashValue(`${req.targetId}_${req.currentState}_${req.targetState}_${timestamp}`).slice(0, 16)}`;

    const payloadToHash = {
      transitionId,
      targetType: req.targetType,
      targetId: req.targetId,
      previousState: req.currentState,
      newState: req.targetState,
      actor: req.actor,
      isAiActor: req.isAiActor,
      reason: req.reason,
      timestamp,
      policyVersion: req.policyVersion ?? "6.6.0",
      evidenceRefs: req.evidenceRefs ?? [],
      missionId: req.missionId,
      executionId: req.executionId,
    };

    const transitionHash = hashValue(payloadToHash);

    const transition: DISHAStateTransition = dishaStateTransitionSchema.parse({
      ...payloadToHash,
      transitionHash,
    });

    const pool = getDbPool();
    if (!pool) {
      const list = memoryTransitions.get(req.targetId) ?? [];
      list.push(transition);
      memoryTransitions.set(req.targetId, list);
      return transition;
    }

    try {
      await pool.query(
        `insert into disha_state_transitions
          (transition_id, target_type, target_id, previous_state, new_state, actor, is_ai_actor, reason, policy_version, evidence_refs, mission_id, execution_id, transition_hash, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14)`,
        [
          transition.transitionId,
          transition.targetType,
          transition.targetId,
          transition.previousState,
          transition.newState,
          transition.actor,
          transition.isAiActor,
          transition.reason,
          transition.policyVersion,
          JSON.stringify(transition.evidenceRefs),
          transition.missionId ?? null,
          transition.executionId ?? null,
          transition.transitionHash,
          transition.timestamp,
        ],
      );
    } catch {
      const list = memoryTransitions.get(req.targetId) ?? [];
      list.push(transition);
      memoryTransitions.set(req.targetId, list);
    }

    return transition;
  }

  static async getHistory(targetId: string): Promise<DISHAStateTransition[]> {
    const pool = getDbPool();
    if (!pool) {
      return [...(memoryTransitions.get(targetId) ?? [])];
    }

    try {
      const res = await pool.query<{
        transition_id: string;
        target_type: "evidence" | "claim" | "observation";
        target_id: string;
        previous_state: EvidenceLifecycleState;
        new_state: EvidenceLifecycleState;
        actor: string;
        is_ai_actor: boolean;
        reason: string;
        policy_version: string;
        evidence_refs: string[];
        mission_id: string | null;
        execution_id: string | null;
        transition_hash: string;
        created_at: Date;
      }>(
        "select * from disha_state_transitions where target_id = $1 order by created_at asc",
        [targetId],
      );

      return res.rows.map((r) => ({
        transitionId: r.transition_id,
        targetType: r.target_type,
        targetId: r.target_id,
        previousState: r.previous_state,
        newState: r.new_state,
        actor: r.actor,
        isAiActor: r.is_ai_actor,
        reason: r.reason,
        timestamp: r.created_at.toISOString(),
        policyVersion: r.policy_version,
        evidenceRefs: r.evidence_refs,
        missionId: r.mission_id ?? undefined,
        executionId: r.execution_id ?? undefined,
        transitionHash: r.transition_hash,
      }));
    } catch {
      return [...(memoryTransitions.get(targetId) ?? [])];
    }
  }

  static clearMemoryForTests(): void {
    memoryTransitions.clear();
  }
}
