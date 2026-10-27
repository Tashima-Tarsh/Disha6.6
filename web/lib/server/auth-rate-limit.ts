import type { NextRequest } from "next/server";
import crypto from "node:crypto";
import { getRedisClient } from "./redis";
import { getEnv } from "./env";

const WINDOW_SECONDS = 60;
const MAX_ATTEMPTS = 5; // per window before lockout
const DELAY_STEPS_MS = [500, 1000, 2000, 4000];
const LOCKOUT_TTL_SECONDS = 15 * 60; // 15 minutes

type AttemptResult = {
  allowed: boolean;
  delayMs: number;
  remaining: number;
  reason?: string;
};

function rateKey(scope: string, identity: string, pathname: string): string {
  return `auth:ratelimit:${scope}:${identity}:${pathname}`;
}

function clientIdentity(req: NextRequest): string {
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return `ip:${cfIp}`;
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return `ip:${realIp}`;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    if (ips.length > 0) return `ip:${ips[0]}`;
  }
  return "ip:local";
}

function deviceId(req: NextRequest): string {
  const header = req.headers.get("x-device-id");
  if (header) return `dev:${header}`;
  const ua = req.headers.get("user-agent") ?? "unknown";
  const acceptLang = req.headers.get("accept-language") ?? "";
  return `dev:${crypto.createHash("sha256").update(`${ua}|${acceptLang}`).digest("hex").slice(0, 16)}`;
}

async function redisIncr(key: string): Promise<{ count: number; ttl: number } | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, WINDOW_SECONDS);
  const ttl = await redis.ttl(key);
  return { count, ttl: ttl > 0 ? ttl : WINDOW_SECONDS };
}

// In-memory fallback (single instance). Production should have Redis.
const memory = new Map<string, { count: number; first: number }>();
const MAX_MEMORY_KEYS = 10_000;

function memoryIncr(key: string): { count: number; ttl: number } {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry) {
    memory.set(key, { count: 1, first: now });
    sweepMemory();
    return { count: 1, ttl: WINDOW_SECONDS };
  }
  if (now - entry.first > WINDOW_SECONDS * 1000) {
    entry.count = 1;
    entry.first = now;
  } else {
    entry.count += 1;
  }
  return { count: entry.count, ttl: WINDOW_SECONDS - Math.floor((now - entry.first) / 1000) };
}

function sweepMemory(): void {
  if (memory.size <= MAX_MEMORY_KEYS) return;
  const now = Date.now();
  for (const [k, v] of memory.entries()) {
    if (now - v.first > WINDOW_SECONDS * 1000) memory.delete(k);
  }
  while (memory.size > MAX_MEMORY_KEYS) {
    const first = memory.keys().next().value;
    if (first) memory.delete(first);
    else break;
  }
}

export async function checkAuthRateLimit(
  req: NextRequest,
  scope: "ip" | "account" | "device",
  identity: string,
): Promise<AttemptResult> {
  const pathname = req.nextUrl.pathname;
  const key = rateKey(scope, identity, pathname);
  const result = (await redisIncr(key)) ?? memoryIncr(key);

  if (result.count > MAX_ATTEMPTS) {
    return {
      allowed: false,
      delayMs: 0,
      remaining: 0,
      reason: `locked_out_${scope}`,
    };
  }

  // Progressive delay based on attempt count within window
  const delayIndex = Math.min(result.count - 1, DELAY_STEPS_MS.length - 1);
  const delayMs = result.count >= 1 ? DELAY_STEPS_MS[delayIndex] : 0;

  return {
    allowed: true,
    delayMs,
    remaining: MAX_ATTEMPTS - result.count,
  };
}

export async function checkAllAuthRateLimits(
  req: NextRequest,
  accountIdentity?: string,
): Promise<{ allowed: boolean; delayMs: number; reason?: string }> {
  const ipResult = await checkAuthRateLimit(req, "ip", clientIdentity(req));
  const deviceResult = await checkAuthRateLimit(req, "device", deviceId(req));
  const accountResult = accountIdentity
    ? await checkAuthRateLimit(req, "account", `acct:${accountIdentity}`)
    : { allowed: true, delayMs: 0, remaining: MAX_ATTEMPTS };

  const results = [ipResult, deviceResult, accountResult];
  const locked = results.find((r) => !r.allowed);
  if (locked) return { allowed: false, delayMs: 0, reason: locked.reason };

  const delayMs = Math.max(ipResult.delayMs, deviceResult.delayMs, accountResult.delayMs);
  return { allowed: true, delayMs };
}

export async function recordLockout(req: NextRequest, accountIdentity: string): Promise<void> {
  const keyIp = rateKey("lockout", clientIdentity(req), req.nextUrl.pathname);
  const keyAcct = rateKey("lockout", `acct:${accountIdentity}`, req.nextUrl.pathname);
  const keyDev = rateKey("lockout", deviceId(req), req.nextUrl.pathname);
  const redis = await getRedisClient();
  const set = async (k: string) => {
    if (redis) await redis.set(k, "1", { EX: LOCKOUT_TTL_SECONDS });
    else memory.set(k, { count: MAX_ATTEMPTS + 1, first: Date.now() });
  };
  await set(keyIp);
  await set(keyAcct);
  await set(keyDev);
}

export function progressiveDelayMs(attemptCount: number): number {
  const index = Math.min(Math.max(attemptCount - 1, 0), DELAY_STEPS_MS.length - 1);
  return DELAY_STEPS_MS[index];
}
