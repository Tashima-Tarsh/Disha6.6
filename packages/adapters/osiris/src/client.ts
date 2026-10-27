"use client";

/**
 * Shared client for calling DISHA's OSIRIS intelligence proxy routes.
 * All requests go through /api/intelligence/<feed> which is authenticated
 * and proxies to the OSIRIS service (localhost:3005).
 *
 * The proxy enforces a fixed allowlist of feed paths — no user-supplied
 * URLs are ever forwarded — so there is no SSRF surface.
 */

const BASE = "/api/intelligence";

const rateLimitState = new Map<string, { lastCall: number; calls: number }>();

function checkRateLimit(feed: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const state = rateLimitState.get(feed) ?? { lastCall: now, calls: 0 };
  if (now - state.lastCall > windowMs) {
    rateLimitState.set(feed, { lastCall: now, calls: 1 });
    return true;
  }
  if (state.calls >= limit) return false;
  state.calls += 1;
  rateLimitState.set(feed, state);
  return true;
}

export interface OsirisFeedOptions {
  feed: string;
  rateLimit?: { requests: number; windowMs: number };
  timeoutMs?: number;
}

export async function fetchOsirisFeed(
  feed: string,
  { rateLimit, timeoutMs = 15000 }: OsirisFeedOptions = {}
): Promise<any> {
  if (rateLimit && !checkRateLimit(feed, rateLimit.requests, rateLimit.windowMs)) {
    throw new Error(`rate_limit_exceeded:${feed}`);
  }

  const res = await fetch(`${BASE}/${encodeURIComponent(feed)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Request-ID": "osiris-adapter",
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 404) {
      return { status: "configuration_required", features: [], count: 0 };
    }
    if (res.status === 401) {
      return { status: "unavailable", features: [], count: 0 };
    }
    throw new Error(`osiris feed ${feed} returned ${res.status}`);
  }

  return res.json();
}

export async function fetchOsirisHealth(): Promise<any> {
  const res = await fetch(`${BASE}/health`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, feeds: {} };
  return res.json();
}
