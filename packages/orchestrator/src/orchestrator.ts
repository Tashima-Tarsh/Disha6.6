/**
 * Constitutional Orchestrator
 *
 * The single place that wires:
 *   Adapter Bus → Evidence Ledger → Mission → Human Review
 *
 * No other code path should call adapters or write findings directly.
 */

import type { Actor, CanonicalInput, EvidenceEvent, VerificationState } from "@disha/contracts";
import { AdapterBus } from "@disha/adapter-bus";
import { EvidenceLedger, InMemoryEvidenceStore } from "@disha/evidence-ledger";
import { MissionEngine } from "@disha/mission";
import { ReviewQueue } from "@disha/review";
import type { Mission } from "@disha/mission";

export interface OrchestratorConfig {
  /** Optional pre-built stores for testing or persistence */
  ledger?: EvidenceLedger;
  bus?: AdapterBus;
  missions?: MissionEngine;
  reviews?: ReviewQueue;
}

export interface RunAdaptersInput {
  missionId: string;
  adapterIds: string[];
  input: CanonicalInput;
  actor: Actor;
}

export interface RunAdaptersResult {
  mission: Mission;
  evidenceEvents: EvidenceEvent[];
  busResult: Awaited<ReturnType<AdapterBus["execute"]>>;
  reviewItemsCreated: number;
}

export class ConstitutionalOrchestrator {
  readonly bus: AdapterBus;
  readonly ledger: EvidenceLedger;
  readonly missions: MissionEngine;
  readonly reviews: ReviewQueue;

  constructor(config: OrchestratorConfig = {}) {
    this.bus = config.bus ?? new AdapterBus();
    this.ledger =
      config.ledger ?? new EvidenceLedger(new InMemoryEvidenceStore());
    this.missions = config.missions ?? new MissionEngine();
    this.reviews = config.reviews ?? new ReviewQueue();
  }

  /** Register a governed adapter with the Bus */
  registerAdapter(adapter: Parameters<AdapterBus["register"]>[0]): void {
    this.bus.register(adapter);
  }

  /** Create a new mission (starts in draft) */
  createMission(title: string, actor: Actor, description?: string): Mission {
    return this.missions.create({ title, description, createdBy: actor });
  }

  /** Activate a mission so work can begin */
  activateMission(missionId: string, actor: Actor): Mission {
    return this.missions.transition(missionId, "active", actor, "Mission activated");
  }

  /**
   * Execute adapters for a mission.
   * Every observation is written to the Ledger.
   * Anything not already VERIFIED is enqueued for human review.
   */
  async runAdapters(input: RunAdaptersInput): Promise<RunAdaptersResult> {
    const mission = this.missions.get(input.missionId);
    if (!mission) throw new Error(`Mission not found: ${input.missionId}`);
    if (mission.state !== "active" && mission.state !== "under_review") {
      throw new Error(`Mission must be active or under_review (current: ${mission.state})`);
    }

    const busResult = await this.bus.execute({
      adapterIds: input.adapterIds,
      input: input.input,
      context: {
        missionId: input.missionId,
        actor: input.actor,
      },
    });

    const evidenceEvents: EvidenceEvent[] = [];
    let reviewItemsCreated = 0;

    for (const ev of busResult.evidenceEvents) {
      // Re-append through the Ledger so hash chain is authoritative
      const { event } = await this.ledger.append({
        actor: ev.actor,
        type: ev.type,
        payload: ev.payload,
        sources: ev.sources,
        verification: ev.verification,
        policyContext: ev.policyContext,
        missionId: input.missionId,
        caseId: ev.caseId,
      });

      evidenceEvents.push(event);
      this.missions.attachEvidence(input.missionId, event.id);

      // Only human review can create VERIFIED
      if (event.verification !== "VERIFIED" && event.verification !== "REJECTED") {
        this.reviews.enqueue(event);
        reviewItemsCreated += 1;
      }
    }

    return {
      mission: this.missions.get(input.missionId)!,
      evidenceEvents,
      busResult,
      reviewItemsCreated,
    };
  }

  /**
   * Human review decision.
   * This is the ONLY path that can produce a VERIFIED finding.
   * Returns the original evidence event ID (not the review-item ID).
   */
  async review(
    reviewItemId: string,
    decision: "elevate_verified" | "reject" | "request_more" | "keep",
    actor: Actor,
    notes?: string
  ): Promise<{ newVerification: VerificationState; evidenceId: string }> {
    const item = this.reviews.getById(reviewItemId);
    if (!item) {
      throw new Error(`Review item not found: ${reviewItemId}`);
    }
    if (item.status !== "pending") {
      throw new Error(`Review item already completed: ${reviewItemId}`);
    }
    const originalEvidenceId = item.evidenceId;

    const { newVerification } = this.reviews.decide(
      reviewItemId,
      decision,
      actor,
      notes
    );

    await this.ledger.append({
      actor,
      type: decision === "elevate_verified" ? "approval" : decision === "reject" ? "rejection" : "policy_decision",
      payload: {
        reviewItemId,
        decision,
        notes,
        linkedEvidenceId: originalEvidenceId,
      },
      sources: [{ adapterId: "human-review", retrievedAt: new Date().toISOString() }],
      verification: newVerification,
      policyContext: {
        policyId: "human-review",
        decision: decision === "elevate_verified" ? "allow" : decision === "reject" ? "deny" : "ask",
        reasons: notes ? [notes] : [`Human review: ${decision}`],
      },
      missionId: item.missionId,
    });

    return { newVerification, evidenceId: originalEvidenceId };
  }

  /** Verify the hash chain for a mission (or entire ledger) */
  async verifyIntegrity(missionId?: string) {
    return this.ledger.verifyChain(missionId);
  }
}
