"use client";

import type { AdapterMetadata, AdapterHealth } from "@/lib/unified/osint-adapter-bus";

import {
  OSIRIS_ADAPTER_LIST,
  OSIRIS_ADAPTERS,
  fetchOsirisHealth,
} from "@/packages/adapters/osiris";

export function osirisAdapterMetadata(): AdapterMetadata[] {
  return OSIRIS_ADAPTER_LIST.map((a) => ({
    id: a.id,
    name: a.name,
    version: a.version,
    capability: `osiris_${a.category}_intelligence`,
    auth: "none",
    legalUse: [a.legalBasis, "Public passive intelligence observation", "Situational awareness"],
    blockedUse: ["Active scanning", "Unauthorized intrusion", "Private data harvesting"],
    rateLimitPerMinute: Math.floor(60_000 / Math.max(1, a.rateLimit.requests)),
    timeoutMs: a.timeoutMs,
    maxRetries: 1,
    executionClass: "passive_public",
    defaultEnabled: true,
    upstreamRepository: "https://github.com/simplifaisoul/osiris",
  }));
}

export function getOsirisAdapter(adapterId: string) {
  return OSIRIS_ADAPTERS[adapterId];
}

export function listOsirisAdapters() {
  return Object.values(OSIRIS_ADAPTERS);
}

export async function osirisHealth(): Promise<AdapterHealth> {
  try {
    const health = await fetchOsirisHealth();
    return health.ok ? "healthy" : "degraded";
  } catch {
    return "unavailable";
  }
}

export const OSIRIS_ADAPTER_REGISTRY = {
  id: "osiris-intelligence-subsystem",
  name: "OSIRIS Global Intelligence Subsystem",
  version: "1.0.0",
  upstreamUrl: "https://github.com/simplifaisoul/osiris",
  pinnedSha: "085b2429b11b2b1af43880caaa088575cc98c14f",
  deployPort: 3005,
  adapters: OSIRIS_ADAPTER_LIST.length,
  health: osirisHealth,
  metadata: osirisAdapterMetadata,
};
