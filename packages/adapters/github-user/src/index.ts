/**
 * Example governed adapter — GitHub public user lookup
 *
 * Demonstrates the constitutional pattern:
 * - Declares risk, legal basis, sensitivity
 * - Emits EvidenceEvents
 * - Never claims VERIFIED on its own
 */

import type {
  Adapter,
  AdapterResult,
  CanonicalInput,
  ExecutionContext,
  EvidenceEvent,
} from "@disha/contracts";
import { ulid } from "ulid";
import { createHash } from "crypto";

async function fetchGitHubUser(username: string) {
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "Disha-Constitutional/1.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

function makeEvidence(
  ctx: ExecutionContext,
  payload: unknown,
  sources: EvidenceEvent["sources"]
): EvidenceEvent {
  const id = ulid();
  const timestamp = new Date().toISOString();
  // Hash is normally computed by the Ledger; we leave a placeholder here.
  // The Ledger will re-hash on append.
  return {
    id,
    previousHash: "0",
    hash: createHash("sha256").update(id + timestamp).digest("hex"),
    timestamp,
    actor: { type: "adapter", id: "github-user" },
    type: "observation",
    payload,
    sources,
    verification: "OBSERVED",
    policyContext: {
      policyId: "public-source",
      decision: "allow",
      reasons: ["Public GitHub API, no authentication required"],
    },
    missionId: ctx.missionId,
    caseId: ctx.caseId,
  };
}

export const githubUserAdapter: Adapter = {
  id: "github-user",
  name: "GitHub Public User",
  version: "1.0.0",
  category: "identity",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Public data published by the user on GitHub",
  dataSensitivity: "public",
  rateLimit: { requests: 30, windowMs: 60_000 },
  timeoutMs: 12_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const username = String(input.username || "").trim();
    if (!username) {
      return {
        observations: [],
        evidenceEvents: [],
        confidence: 0,
        limitations: ["username is required"],
        errors: ["missing username"],
      };
    }

    const data = await fetchGitHubUser(username);
    const source = {
      adapterId: "github-user",
      url: `https://api.github.com/users/${username}`,
      retrievedAt: new Date().toISOString(),
    };

    if (!data) {
      const evidence = makeEvidence(ctx, { username, exists: false }, [source]);
      return {
        observations: [{ key: "exists", value: false }],
        evidenceEvents: [evidence],
        confidence: 0.9,
        limitations: ["User not found or account suspended"],
      };
    }

    const evidence = makeEvidence(
      ctx,
      {
        username: data.login,
        name: data.name,
        bio: data.bio,
        publicRepos: data.public_repos,
        followers: data.followers,
        createdAt: data.created_at,
      },
      [source]
    );

    return {
      observations: [
        { key: "exists", value: true },
        { key: "profile", value: data },
      ],
      evidenceEvents: [evidence],
      confidence: 0.95,
      limitations: ["Data is only as accurate as GitHub’s public profile"],
    };
  },
};

export default githubUserAdapter;
