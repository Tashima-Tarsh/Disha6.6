import type { Adapter, AdapterResult, CanonicalInput, ExecutionContext, EvidenceEvent } from "@disha/contracts";
import { ulid } from "ulid";
import { createHash } from "crypto";

function makeEvidence(ctx: ExecutionContext, payload: unknown, domain: string): EvidenceEvent {
  const id = ulid();
  const timestamp = new Date().toISOString();
  return {
    id,
    previousHash: "0",
    hash: createHash("sha256").update(id + timestamp).digest("hex"),
    timestamp,
    actor: { type: "adapter", id: "crtsh" },
    type: "observation",
    payload,
    sources: [{ adapterId: "crtsh", url: `https://crt.sh/?q=%25.${domain}&output=json`, retrievedAt: timestamp }],
    verification: "OBSERVED",
    policyContext: { policyId: "public-source", decision: "allow", reasons: ["crt.sh public CT logs"] },
    missionId: ctx.missionId,
    caseId: ctx.caseId,
  };
}

export const crtshAdapter: Adapter = {
  id: "crtsh",
  name: "crt.sh Certificate Transparency",
  version: "1.0.0",
  category: "network",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Public Certificate Transparency logs",
  dataSensitivity: "public",
  rateLimit: { requests: 10, windowMs: 60_000 },
  timeoutMs: 15_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const domain = String(input.domain || "").trim().toLowerCase();
    if (!domain) {
      return { observations: [], evidenceEvents: [], confidence: 0, limitations: ["domain required"], errors: ["missing domain"] };
    }

    const res = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`, {
      headers: { "User-Agent": "Disha-Constitutional/1.0" },
      signal: AbortSignal.timeout(14000),
    });
    if (!res.ok) throw new Error(`crt.sh ${res.status}`);
    const data = await res.json();
    const limited = Array.isArray(data) ? data.slice(0, 50) : data;

    const evidence = makeEvidence(ctx, { domain, certificates: limited, count: Array.isArray(data) ? data.length : 0 }, domain);
    return {
      observations: [{ key: "certificates", value: limited }],
      evidenceEvents: [evidence],
      confidence: 0.9,
      limitations: ["Limited to first 50 results; public CT data only"],
    };
  },
};

export default crtshAdapter;
