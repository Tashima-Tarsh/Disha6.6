"use client";

import type {
  Adapter,
  AdapterResult,
  CanonicalInput,
  ExecutionContext,
  EvidenceEvent,
} from "@disha/contracts";
import { ulid } from "ulid";
import { createHash } from "crypto";
import { fetchOsirisFeed, fetchOsirisHealth } from "./client";

function makeEvidence(
  ctx: ExecutionContext,
  adapterId: string,
  feed: string,
  payload: unknown,
  sourceUrl: string,
  count: number
): EvidenceEvent {
  const id = ulid();
  const timestamp = new Date().toISOString();
  return {
    id,
    previousHash: "0",
    hash: createHash("sha256").update(id + timestamp + adapterId).digest("hex"),
    timestamp,
    actor: { type: "adapter", id: adapterId },
    type: "observation",
    payload,
    sources: [{ adapterId, url: sourceUrl, retrievedAt: timestamp }],
    verification: "OBSERVED",
    policyContext: {
      policyId: "public-source",
      decision: "allow",
      reasons: [`OSIRIS ${feed} public intelligence feed`],
    },
    missionId: ctx.missionId,
    caseId: ctx.caseId,
  };
}

function emptyResult(
  adapterId: string,
  ctx: ExecutionContext,
  feed: string,
  sourceUrl: string,
  limitations: string[],
  errors?: string[]
): AdapterResult {
  return {
    observations: [],
    evidenceEvents: [
      makeEvidence(ctx, adapterId, feed, { count: 0, error: errors }, sourceUrl, 0),
    ],
    confidence: 0,
    limitations,
    errors,
  };
}

/* ========================================================================
   OSIRIS FLIGHTS ADAPTER — OpenSky ADS-B aircraft observations
   ======================================================================== */
export const osirisFlightsAdapter: Adapter = {
  id: "osiris-flights",
  name: "OSIRIS Aviation (OpenSky ADS-B)",
  version: "1.0.0",
  category: "aerospace",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Public ADS-B transponder data via OpenSky Network",
  dataSensitivity: "public",
  rateLimit: { requests: 30, windowMs: 60_000 },
  timeoutMs: 15_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const sourceUrl = "https://opensky-network.org/api";
    try {
      const data = await fetchOsirisFeed("flights", {
        rateLimit: { requests: 30, windowMs: 60_000 },
        timeoutMs: 15_000,
      });
      const features = data?.features ?? data ?? [];
      const count = Array.isArray(features) ? features.length : 0;
      return {
        observations: [
          { key: "aircraft", value: features, confidence: 0.85 },
          { key: "count", value: count },
        ],
        evidenceEvents: [
          makeEvidence(ctx, "osiris-flights", "flights", {
            source: "OpenSky Network via OSIRIS",
            count,
            retrievedAt: new Date().toISOString(),
          }, sourceUrl, count),
        ],
        confidence: 0.85,
        limitations: ["ADS-B coverage varies by region; not all aircraft transmit"],
      };
    } catch (err) {
      return emptyResult("osiris-flights", ctx, "flights", sourceUrl, [
        "OpenSky data unavailable via OSIRIS proxy",
      ], [err instanceof Error ? err.message : String(err)]);
    }
  },
};

/* ========================================================================
   OSIRIS EARTHQUAKES ADAPTER — USGS seismic data
   ======================================================================== */
export const osirisEarthquakesAdapter: Adapter = {
  id: "osiris-earthquakes",
  name: "OSIRIS Seismic (USGS)",
  version: "1.0.0",
  category: "geospatial",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Public USGS Earthquake Hazards Program data",
  dataSensitivity: "public",
  rateLimit: { requests: 30, windowMs: 60_000 },
  timeoutMs: 15_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const sourceUrl = "https://earthquake.usgs.gov/fdsnws/event/1";
    try {
      const data = await fetchOsirisFeed("earthquakes", {
        rateLimit: { requests: 30, windowMs: 60_000 },
        timeoutMs: 15_000,
      });
      const features = data?.features ?? data ?? [];
      const count = Array.isArray(features) ? features.length : 0;
      return {
        observations: [
          { key: "earthquakes", value: features, confidence: 0.9 },
          { key: "count", value: count },
        ],
        evidenceEvents: [
          makeEvidence(ctx, "osiris-earthquakes", "earthquakes", {
            source: "USGS Earthquake API via OSIRIS",
            count,
            retrievedAt: new Date().toISOString(),
          }, sourceUrl, count),
        ],
        confidence: 0.9,
        limitations: ["USGS public feed; magnitudes and locations subject to revision"],
      };
    } catch (err) {
      return emptyResult("osiris-earthquakes", ctx, "earthquakes", sourceUrl, [
        "USGS data unavailable via OSIRIS proxy",
      ], [err instanceof Error ? err.message : String(err)]);
    }
  },
};

