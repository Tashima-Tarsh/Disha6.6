/**
 * Canonical hashing for Evidence Ledger v3
 * Deterministic serialization → SHA-256
 */

import { createHash } from "crypto";
import type { EvidenceEvent } from "@disha/contracts";

/**
 * Produce a stable JSON string for hashing.
 * Keys are sorted so the hash is deterministic.
 */
export function canonicalSerialize(event: Omit<EvidenceEvent, "hash">): string {
  const ordered = {
    id: event.id,
    previousHash: event.previousHash,
    timestamp: event.timestamp,
    actor: event.actor,
    type: event.type,
    payload: event.payload,
    sources: event.sources,
    verification: event.verification,
    policyContext: event.policyContext,
    missionId: event.missionId ?? null,
    caseId: event.caseId ?? null,
    signature: event.signature ?? null,
  };
  return JSON.stringify(ordered);
}

export function computeHash(event: Omit<EvidenceEvent, "hash">): string {
  const payload = canonicalSerialize(event);
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function verifyEvent(event: EvidenceEvent): boolean {
  const { hash, ...rest } = event;
  return computeHash(rest) === hash;
}
