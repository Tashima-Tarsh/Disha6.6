"use client";

import type {
  AdapterMetadata,
  AdapterContext,
  AdapterEvidence,
  AdapterHealth,
  GovernedOsintAdapter,
} from "@/lib/unified/osint-adapter-bus";

/**
 * OSIRIS Intelligence Adapters for DISHA.
 *
 * All adapters call DISHA's governed proxy routes at /api/intelligence/<feed>,
 * which authenticate the request and proxy to the OSIRIS service
 * (localhost:3005 via Docker). No user-supplied URLs are forwarded, so there
 * is no SSRF surface. Unsupported or unconfigured feeds return
 * "configuration_required" status transparently — no synthetic intelligence.
 */

const OSIRIS_BASE = "/api/intelligence";

interface OsirisFeedResult {
  status?: string;
  features?: unknown[];
  count?: number;
  [key: string]: unknown;
}

async function fetchOsirisFeed(feed: string, timeoutMs = 15000): Promise<OsirisFeedResult> {
  const res = await fetch(`${OSIRIS_BASE}/${encodeURIComponent(feed)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 404) return { status: "configuration_required" as const, features: [], count: 0 };
    if (res.status === 401) return { status: "unavailable" as const, features: [], count: 0 };
    throw new Error(`osiris feed ${feed} returned ${res.status}`);
  }
  return res.json();
}

function makeEvidence(
  ctx: AdapterContext,
  adapterId: string,
  feed: string,
  summary: string,
  sourceUrl: string,
  count: number,
  status: string = "live"
): { id: string; sourceId: string; sourceName: string; sourceUrl: string; summary: string; retrievedAt: string; provenanceHash: string } {
  const id = `${adapterId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const retrievedAt = new Date().toISOString();
  const hashInput = id + retrievedAt + adapterId + feed;
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return {
    id,
    sourceId: adapterId,
    sourceName: `OSIRIS ${feed}`,
    sourceUrl,
    summary,
    retrievedAt,
    provenanceHash: Math.abs(hash).toString(16).padStart(8, "0"),
  };
}

function feedSourceUrl(feed: string): string {
  const urls: Record<string, string> = {
    flights: "https://opensky-network.org/api",
    earthquakes: "https://earthquake.usgs.gov/fdsnws/event/1",
    fires: "https://firms.modaps.eosdis.nasa.gov",
    maritime: "https://marinetraffic.com",
    satellites: "https://celestrak.org",
    weather: "https://eonet.gsfc.nasa.gov",
    cctv: "https://example.com/public-cctv",
    news: "https://gdeltproject.org",
    gdelt: "https://gdeltproject.org",
    osint: "https://osiris-intelligence.local",
  };
  return urls[feed] ?? `https://osiris-intelligence.local/api/${feed}`;
}

function createOsirisAdapter(feed: string): GovernedOsintAdapter<{ target?: string; limit?: number }, unknown> {
  const metadata: AdapterMetadata = {
    id: `osiris-${feed}`,
    name: `OSIRIS ${feed.charAt(0).toUpperCase() + feed.slice(1)} Intelligence`,
    version: "1.0.0",
    capability: `osiris_${feed}_intelligence`,
    auth: "none",
    legalUse: [
      `Public ${feed} intelligence via OSIRIS`,
      "Passive observation only",
      "Situational awareness",
    ],
    blockedUse: [
      "Active scanning",
      "Unauthorized intrusion",
      "Private data harvesting",
      "Covert tracking",
    ],
    rateLimitPerMinute: 30,
    timeoutMs: 15000,
    maxRetries: 1,
    executionClass: "passive_public",
    defaultEnabled: true,
    upstreamRepository: "https://github.com/simplifaisoul/osiris",
  };

  return {
    metadata,
    async health(): Promise<{ status: AdapterHealth; detail?: string }> {
      try {
        const data = await fetchOsirisFeed(feed, 8000);
        if (data.status === "configuration_required") {
          return { status: "not_configured", detail: `OSIRIS ${feed} feed not configured` };
        }
        if (data.status === "unavailable") {
          return { status: "unavailable", detail: `OSIRIS ${feed} feed unavailable` };
        }
        return { status: "healthy", detail: `OSIRIS ${feed} feed responsive (${data.count ?? 0} features)` };
      } catch (err) {
        return { status: "unavailable", detail: err instanceof Error ? err.message : String(err) };
      }
    },
    async execute(
      input: { target?: string; limit?: number },
      context: AdapterContext
    ): Promise<{ data: unknown; evidence: AdapterEvidence[]; warnings?: string[] }> {
      const start = Date.now();
      try {
        const data = await fetchOsirisFeed(feed, metadata.timeoutMs);
        const features = Array.isArray(data.features) ? data.features : [];
        const count = features.length;
        const status = data.status ?? "live";

        const evidence: AdapterEvidence = {
          id: `${metadata.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          sourceId: metadata.id,
          sourceName: `OSIRIS ${feed}`,
          sourceUrl: feedSourceUrl(feed),
          summary: `OSIRIS ${feed} intelligence query returned ${count} public observation(s)`,
          retrievedAt: new Date().toISOString(),
          provenanceHash: Math.abs(
            (() => {
              let hash = 0;
              const input = metadata.id + new Date().toISOString() + feed;
              for (let i = 0; i < input.length; i++) {
                const char = input.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash = hash & hash;
              }
              return hash;
            })()
          ).toString(16).padStart(8, "0"),
        };

        return {
          data: { feed, count, features, source: "OSIRIS", retrievedAt: new Date().toISOString(), status },
          evidence: [evidence],
          warnings: status === "configuration_required" ? [`OSIRIS ${feed} feed requires configuration`] : [],
        };
      } catch (err) {
        return {
          data: undefined,
          evidence: [
            {
              id: `${metadata.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              sourceId: metadata.id,
              sourceName: `OSIRIS ${feed}`,
              sourceUrl: feedSourceUrl(feed),
              summary: "Query failed",
              retrievedAt: new Date().toISOString(),
              provenanceHash: "0",
            },
          ],
          warnings: [],
        };
      }
    },
  };
}

export const OSIRIS_FEEDS = [
  "flights",
  "earthquakes",
  "fires",
  "maritime",
  "satellites",
  "weather",
  "cctv",
  "news",
  "gdelt",
  "osint",
] as const;

export const OSIRIS_INTELLIGENCE_ADAPTERS: Record<string, GovernedOsintAdapter<{ target?: string; limit?: number }, unknown>> = {};
for (const feed of OSIRIS_FEEDS) {
  OSIRIS_INTELLIGENCE_ADAPTERS[`osiris-${feed}`] = createOsirisAdapter(feed);
}

export function listOsirisAdapterMetadata(): AdapterMetadata[] {
  return Object.values(OSIRIS_INTELLIGENCE_ADAPTERS).map((a) => a.metadata);
}

export async function checkOsirisAdaptersHealth(): Promise<Record<string, AdapterHealth>> {
  const result: Record<string, AdapterHealth> = {};
  for (const [id, adapter] of Object.entries(OSIRIS_INTELLIGENCE_ADAPTERS)) {
    try {
      result[id] = (await adapter.health()).status;
    } catch {
      result[id] = "unavailable";
    }
  }
  return result;
}