/* ========================================================================
   OSIRIS FIRES ADAPTER — NASA FIRMS wildfire observations
   ======================================================================== */
export const osirisFiresAdapter: Adapter = {
  id: "osiris-fires",
  name: "OSIRIS Wildfires (NASA FIRMS)",
  version: "1.0.0",
  category: "geospatial",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Public NASA FIRMS fire detection data",
  dataSensitivity: "public",
  rateLimit: { requests: 20, windowMs: 60_000 },
  timeoutMs: 15_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const sourceUrl = "https://firms.modaps.eosdis.nasa.gov";
    try {
      const data = await fetchOsirisFeed("fires", {
        rateLimit: { requests: 20, windowMs: 60_000 },
        timeoutMs: 15_000,
      });
      const features = data?.features ?? data ?? [];
      const count = Array.isArray(features) ? features.length : 0;
      return {
        observations: [
          { key: "wildfires", value: features, confidence: 0.8 },
          { key: "count", value: count },
        ],
        evidenceEvents: [
          makeEvidence(ctx, "osiris-fires", "fires", {
            source: "NASA FIRMS via OSIRIS",
            count,
            retrievedAt: new Date().toISOString(),
          }, sourceUrl, count),
        ],
        confidence: 0.8,
        limitations: ["Satellite detection latency; not all fires are observed"],
      };
    } catch (err) {
      return emptyResult("osiris-fires", ctx, "fires", sourceUrl, [
        "NASA FIRMS data unavailable via OSIRIS proxy",
      ], [err instanceof Error ? err.message : String(err)]);
    }
  },
};

/* ========================================================================
   OSIRIS MARITIME ADAPTER — Public maritime / port intelligence
   ======================================================================== */
export const osirisMaritimeAdapter: Adapter = {
  id: "osiris-maritime",
  name: "OSIRIS Maritime Intelligence",
  version: "1.0.0",
  category: "maritime",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Public maritime traffic and port data",
  dataSensitivity: "public",
  rateLimit: { requests: 20, windowMs: 60_000 },
  timeoutMs: 15_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const sourceUrl = "https://marinetraffic.com";
    try {
      const data = await fetchOsirisFeed("maritime", {
        rateLimit: { requests: 20, windowMs: 60_000 },
        timeoutMs: 15_000,
      });
      const features = data?.features ?? data ?? [];
      const count = Array.isArray(features) ? features.length : 0;
      return {
        observations: [
          { key: "vessels", value: features, confidence: 0.75 },
          { key: "count", value: count },
        ],
        evidenceEvents: [
          makeEvidence(ctx, "osiris-maritime", "maritime", {
            source: "Public maritime intelligence via OSIRIS",
            count,
            retrievedAt: new Date().toISOString(),
          }, sourceUrl, count),
        ],
        confidence: 0.75,
        limitations: ["AIS coverage varies; not all vessels transmit"],
      };
    } catch (err) {
      return emptyResult("osiris-maritime", ctx, "maritime", sourceUrl, [
        "Maritime data unavailable via OSIRIS proxy",
      ], [err instanceof Error ? err.message : String(err)]);
    }
  },
};

/* ========================================================================
   OSIRIS SATELLITES ADAPTER — CelesTrak ephemeris data
   ======================================================================== */
export const osirisSatellitesAdapter: Adapter = {
  id: "osiris-satellites",
  name: "OSIRIS Satellites (CelesTrak)",
  version: "1.0.0",
  category: "aerospace",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Public CelesTrak Two-Line Element (TLE) data",
  dataSensitivity: "public",
  rateLimit: { requests: 20, windowMs: 60_000 },
  timeoutMs: 15_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const sourceUrl = "https://celestrak.org";
    try {
      const data = await fetchOsirisFeed("satellites", {
        rateLimit: { requests: 20, windowMs: 60_000 },
        timeoutMs: 15_000,
      });
      const features = data?.features ?? data ?? [];
      const count = Array.isArray(features) ? features.length : 0;
      return {
        observations: [
          { key: "satellites", value: features, confidence: 0.85 },
          { key: "count", value: count },
        ],
        evidenceEvents: [
          makeEvidence(ctx, "osiris-satellites", "satellites", {
            source: "CelesTrak via OSIRIS",
            count,
            retrievedAt: new Date().toISOString(),
          }, sourceUrl, count),
        ],
        confidence: 0.85,
        limitations: ["TLE data has limited orbital prediction accuracy"],
      };
    } catch (err) {
      return emptyResult("osiris-satellites", ctx, "satellites", sourceUrl, [
        "CelesTrak data unavailable via OSIRIS proxy",
      ], [err instanceof Error ? err.message : String(err)]);
    }
  },
};

