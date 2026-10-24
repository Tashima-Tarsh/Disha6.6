/**
 * Evidence Ledger v3 — Core Types
 * Governing document: CONSTITUTION.md + docs/EVIDENCE_LEDGER_V3.md
 */

import type {
  EvidenceEvent,
  VerificationState,
  Actor,
  SourceReference,
  PolicyContext,
} from "@disha/contracts";

export type { EvidenceEvent, VerificationState, Actor, SourceReference, PolicyContext };

export interface LedgerAppendResult {
  event: EvidenceEvent;
  previousHash: string;
  hash: string;
}

export interface LedgerQuery {
  missionId?: string;
  caseId?: string;
  actorId?: string;
  verification?: VerificationState | VerificationState[];
  from?: string; // ISO
  to?: string;   // ISO
  limit?: number;
  cursor?: string;
}

export interface LedgerQueryResult {
  events: EvidenceEvent[];
  nextCursor?: string;
}
