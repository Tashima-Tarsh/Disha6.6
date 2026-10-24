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
    actor: { type: "adapter", id: "rdap-domain" },
    type: "observation",
    payload,
    sources: [{ adapterId: "rdap-domain", url: `https://rdap.org/domain/${domain}`, retrievedAt: timestamp }],
    verification: "OBSERVED",
    policyContext: { policyId: "public-source", decision: "allow", reasons: ["Public RDAP data"] },
    missionId: ctx.missionId,
    caseId: ctx.caseId,
  };
}

export const rdapDomainAdapter: Adapter = {
  id: "rdap-domain",
  name: "RDAP Domain Lookup",
  version: "1.0.0",
  category: "network",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Public RDAP (Registration Data Access Protocol)",
  dataSensitivity: "public",
  rateLimit: { requests: 20, windowMs: 60_000 },
  timeoutMs: 12_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const domain = String(input.domain || "").trim().toLowerCase();
    if (!domain) {
      return { observations: [], evidenceEvents: [], confidence: 0, limitations: ["domain required"], errors: ["missing domain"] };
    }

    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { Accept: "application/rdap+json", "User-Agent": "Disha-Constitutional/1.0" },
      signal: AbortSignal.timeout(11000),
    });

    if (res.status === 404) {
      const evidence = makeEvidence(ctx, { domain, found: false }, domain);
      return {
        observations: [{ key: "rdap", value: { domain, found: false } }],
        evidenceEvents: [evidence],
        confidence: 0.85,
        limitations: ["Domain not found in RDAP"],
      };
    }
    if (!res.ok) throw new Error(`RDAP ${res.status}`);

    const data = await res.json();
    const evidence = makeEvidence(ctx, data, domain);
    return {
      observations: [{ key: "rdap", value: data }],
      evidenceEvents: [evidence],
      confidence: 0.9,
      limitations: ["RDAP fields vary by registry; some data may be redacted"],
    };
  },
};

export default rdapDomainAdapter;