/* ========================================================================
   OSIRIS WEATHER ADAPTER — NASA EONET severe events
   ======================================================================== */
export const osirisWeatherAdapter: Adapter = {
  id: "osiris-weather",
  name: "OSIRIS Severe Weather (NASA EONET)",
  version: "1.0.0",
  category: "geospatial",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Public NASA EONET natural event data",
  dataSensitivity: "public",
  rateLimit: { requests: 30, windowMs: 60_000 },
  timeoutMs: 15_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const sourceUrl = "https://eonet.gsfc.nasa.gov";
    try {
      const data = await fetchOsirisFeed("weather", {
        rateLimit: { requests: 30, windowMs: 60_000 },
        timeoutMs: 15_000,
      });
      const features = data?.features ?? data ?? [];
      const count = Array.isArray(features) ? features.length : 0;
      return {
        observations: [
          { key: "weather_events", value: features, confidence: 0.8 },
          { key: "count", value: count },
        ],
        evidenceEvents: [
          makeEvidence(ctx, "osiris-weather", "weather", {
            source: "NASA EONET via OSIRIS",
            count,
            retrievedAt: new Date().toISOString(),
          }, sourceUrl, count),
        ],
        confidence: 0.8,
        limitations: ["Natural event data may have reporting delays"],
      };
    } catch (err) {
      return emptyResult("osiris-weather", ctx, "weather", sourceUrl, [
        "NASA EONET data unavailable via OSIRIS proxy",
      ], [err instanceof Error ? err.message : String(err)]);
    }
  },
};

/* ========================================================================
   OSIRIS CCTV ADAPTER — Public camera feeds
   ======================================================================== */
export const osirisCctvAdapter: Adapter = {
  id: "osiris-cctv",
  name: "OSIRIS Public CCTV",
  version: "1.0.0",
  category: "geospatial",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Publicly accessible CCTV and traffic camera feeds",
  dataSensitivity: "public",
  rateLimit: { requests: 10, windowMs: 60_000 },
  timeoutMs: 15_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const sourceUrl = "https://example.com/public-cctv";
    try {
      const data = await fetchOsirisFeed("cctv", {
        rateLimit: { requests: 10, windowMs: 60_000 },
        timeoutMs: 15_000,
      });
      const features = data?.features ?? data ?? [];
      const count = Array.isArray(features) ? features.length : 0;
      return {
        observations: [
          { key: "cameras", value: features, confidence: 0.6 },
          { key: "count", value: count },
        ],
        evidenceEvents: [
          makeEvidence(ctx, "osiris-cctv", "cctv", {
            source: "Public CCTV via OSIRIS",
            count,
            retrievedAt: new Date().toISOString(),
          }, sourceUrl, count),
        ],
        confidence: 0.6,
        limitations: ["Camera availability varies; feeds may be offline"],
      };
    } catch (err) {
      return emptyResult("osiris-cctv", ctx, "cctv", sourceUrl, [
        "CCTV data unavailable via OSIRIS proxy",
      ], [err instanceof Error ? err.message : String(err)]);
    }
  },
};

/* ========================================================================
   OSIRIS NEWS ADAPTER — Public news / GDELT-style events
   ======================================================================== */
export const osirisNewsAdapter: Adapter = {
  id: "osiris-news",
  name: "OSIRIS News & Events",
  version: "1.0.0",
  category: "osint",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Public news and event data feeds",
  dataSensitivity: "public",
  rateLimit: { requests: 30, windowMs: 60_000 },
  timeoutMs: 15_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const sourceUrl = "https://gdeltproject.org";
    try {
      const data = await fetchOsirisFeed("news", {
        rateLimit: { requests: 30, windowMs: 60_000 },
        timeoutMs: 15_000,
      });
      const features = data?.features ?? data ?? [];
      const count = Array.isArray(features) ? features.length : 0;
      return {
        observations: [
          { key: "news_events", value: features, confidence: 0.7 },
          { key: "count", value: count },
        ],
        evidenceEvents: [
          makeEvidence(ctx, "osiris-news", "news", {
            source: "Public news via OSIRIS",
            count,
            retrievedAt: new Date().toISOString(),
          }, sourceUrl, count),
        ],
        confidence: 0.7,
        limitations: ["News aggregation may have bias or latency"],
      };
    } catch (err) {
      return emptyResult("osiris-news", ctx, "news", sourceUrl, [
        "News data unavailable via OSIRIS proxy",
      ], [err instanceof Error ? err.message : String(err)]);
    }
  },
};

