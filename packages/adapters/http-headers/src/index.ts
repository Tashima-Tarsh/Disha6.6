import type { Adapter, AdapterResult, CanonicalInput, ExecutionContext, EvidenceEvent } from "@disha/contracts";
import { ulid } from "ulid";
import { createHash } from "crypto";

function makeEvidence(ctx: ExecutionContext, payload: unknown, target: string): EvidenceEvent {
  const id = ulid();
  const timestamp = new Date().toISOString();
  return {
    id,
    previousHash: "0",
    hash: createHash("sha256").update(id + timestamp).digest("hex"),
    timestamp,
    actor: { type: "adapter", id: "http-headers" },
    type: "observation",
    payload,
    sources: [{ adapterId: "http-headers", url: target, retrievedAt: timestamp }],
    verification: "OBSERVED",
    policyContext: { policyId: "public-source", decision: "allow", reasons: ["Public HTTP response headers"] },
    missionId: ctx.missionId,
    caseId: ctx.caseId,
  };
}

export const httpHeadersAdapter: Adapter = {
  id: "http-headers",
  name: "HTTP Response Headers",
  version: "1.0.0",
  category: "network",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Public HTTP responses",
  dataSensitivity: "public",
  rateLimit: { requests: 30, windowMs: 60_000 },
  timeoutMs: 12_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    let target = String(input.url || input.domain || "").trim();
    if (!target) {
      return { observations: [], evidenceEvents: [], confidence: 0, limitations: ["url or domain required"], errors: ["missing target"] };
    }
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`;

    const res = await fetch(target, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "Disha-Constitutional/1.0" },
      signal: AbortSignal.timeout(11000),
    });

    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });

    const payload = {
      url: target,
      finalUrl: res.url,
      status: res.status,
      headers,
    };

    const evidence = makeEvidence(ctx, payload, target);
    return {
      observations: [{ key: "http", value: payload }],
      evidenceEvents: [evidence],
      confidence: 0.9,
      limitations: ["Headers only; body is not fetched or stored"],
    };
  },
};

export default httpHeadersAdapter;
