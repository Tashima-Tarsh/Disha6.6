#!/usr/bin/env node
/**
 * E2E constitutional ledger path (no external deps beyond Node crypto).
 *
 * Mission → OBSERVED append → human elevate VERIFIED → verifyIntegrity
 * Mirrors packages/evidence-ledger hash rules enough to prove chain discipline.
 *
 * Run: node scripts/e2e-ledger-chain.mjs
 */
import { createHash, randomUUID } from "node:crypto";

function canonicalSerialize(eventWithoutHash) {
  const ordered = {
    id: eventWithoutHash.id,
    previousHash: eventWithoutHash.previousHash,
    timestamp: eventWithoutHash.timestamp,
    actor: eventWithoutHash.actor,
    type: eventWithoutHash.type,
    payload: eventWithoutHash.payload,
    sources: eventWithoutHash.sources,
    verification: eventWithoutHash.verification,
    policyContext: eventWithoutHash.policyContext,
    missionId: eventWithoutHash.missionId ?? null,
    caseId: eventWithoutHash.caseId ?? null,
    signature: eventWithoutHash.signature ?? null,
  };
  return JSON.stringify(ordered);
}

function computeHash(eventWithoutHash) {
  return createHash("sha256").update(canonicalSerialize(eventWithoutHash), "utf8").digest("hex");
}

function verifyEvent(event) {
  const { hash, ...rest } = event;
  return computeHash(rest) === hash;
}

class MemoryLedger {
  constructor() {
    this.events = [];
  }

  latestHash(missionId) {
    const filtered = this.events.filter((e) => e.missionId === missionId);
    if (filtered.length === 0) return "0";
    return filtered[filtered.length - 1].hash;
  }

  append(partial) {
    const previousHash = this.latestHash(partial.missionId);
    const id = randomUUID().replace(/-/g, "").slice(0, 26);
    const timestamp = new Date().toISOString();
    const eventWithoutHash = {
      id,
      previousHash,
      timestamp,
      actor: partial.actor,
      type: partial.type,
      payload: partial.payload,
      sources: partial.sources,
      verification: partial.verification,
      policyContext: partial.policyContext,
      missionId: partial.missionId,
      caseId: partial.caseId ?? null,
      signature: partial.signature ?? null,
    };
    const hash = computeHash(eventWithoutHash);
    const event = { ...eventWithoutHash, hash };
    this.events.push(event);
    return event;
  }

  verifyChain(missionId) {
    const events = this.events.filter((e) => e.missionId === missionId);
    let expectedPrev = "0";
    for (const event of events) {
      if (event.previousHash !== expectedPrev) {
        return { valid: false, brokenAt: event.id, reason: "previousHash" };
      }
      if (!verifyEvent(event)) {
        return { valid: false, brokenAt: event.id, reason: "hash" };
      }
      expectedPrev = event.hash;
    }
    return { valid: true, eventCount: events.length };
  }
}

const errors = [];
const missionId = `e2e-${Date.now()}`;
const system = { type: "system", id: "ci-runner" };
const human = { type: "human", id: "reviewer-ci", displayName: "CI Reviewer" };
const ledger = new MemoryLedger();

// 1) Observation (adapter)
const observed = ledger.append({
  actor: { type: "adapter", id: "osint:india-pan" },
  type: "observation",
  payload: { collector: "India: PAN validator", result: { valid: true }, verification: "OBSERVED" },
  sources: [{ adapterId: "osint:india-pan", retrievedAt: new Date().toISOString() }],
  verification: "OBSERVED",
  policyContext: { policyId: "osint-public", decision: "allow", reasons: ["passive"] },
  missionId,
});

if (observed.verification !== "OBSERVED") errors.push("observation not OBSERVED");
if (observed.previousHash !== "0") errors.push("first previousHash must be 0");

// 2) Only human may elevate to VERIFIED
const approval = ledger.append({
  actor: human,
  type: "approval",
  payload: {
    decision: "elevate_verified",
    linkedEvidenceId: observed.id,
    notes: "CI E2E human review",
  },
  sources: [{ adapterId: "human-review", retrievedAt: new Date().toISOString() }],
  verification: "VERIFIED",
  policyContext: {
    policyId: "human-review",
    decision: "allow",
    reasons: ["Human review: elevate_verified"],
  },
  missionId,
});

if (approval.actor.type !== "human") errors.push("VERIFIED must be human actor");
if (approval.verification !== "VERIFIED") errors.push("approval not VERIFIED");
if (approval.previousHash !== observed.hash) errors.append?.("chain link broken") || (approval.previousHash !== observed.hash && errors.push("chain link broken"));

// 3) Integrity
const integrity = ledger.verifyChain(missionId);
if (!integrity.valid) errors.push(`verifyChain failed: ${JSON.stringify(integrity)}`);
if (integrity.eventCount !== 2) errors.push(`expected 2 events got ${integrity.eventCount}`);

// 4) Tamper detection
const ledger2 = new MemoryLedger();
ledger2.append({
  actor: system,
  type: "observation",
  payload: { ok: 1 },
  sources: [],
  verification: "OBSERVED",
  policyContext: { policyId: "t", decision: "allow", reasons: [] },
  missionId: "tamper",
});
ledger2.events[0].payload = { ok: 2 }; // mutate after hash
const bad = ledger2.verifyChain("tamper");
if (bad.valid) errors.push("tamper should invalidate chain");

if (errors.length) {
  console.log("E2E LEDGER CHAIN FAILED");
  for (const e of errors) console.log(" -", e);
  process.exit(1);
}

console.log("E2E LEDGER CHAIN OK");
console.log(`  missionId=${missionId} events=2 integrity=valid human_verified=ok tamper_detected=ok`);
process.exit(0);