/* ========================================================================
   OSIRIS GDELT ADAPTER — GDELT event data
   ======================================================================== */
export const osirisGdeltAdapter: Adapter = {
  id: "osiris-gdelt",
  name: "OSIRIS GDELT Events",
  version: "1.0.0",
  category: "osint",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Public GDELT Global Database of Events, Language, and Tone",
  dataSensitivity: "public",
  rateLimit: { requests: 20, windowMs: 60_000 },
  timeoutMs: 15_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const sourceUrl = "https://gdeltproject.org";
    try {
      const data = await fetchOsirisFeed("gdelt", {
        rateLimit: { requests: 20, windowMs: 60_000 },
        timeoutMs: 15_000,
      });
      const features = data?.features ?? data ?? [];
      const count = Array.isArray(features) ? features.length : 0;
      return {
        observations: [
          { key: "gdelt_events", value: features, confidence: 0.75 },
          { key: "count", value: count },
        ],
        evidenceEvents: [
          makeEvidence(ctx, "osiris-gdelt", "gdelt", {
            source: "GDELT via OSIRIS",
            count,
            retrievedAt: new Date().toISOString(),
          }, sourceUrl, count),
        ],
        confidence: 0.75,
        limitations: ["GDELT event coding may have errors"],
      };
    } catch (err) {
      return emptyResult("osiris-gdelt", ctx, "gdelt", sourceUrl, [
        "GDELT data unavailable via OSIRIS proxy",
      ], [err instanceof Error ? err.message : String(err)]);
    }
  },
};

/* ========================================================================
   OSIRIS OSINT ADAPTER — General OSINT intelligence
   ======================================================================== */
export const osirisOsintAdapter: Adapter = {
  id: "osiris-osint",
  name: "OSIRIS OSINT Intelligence",
  version: "1.0.0",
  category: "osint",
  riskLevel: "low",
  requiresApproval: false,
  legalBasis: "Publicly available open-source intelligence",
  dataSensitivity: "public",
  rateLimit: { requests: 20, windowMs: 60_000 },
  timeoutMs: 15_000,

  async execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult> {
    const sourceUrl = "https://osiris-intelligence.local";
    try {
      const data = await fetchOsirisFeed("osint", {
        rateLimit: { requests: 20, windowMs: 60_000 },
        timeoutMs: 15_000,
      });
      const features = data?.features ?? data ?? [];
      const count = Array.isArray(features) ? features.length : 0;
      return {
        observations: [
          { key: "osint_observations", value: features, confidence: 0.65 },
          { key: "count", value: count },
        ],
        evidenceEvents: [
          makeEvidence(ctx, "osiris-osint", "osint", {
            source: "OSIRIS OSINT feed",
            count,
            retrievedAt: new Date().toISOString(),
          }, sourceUrl, count),
        ],
        confidence: 0.65,
        limitations: ["OSINT data quality varies by source"],
      };
    } catch (err) {
      return emptyResult("osiris-osint", ctx, "osint", sourceUrl, [
        "OSINT data unavailable via OSIRIS proxy",
      ], [err instanceof Error ? err.message : String(err)]);
    }
  },
};

/* ========================================================================
   Registry of all OSIRIS intelligence adapters
   ======================================================================== */
export const OSIRIS_ADAPTERS: Record<string, Adapter> = {
  "osiris-flights": osirisFlightsAdapter,
  "osiris-earthquakes": osirisEarthquakesAdapter,
  "osiris-fires": osirisFiresAdapter,
  "osiris-maritime": osirisMaritimeAdapter,
  "osiris-satellites": osirisSatellitesAdapter,
  "osiris-weather": osirisWeatherAdapter,
  "osiris-cctv": osirisCctvAdapter,
  "osiris-news": osirisNewsAdapter,
  "osiris-gdelt": osirisGdeltAdapter,
  "osiris-osint": osirisOsintAdapter,
};

export const OSIRIS_ADAPTER_LIST = Object.values(OSIRIS_ADAPTERS);

export { fetchOsirisHealth };
