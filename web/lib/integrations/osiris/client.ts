"use client";

export type FeedStatus = "live" | "degraded" | "unavailable" | "configuration_required";

export interface FeedResult {
  layer: string;
  count: number;
  fetchedAt: string;
  status: FeedStatus;
  source: string;
  sourceUrl: string;
  features: unknown[];
}

class IntelligenceFeedClient {
  private base = "/api/intelligence";

  async getFeed(layer: string): Promise<any> {
    const res = await fetch(`${this.base}/${encodeURIComponent(layer)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      if (res.status === 404) {
        return { status: "configuration_required", features: [], count: 0 };
      }
      if (res.status === 401) {
        return { status: "unavailable", features: [], count: 0 };
      }
      throw new Error(`feed ${layer} returned ${res.status}`);
    }
    return res.json();
  }

  async health(): Promise<{ ok: boolean; feeds: Record<string, FeedStatus> }> {
    const res = await fetch(`${this.base}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, feeds: {} };
    return res.json();
  }
}

export const intelligenceFeedClient = new IntelligenceFeedClient();
