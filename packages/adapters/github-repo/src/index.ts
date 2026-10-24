import type { Adapter, AdapterResult, CanonicalInput, ExecutionContext, EvidenceEvent } from "@disha/contracts";
import { ulid } from "ulid";
import { createHash } from "crypto";

function makeEvidence(ctx: ExecutionContext, payload: unknown, fullName: string): EvidenceEvent {
  const id = ulid();
  const timestamp = new Date().toISOString();
  return {
    id,
    previousHash: "0",
    hash: createHash("sha256").update(id + timestamp).digest("hex"),
    timestamp,
    actor: { type: "adapter", id: "github-repo" },
    type: "observation",
    payload,
    sources: [{ adapterId: "github-repo", url: `https://api.github.com/repos/${fullName}`, retrievedAt: timestamp }],
    verification: "OBSERVED",
    policyContext: { policyId: "public-source", decision: "allow", reasons: ["Public GitHub repository metadata"] },
    missionId: ctx.missionId,
    caseId: ctx.caseId,
  };
}

export const githubRepoAdapter: Adapter = {
  id: "github-repo",
  name: "GitHub Public Repository",
  version: "1.0.0",
  category: "identity",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Public GitHub repository data",
  dataSensitivity: "public",
  rateLimit: { requests: 30, windowMs: 60_000 },
  timeoutMs: 12_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const fullName = String(input.repo || input.full_name || "").trim();
    if (!fullName || !fullName.includes("/")) {
      return {
        observations: [],
        evidenceEvents: [],
        confidence: 0,
        limitations: ["repo required as owner/name"],
        errors: ["missing or invalid repo"],
      };
    }

    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(fullName)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Disha-Constitutional/1.0",
      },
      signal: AbortSignal.timeout(11000),
    });

    if (res.status === 404) {
      const evidence = makeEvidence(ctx, { fullName, exists: false }, fullName);
      return {
        observations: [{ key: "exists", value: false }],
        evidenceEvents: [evidence],
        confidence: 0.9,
        limitations: ["Repository not found or private"],
      };
    }
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const data = await res.json();
    const evidence = makeEvidence(ctx, {
      fullName: data.full_name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      language: data.language,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      license: data.license?.spdx_id,
    }, fullName);

    return {
      observations: [{ key: "repo", value: data }],
      evidenceEvents: [evidence],
      confidence: 0.95,
      limitations: ["Public metadata only"],
    };
  },
};

export default githubRepoAdapter;
