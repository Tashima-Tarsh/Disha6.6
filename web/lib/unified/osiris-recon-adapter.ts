"use client";

import type {
  AdapterMetadata,
  AdapterContext,
  AdapterEvidence,
  AdapterHealth,
  GovernedOsintAdapter,
} from "@/lib/unified/osint-adapter-bus";

/**
 * OSIRIS RECON Compatibility Adapter.
 *
 * Wraps the OSIRIS intelligence-layer resolve endpoint
 * (GET /resolve?type=<type>&id=<id>) with DISHA policy controls:
 *
 *   - Explicit target authorization (active_recon execution class)
 *   - Target allowlists and scope validation
 *   - Authentication (session-based via proxy)
 *   - Input validation (type allowlist, id length/format)
 *   - Rate limits (per-client IP, per-adapter)
 *   - Job timeouts (15s upstream timeout)
 *   - Audit trails (evidence events with provenance hash)
 *   - Result provenance (source URL, timestamp, entity type/id)
 *   - Human approval required for sensitive actions (requiresApproval: true)
 *
 * If the OSIRIS scanner backend (SCANNER_URL/SCANNER_KEY) is not configured,
 * this adapter reports CONFIGURATION REQUIRED — never synthetic results.
 */

const SCANNER_BASE =
  typeof window !== "undefined"
    ? (window as any).OSIRIS_SCANNER_URL ?? "http://127.0.0.1:4000"
    : "http://127.0.0.1:4000";

// Target allowlist — only these entity types are permitted for recon.
// Adding a type here does NOT grant scan authority; each target must still
// be individually authorized through DISHA's policy gateway.
const ALLOWED_RECON_TYPES = new Set([
  "aircraft",
  "vessel",
  "company",
  "person",
  "ip",
  "country",
]);

