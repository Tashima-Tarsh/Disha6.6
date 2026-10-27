"use client";

import type { IntelligenceActivationInput } from "@/lib/unified/intelligence-activation";
import { osirisReconAdapter, listReconAdapterMetadata, checkReconAdapterHealth } from "@/lib/unified/osiris-recon-adapter";
import {
  listOsirisAdapterMetadata,
  checkOsirisAdaptersHealth,
  OSIRIS_INTELLIGENCE_ADAPTERS,
} from "@/lib/unified/osiris-intelligence-adapters";

/**
 * OSIRIS Workflow Integration.
 *
 * Connects OSIRIS intelligence capabilities to DISHA's workflow executor
 * (workflow-executor.ts) and VYUHA defense engine. OSIRIS adapters are
 * exposed as permissible, versioned integrations that workflows can select,
 * validate readiness for, and collect observations from.
 *
 * All OSIRIS capabilities are passive_public except osiris-recon which is
 * active_recon and requires explicit target authorization.
 */

export interface OsirisSourceConfig {
  sourceId: string;
  feed: string;
  enabled: boolean;
}

export const OSIRIS_SOURCE_CONFIGS: OsirisSourceConfig[] = [
  { sourceId: "osiris-flights", feed: "flights", enabled: true },
  { sourceId: "osiris-earthquakes", feed: "earthquakes", enabled: true },
  { sourceId: "osiris-fires", feed: "fires", enabled: true },
  { sourceId: "osiris-maritime", feed: "maritime", enabled: true },
  { sourceId: "osiris-satellites", feed: "satellites", enabled: true },
  { sourceId: "osiris-weather", feed: "weather", enabled: true },
  { sourceId: "osiris-cctv", feed: "cctv", enabled: true },
  { sourceId: "osiris-news", feed: "news", enabled: true },
  { sourceId: "osiris-gdelt", feed: "gdelt", enabled: true },
  { sourceId: "osiris-osint", feed: "osint", enabled: true },
];

/**
 * Returns all OSIRIS integration metadata for discovery in DISHA's
 * integration registry. Each entry includes id, name, version, capability,
 * execution class, and health status.
 */
export function listOsirisIntegrations() {
  return [
    ...listOsirisAdapterMetadata(),
    ...listReconAdapterMetadata(),
  ].map((m) => ({
    ...m,
    integrationType: m.executionClass === "active_recon" ? "recon" : "intelligence_feed",
    upstream: "osiris",
    pinnedSha: "085b2429b11b2b1af43880caaa088575cc98c14f",
  }));
}

/**
 * Validates that an OSIRIS adapter is ready for execution. Returns readiness
 * status and any warnings. Workflows should call this before selecting an
 * adapter.
 */
export async function validateOsirisAdapterReadiness(adapterId: string): Promise<{
  ready: boolean;
  health: "healthy" | "degraded" | "unavailable" | "not_configured";
  warnings: string[];
}> {
  const warnings: string[] = [];

  // Intelligence feed adapters
  const feedAdapter = OSIRIS_INTELLIGENCE_ADAPTERS[adapterId];
  if (feedAdapter) {
    const health = await feedAdapter.health();
    if (health.status === "not_configured") {
      return { ready: false, health: "not_configured", warnings: [`OSIRIS ${adapterId} not configured`] };
    }
    if (health.status === "unavailable") {
      return { ready: false, health: "unavailable", warnings: [`OSIRIS ${adapterId} unavailable`] };
    }
    return { ready: true, health: health.status as any, warnings };
  }

  // Recon adapter (active_recon - requires authorization)
  if (adapterId === "osiris-recon") {
    const health = await checkReconAdapterHealth();
    if (health === "not_configured") {
      return { ready: false, health: "not_configured", warnings: ["OSIRIS RECON scanner not configured — set SCANNER_URL and SCANNER_KEY"] };
    }
    return { ready: true, health: health as any, warnings: ["RECON requires explicit target authorization"] };
  }

  return { ready: false, health: "unavailable", warnings: [`Unknown OSIRIS adapter: ${adapterId}`] };
}

/**
 * Executes an OSIRIS adapter through DISHA's governed workflow. Collects
 * observations and creates evidence events. Returns the adapter result with
 * full provenance.
 */
