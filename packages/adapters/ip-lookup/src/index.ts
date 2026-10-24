import type { Adapter, AdapterResult, CanonicalInput, ExecutionContext, EvidenceEvent } from "@disha/contracts";
import { ulid } from "ulid";
import { createHash } from "crypto";

function makeEvidence(ctx: ExecutionContext, payload: unknown, ip: string): EvidenceEvent {
  const id = ulid();
  const timestamp = new Date().toISOString();
  return {
    id,
    previousHash: "0",
    hash: createHash("sha256").update(id + timestamp).digest("hex"),
    timestamp,
    actor: { type: "adapter", id: "ip-lookup" },
    type: "observation",
    payload,
    sources: [{ adapterId: "ip-lookup", url: `https://ipapi.co/${ip}/json/`, retrievedAt: timestamp }],
    verification: "OBSERVED",
    policyContext: { policyId: "public-source", decision: "allow", reasons: ["Public IP geolocation API"] },
    missionId: ctx.missionId,
    caseId: ctx.caseId,
  };
}

export const ipLookupAdapter: Adapter = {
  id: "ip-lookup",
  name: "IP Geolocation (ipapi.co)",
  version: "1.0.0",
  category: "network",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Public IP geolocation data",
  dataSensitivity: "public",
  rateLimit: { requests: 30, windowMs: 60_000 },
  timeoutMs: 10_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const ip = String(input.ip || "").trim();
    if (!ip) {
      return { observations: [], evidenceEvents: [], confidence: 0, limitations: ["ip required"], errors: ["missing ip"] };
    }

    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      headers: { "User-Agent": "Disha-Constitutional/1.0" },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) throw new Error(`ipapi.co ${res.status}`);
    const data = await res.json();

    const evidence = makeEvidence(ctx, data, ip);
    return {
      observations: [{ key: "geo", value: data }],
      evidenceEvents: [evidence],
      confidence: 0.85,
      limitations: ["Geolocation is approximate; accuracy varies by provider"],
    };
  },
};

export default ipLookupAdapter;
