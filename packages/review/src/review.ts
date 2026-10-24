/**
 * Human Review Console — the final authority for elevation to VERIFIED.
 *
 * Constitutional rule (Article III):
 * Models and agents may never create VERIFIED findings.
 * Only a human review action can elevate.
 */

import { ulid } from "ulid";
import type { Actor, EvidenceEvent, VerificationState } from "@disha/contracts";
import type { ReviewItem, ReviewAction, ReviewDecision } from "./types";

export class ReviewQueue {
  private items = new Map<string, ReviewItem>();
  private actions: ReviewAction[] = [];

  /**
   * Add an evidence event that needs human attention.
   * Typically called for PREDICTED, INFERRED, CORRELATED, or VERIFY_REQUIRED.
   */
  enqueue(evidence: EvidenceEvent): ReviewItem {
    const item: ReviewItem = {
      id: ulid(),
      evidenceId: evidence.id,
      missionId: evidence.missionId,
      currentVerification: evidence.verification,
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    this.items.set(item.id, item);
    return item;
  }

  listPending(missionId?: string): ReviewItem[] {
    let all = Array.from(this.items.values()).filter((i) => i.status === "pending");
    if (missionId) all = all.filter((i) => i.missionId === missionId);
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * Human decision. This is the only path that can produce VERIFIED.
   * Returns the new verification state that should be written back to the Ledger.
   */
  decide(
    reviewItemId: string,
    decision: ReviewDecision,
    actor: Actor,
    notes?: string
  ): { newVerification: VerificationState; action: ReviewAction } {
    const item = this.items.get(reviewItemId);
    if (!item) throw new Error(`Review item not found: ${reviewItemId}`);
    if (item.status !== "pending") throw new Error("Review item already completed");

    let newVerification: VerificationState;
    switch (decision) {
      case "elevate_verified":
        newVerification = "VERIFIED";
        break;
      case "reject":
        newVerification = "REJECTED";
        break;
      case "request_more":
        newVerification = "VERIFY_REQUIRED";
        break;
      case "keep":
      default:
        newVerification = item.currentVerification;
        break;
    }

    const action: ReviewAction = {
      reviewItemId,
      decision,
      actor,
      notes,
      at: new Date().toISOString(),
    };

    item.status = "completed";
    item.proposedDecision = decision;
    item.reviewerNotes = notes;
    this.actions.push(action);

    return { newVerification, action };
  }

  getActions(): ReviewAction[] {
    return [...this.actions];
  }
}
