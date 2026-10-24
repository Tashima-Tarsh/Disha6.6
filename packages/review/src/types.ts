import type { VerificationState, Actor, EvidenceEvent } from "@disha/contracts";

export type { VerificationState, Actor, EvidenceEvent };

export type ReviewDecision = "elevate_verified" | "reject" | "request_more" | "keep";

export interface ReviewItem {
  id: string;
  evidenceId: string;
  missionId?: string;
  currentVerification: VerificationState;
  proposedDecision?: ReviewDecision;
  reviewerNotes?: string;
  createdAt: string;
  status: "pending" | "completed";
}

export interface ReviewAction {
  reviewItemId: string;
  decision: ReviewDecision;
  actor: Actor;
  notes?: string;
  at: string;
}
