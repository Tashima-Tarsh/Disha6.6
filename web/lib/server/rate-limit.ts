import type { NextRequest } from "next/server";
import crypto from "node:crypto";
import { getEnv, isProduction } from "./env";
import { getRedisClient } from "./redis";

const memory = new Map<string, number[]>();
const WINDOW_SECONDS = 60;
const MAX_MEMORY_KEYS = 10_000;

function sweepMemoryRateLimits(now: number): void {
  if (memory.size > MAX_MEMORY_KEYS) {
    for (const [k, b] of memory.entries()) {
      const active = b.filter((ts) => now - ts < WINDOW_SECONDS * 1000);
      if (active.length === 0) {
        memory.delete(k);
      } else {
        memory.set(k, active);
      }
    }
    while (memory.size > MAX_MEMORY_KEYS) {
      const firstKey = memory.keys().next().value;
      if (firstKey) memory.delete(firstKey);
      else break;
    }
  }
}

function resolveClientIdentity(req: NextRequest): string {
  // 1. Authenticated principal token or API key binding
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const tokenHash = crypto.createHash("sha256").update(authHeader.slice(7).trim()).digest("hex").slice(0, 16);
    return `auth:${tokenHash}`;
  }

  // 2. Cloudflare verified connecting IP
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return `ip:${cfIp}`;

  // 3. True-Client-IP header
  const trueClientIp = req.headers.get("true-client-ip")?.trim();
  if (trueClientIp) return `ip:${trueClientIp}`;

  // 4. Sanitized X-Real-IP
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return `ip:${realIp}`;

  // 5. Fallback X-Forwarded-For: sanitize and extract last untrusted hop
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    if (ips.length > 0) {
      const candidate = ips[0].replace(/[^a-fA-F0-9.:]/g, "");
      if (candidate) return `ip:${candidate}`;
    }
  }

  return "local";
}

export async function checkRateLimit(req: NextRequest): Promise<boolean> {
  const env = getEnv();
  const identity = resolveClientIdentity(req);
  const key = `rate:${identity}:${req.nextUrl.pathname}`;
  const redis = await getRedisClient();

  if (redis) {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
    return count <= env.DISHA_WEB_RATE_LIMIT;
  }

  if (isProduction() && process.env.DISHA_REQUIRE_REDIS === "1") {
    console.error("[rate-limit] FATAL: Redis is required for production distributed rate limiting.");
    return false;
  }

  const now = Date.now();
  const existing = memory.get(key);
  const bucket = existing ? existing.filter((ts) => now - ts < WINDOW_SECONDS * 1000) : [];
  if (bucket.length >= env.DISHA_WEB_RATE_LIMIT) {
    memory.set(key, bucket);
    return false;
  }
  bucket.push(now);
  memory.set(key, bucket);
  sweepMemoryRateLimits(now);
  return true;
}