export async function executeOsirisAdapter(
  adapterId: string,
  input: { target?: string; id?: string; limit?: number; registration?: string; model?: string; icao24?: string },
  ctx: { missionId: string; userId: string; purpose: string; signal?: AbortSignal }
) {
  const feedAdapter = OSIRIS_INTELLIGENCE_ADAPTERS[adapterId];
  if (feedAdapter) {
    const readiness = await validateOsirisAdapterReadiness(adapterId);
    if (!readiness.ready) {
      return {
        success: false,
        error: readiness.warnings.join("; "),
        readiness,
      };
    }
    const result = await feedAdapter.execute(
      { target: input.target, limit: input.limit },
      {
        missionId: ctx.missionId,
        userId: ctx.userId,
        purpose: ctx.purpose,
        signal: ctx.signal,
      }
    );
    return { success: true, result, readiness };
  }

  if (adapterId === "osiris-recon") {
    const readiness = await validateOsirisAdapterReadiness(adapterId);
    if (!readiness.ready) {
      return { success: false, error: readiness.warnings.join("; "), readiness };
    }
    if (!input.id) {
      return { success: false, error: "RECON requires an entity id", readiness };
    }
    const result = await osirisReconAdapter.execute(
      {
        type: input.target ?? "ip",
        id: input.id,
        registration: input.registration,
        model: input.model,
        icao24: input.icao24,
      },
      {
        missionId: ctx.missionId,
        userId: ctx.userId,
        purpose: ctx.purpose,
        signal: ctx.signal,
      }
    );
    return { success: true, result, readiness };
  }

  return { success: false, error: `Unknown OSIRIS adapter: ${adapterId}` };
}

/**
 * Connects OSIRIS threat intelligence to VYUHA's defensive decision support.
 * OSIRIS observations (sanctions matches, suspicious IPs, aircraft over
 * conflict zones, etc.) are translated into VYUHA-compatible signals that
 * the defense engine can evaluate for defensive posture recommendations.
 *
 * No-First-Use is preserved: VYUHA only proposes defensive actions, it never
 * executes them. Execution requires DISHA policy approval.
 */
export function osirisToVyuhasignal(
  osirisResult: { feed: string; count: number; status: string; features?: unknown[] },
  missionContext: { missionId: string; rawText?: string; indicators?: Array<{ type: string; value: string }> }
) {
  const signals: Array<{
    indicator: string;
    type: "ip" | "domain" | "url" | "entity";
    source: string;
    confidence: number;
    severity: "low" | "medium" | "high" | "critical";
  }> = [];

  const features = Array.isArray(osirisResult.features) ? osirisResult.features : [];

  for (const feature of features) {
    const f = feature as Record<string, unknown>;
    const props = f.properties as Record<string, unknown> ?? {};

    // Extract IPs from OSIRIS resolve results (IP geolocation)
    if (f.type === "ip" || props.ip) {
      signals.push({
        indicator: String(f.id ?? props.ip ?? ""),
        type: "ip",
        source: `OSIRIS ${osirisResult.feed}`,
        confidence: 0.8,
        severity: "medium",
      });
    }

    // Extract domains from sanctions/country results
    if (f.type === "country" || props.country) {
      signals.push({
        indicator: String(f.label ?? props.country ?? ""),
        type: "domain",
        source: `OSIRIS ${osirisResult.feed}`,
        confidence: 0.7,
        severity: "low",
      });
    }

    // Extract companies from sanctions matches
    if (f.type === "company" || props.schema === "LegalEntity") {
      signals.push({
        indicator: String(f.label ?? props.name ?? ""),
        type: "entity",
        source: `OSIRIS ${osirisResult.feed}`,
        confidence: 0.85,
        severity: props.sanctioned ? "high" : "medium",
      });
    }
  }

  // Also scan mission text for OSIRIS-relevant indicators
  const text = (missionContext.rawText ?? "").toLowerCase();
  const threatKeywords = ["sanction", "threat", "malicious", "apt", "conflict", "war", "strike"];
  const hasThreat = threatKeywords.some((k) => text.includes(k));
  if (hasThreat && osirisResult.count > 0) {
    signals.push({
      indicator: `osiris-${osirisResult.feed}-threat-context`,
      type: "entity",
      source: `OSIRIS ${osirisResult.feed}`,
      confidence: 0.6,
      severity: "medium",
    });
  }

  return {
    source: "osiris-intelligence",
    missionId: missionContext.missionId,
    signals,
    signalCount: signals.length,
    osirisFeed: osirisResult.feed,
    osirisStatus: osirisResult.status,
    timestamp: new Date().toISOString(),
    noFirstUse: true,
    defensiveOnly: true,
    note: "VYUHA evaluates these signals for defensive posture proposals only. No offensive action is authorized.",
  };
}
