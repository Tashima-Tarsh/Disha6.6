import type { Adapter, AdapterResult, CanonicalInput, ExecutionContext, EvidenceEvent } from "@disha/contracts";
import { ulid } from "ulid";
import { createHash } from "crypto";

function makeEvidence(ctx: ExecutionContext, payload: unknown, url: string): EvidenceEvent {
  const id = ulid();
  const timestamp = new Date().toISOString();
  return {
    id,
    previousHash: "0",
    hash: createHash("sha256").update(id + timestamp).digest("hex"),
    timestamp,
    actor: { type: "adapter", id: "wayback" },
    type: "observation",
    payload,
    sources: [{ adapterId: "wayback", url: `http://archive.org/wayback/available?url=${url}`, retrievedAt: timestamp }],
    verification: "OBSERVED",
    policyContext: { policyId: "public-source", decision: "allow", reasons: ["Internet Archive public API"] },
    missionId: ctx.missionId,
    caseId: ctx.caseId,
  };
}

export const waybackAdapter: Adapter = {
  id: "wayback",
  name: "Wayback Machine Availability",
  version: "1.0.0",
  category: "osint",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Internet Archive public availability API",
  dataSensitivity: "public",
  rateLimit: { requests: 20, windowMs: 60_000 },
  timeoutMs: 12_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const url = String(input.url || input.domain || "").trim();
    if (!url) {
      return { observations: [], evidenceEvents: [], confidence: 0, limitations: ["url or domain required"], errors: ["missing url"] };
    }

    const res = await fetch(`http://archive.org/wayback/available?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Wayback API ${res.status}`);
    const data = await res.json();

    const evidence = makeEvidence(ctx, data, url);
    return {
      observations: [{ key: "wayback", value: data }],
      evidenceEvents: [evidence],
      confidence: 0.9,
      limitations: ["Availability snapshot only; does not return full archived content"],
    };
  },
};

export default waybackAdapter;
