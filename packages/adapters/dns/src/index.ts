import type { Adapter, AdapterResult, CanonicalInput, ExecutionContext, EvidenceEvent } from "@disha/contracts";
import { ulid } from "ulid";
import { createHash } from "crypto";
import { resolve4, resolve6, resolveMx, resolveTxt, resolveNs } from "dns/promises";

function makeEvidence(ctx: ExecutionContext, payload: unknown, domain: string): EvidenceEvent {
  const id = ulid();
  const timestamp = new Date().toISOString();
  return {
    id,
    previousHash: "0",
    hash: createHash("sha256").update(id + timestamp).digest("hex"),
    timestamp,
    actor: { type: "adapter", id: "dns-lookup" },
    type: "observation",
    payload,
    sources: [{ adapterId: "dns-lookup", title: `DNS ${domain}`, retrievedAt: timestamp }],
    verification: "OBSERVED",
    policyContext: { policyId: "public-source", decision: "allow", reasons: ["Public DNS"] },
    missionId: ctx.missionId,
    caseId: ctx.caseId,
  };
}

export const dnsAdapter: Adapter = {
  id: "dns-lookup",
  name: "DNS Lookup",
  version: "1.0.0",
  category: "network",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Public DNS resolution",
  dataSensitivity: "public",
  rateLimit: { requests: 60, windowMs: 60_000 },
  timeoutMs: 8_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const domain = String(input.domain || "").trim().toLowerCase();
    if (!domain) {
      return { observations: [], evidenceEvents: [], confidence: 0, limitations: ["domain required"], errors: ["missing domain"] };
    }

    const result: Record<string, unknown> = { domain };
    try {
      result.a = await resolve4(domain).catch(() => []);
      result.aaaa = await resolve6(domain).catch(() => []);
      result.mx = await resolveMx(domain).catch(() => []);
      result.txt = await resolveTxt(domain).catch(() => []);
      result.ns = await resolveNs(domain).catch(() => []);
    } catch (e: any) {
      return {
        observations: [],
        evidenceEvents: [],
        confidence: 0,
        limitations: ["DNS resolution failed"],
        errors: [e?.message ?? String(e)],
      };
    }

    const evidence = makeEvidence(ctx, result, domain);
    return {
      observations: [{ key: "dns", value: result }],
      evidenceEvents: [evidence],
      confidence: 0.95,
      limitations: ["Results depend on resolver and TTL"],
    };
  },
};

export default dnsAdapter;
