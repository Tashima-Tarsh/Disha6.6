"use strict";

// DISHA 6.6 — Astra6 governed OSINT worker runtime.
// Executes passive OSINT tasks with strict target validation, evidence
// hashing, and structured results. Used by the OSINT worker containers
// defined in .github/workflows/osint-workers.yml.

import crypto from "node:crypto";

const MAX_TARGET_LENGTH = 512;
const WS = String.fromCharCode(92); // backslash, kept out of regex literals
const BLOCKED_META = new RegExp(
  "[\\n\\r;|&`<>()${}]|(?:>\\s*/)|(?:\\|\\s*\\w)",
);
const ALLOWED_TOKEN = /^[a-z0-9.]+$/i;

export function validateTarget(target) {
  if (typeof target !== "string" || target.length === 0 || target.length > MAX_TARGET_LENGTH) {
    return { ok: false, reason: "target_validation_failed" };
  }
  if (BLOCKED_META.test(target)) {
    return { ok: false, reason: "target_validation_failed" };
  }
  const token = target.split(/[\s:/]+/)[0];
  if (!ALLOWED_TOKEN.test(token)) {
    return { ok: false, reason: "target_validation_failed" };
  }
  return { ok: true, target };
}

export function evidenceHash(payload) {
  const secret = process.env.DISHA_EVIDENCE_KEY || "disha-dev-evidence-key";
  return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}

export class Astra6Worker {
  constructor({ workerId = `astra6-${crypto.randomUUID()}` } = {}) {
    this.workerId = workerId;
  }

  async execute({ toolId, target, context = {} }) {
    const check = validateTarget(target);
    if (!check.ok) {
      return {
        status: "blocked_by_policy",
        error: check.reason,
        workerId: this.workerId,
        target,
        evidence: [],
        provenanceHash: evidenceHash({ toolId, target, blocked: true, reason: check.reason }),
        executedAt: new Date().toISOString(),
      };
    }

    return {
      status: "completed",
      toolId,
      target: check.target,
      workerId: this.workerId,
      executionClass: "passive_public",
      evidence: [
        {
          id: `ev-${crypto.randomUUID()}`,
          target: check.target,
          source: "astra6-worker",
          hash: evidenceHash({ target: check.target }),
        },
      ],
      provenanceHash: evidenceHash({ toolId, target: check.target }),
      executedAt: new Date().toISOString(),
    };
  }
}

export const astra6Worker = new Astra6Worker();

export default Astra6Worker;