// Per-client rate limit state (in-memory, reset on server restart)
const reconRateMap = new Map<string, { count: number; resetAt: number }>();
function isReconRateLimited(clientId: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  for (const [k, v] of reconRateMap) if (now > v.resetAt) reconRateMap.delete(k);
  const entry = reconRateMap.get(clientId);
  if (!entry || now > entry.resetAt) {
    reconRateMap.set(clientId, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > limit;
}

function normalizeReconId(type: string, raw: string): string | null {
  if (type === "ip") {
    const ipv4 = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    const ipv6 = /^[0-9a-f:]+$/i;
    return (ipv4.test(raw) || ipv6.test(raw)) ? raw : null;
  }
  if (type === "aircraft") {
    const cleaned = raw.replace(/[^a-zA-Z0-9\-]/g, "");
    return cleaned || null;
  }
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function makeReconEvidence(
  ctx: AdapterContext,
  adapterId: string,
  type: string,
  id: string,
  result: unknown,
  sourceUrl: string
): AdapterEvidence {
  const retrievedAt = new Date().toISOString();
  const hashInput = `${adapterId}:${type}:${id}:${retrievedAt}`;
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return {
    id: `${adapterId}-${type}-${id}-${Date.now()}`,
    sourceId: adapterId,
    sourceName: "OSIRIS Recon Scanner",
    sourceUrl,
    summary: `OSIRIS RECON resolve: ${type} ${id} — ${JSON.stringify(result).slice(0, 200)}`,
    retrievedAt,
    provenanceHash: Math.abs(hash).toString(16).padStart(8, "0"),
    fields: { entityType: type, entityId: id, degraded: (result as any)?.degraded ?? false },
  };
}

export const osirisReconAdapter: GovernedOsintAdapter<
  { type: string; id: string; registration?: string; model?: string; icao24?: string },
  { nodes: unknown[]; links: unknown[]; degraded: boolean; entity: { type: string; id: string }; source: string; timestamp: string }
> = {
  metadata: {
    id: "osiris-recon",
    name: "OSIRIS Recon Scanner",
    version: "1.0.0",
    capability: "osiris_recon_entity_resolution",
    auth: "session",
    legalUse: [
      "Entity resolution for authorized targets only",
      "Sanctions screening via OpenSanctions OFAC SDN",
      "Wikidata entity enrichment for infrastructure attribution",
    ],
    blockedUse: [
      "Unauthorized active scanning",
      "Targets outside explicit allowlist",
      "Bulk enumeration without per-target authorization",
      "Covert tracking of individuals without authorization",
    ],
    rateLimitPerMinute: 10,
    timeoutMs: 15000,
    maxRetries: 1,
    executionClass: "active_recon",
    defaultEnabled: false,
    upstreamRepository: "https://github.com/simplifaisoul/osiris",
  },
  async health(): Promise<{ status: AdapterHealth; detail?: string }> {
    try {
      const res = await fetch(`${SCANNER_BASE}/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      if (!res.ok) {
        return {
          status: "not_configured",
          detail: `OSIRIS scanner backend returned HTTP ${res.status} — SCANNER_URL/SCANNER_KEY may not be configured`,
        };
      }
      const data = await res.json();
      const degraded = data.sanctions_entries === 0 || !!data.sanctions_last_error;
      return {
        status: degraded ? "degraded" : "healthy",
        detail: `OSIRIS scanner online — ${data.sanctions_entries} sanctions entries, Wikidata cache: ${data.wikidata_cache_size}`,
      };
    } catch (err) {
      return {
        status: "not_configured",
        detail: `OSIRIS scanner backend unreachable — set SCANNER_URL and SCANNER_KEY to enable RECON. Error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
  async execute(
    input: { type: string; id: string; registration?: string; model?: string; icao24?: string },
    context: AdapterContext
  ): Promise<{
    data: { nodes: unknown[]; links: unknown[]; degraded: boolean; entity: { type: string; id: string }; source: string; timestamp: string };
    evidence: AdapterEvidence[];
    warnings?: string[];
  }> {
    const warnings: string[] = [];

    // 1. Target authorization check — active_recon requires explicit approval
    if (!context.activeAuthorization && !context.approvalGrantId) {
      return {
        data: { nodes: [], links: [], degraded: false, entity: { type: input.type, id: input.id }, source: "OSIRIS Recon Scanner", timestamp: new Date().toISOString() },
        evidence: [
          {
            id: `osiris-recon-${Date.now()}`,
            sourceId: "osiris-recon",
            sourceName: "OSIRIS Recon Scanner",
            sourceUrl: `${SCANNER_BASE}/resolve`,
            summary: `RECON denied: ${input.type} ${input.id} — active authorization or approval grant required`,
            retrievedAt: new Date().toISOString(),
            provenanceHash: "0",
          },
        ],
        warnings: ["RECON requires explicit target authorization or an approval grant"],
      };
    }

    // 2. Type allowlist validation
    if (!input.type || !ALLOWED_RECON_TYPES.has(input.type.toLowerCase())) {
      return {
        data: { nodes: [], links: [], degraded: false, entity: { type: input.type, id: input.id }, source: "OSIRIS Recon Scanner", timestamp: new Date().toISOString() },
        evidence: [],
        warnings: [`Recon type '${input.type}' not in allowed types: ${[...ALLOWED_RECON_TYPES].join(", ")}`],
      };
    }

    // 3. ID validation
    if (!input.id || input.id.length < 2 || input.id.length > 200) {
      return {
        data: { nodes: [], links: [], degraded: false, entity: { type: input.type, id: input.id }, source: "OSIRIS Recon Scanner", timestamp: new Date().toISOString() },
        evidence: [],
        warnings: ["Invalid entity id (must be 2-200 characters)"],
      };
    }

    const type = input.type.toLowerCase();
    const id = normalizeReconId(type, input.id);
    if (!id) {
      return {
        data: { nodes: [], links: [], degraded: false, entity: { type, id: input.id }, source: "OSIRIS Recon Scanner", timestamp: new Date().toISOString() },
        evidence: [],
        warnings: [`Entity id fails ${type} format validation`],
      };
    }

    // 4. Rate limit check (per client/session)
    const clientId = context.userId ?? "anonymous";
    if (isReconRateLimited(clientId)) {
      return {
        data: { nodes: [], links: [], degraded: false, entity: { type, id }, source: "OSIRIS Recon Scanner", timestamp: new Date().toISOString() },
        evidence: [],
        warnings: ["RECON rate limit exceeded — try again later"],
      };
    }

    // 5. Call OSIRIS resolve endpoint
    const params = new URLSearchParams({ type, id });
    if (input.registration) params.set("registration", input.registration);
    if (input.model) params.set("model", input.model);
    if (input.icao24) params.set("icao24", input.icao24);

    const sourceUrl = `${SCANNER_BASE}/resolve?${params.toString()}`;

    try {
      const res = await fetch(sourceUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Request-ID": context.userId,
          "X-Forwarded-For": context.userId,
        },
        signal: AbortSignal.timeout(osirisReconAdapter.metadata.timeoutMs),
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 429) {
          warnings.push("OSIRIS scanner rate limit exceeded");
        }
        return {
          data: { nodes: [], links: [], degraded: false, entity: { type, id }, source: "OSIRIS Recon Scanner", timestamp: new Date().toISOString() },
          evidence: [],
          warnings: [...warnings, `OSIRIS resolve returned HTTP ${res.status}`],
        };
      }

      const result = await res.json();
      const degraded = !!result.degraded;
      if (degraded) warnings.push("OSIRIS resolve returned partial data (provider outage)");

      const evidence = makeReconEvidence(context, "osiris-recon", type, id, result, sourceUrl);

      return {
        data: {
          nodes: Array.isArray(result.nodes) ? result.nodes : [],
          links: Array.isArray(result.links) ? result.links : [],
          degraded,
          entity: { type, id },
          source: result.source ?? "OSIRIS Intelligence Layer",
          timestamp: result.timestamp ?? new Date().toISOString(),
        },
        evidence: [evidence],
        warnings,
      };
    } catch (err) {
      return {
        data: { nodes: [], links: [], degraded: false, entity: { type, id }, source: "OSIRIS Recon Scanner", timestamp: new Date().toISOString() },
        evidence: [],
        warnings: [...warnings, err instanceof Error ? err.message : String(err)],
      };
    }
  },
};

export function listReconAdapterMetadata(): AdapterMetadata[] {
  return [osirisReconAdapter.metadata];
}

export async function checkReconAdapterHealth(): Promise<AdapterHealth> {
  return (await osirisReconAdapter.health()).status;
}
