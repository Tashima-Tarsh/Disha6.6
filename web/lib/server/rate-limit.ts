import type { NextRequest } from "next/server";
import { getEnv } from "./env";
import { getRedisClient } from "./redis";

const memory = new Map<string, number[]>();
const WINDOW_SECONDS = 60;

export async function checkRateLimit(req: NextRequest): Promise<boolean> {
  const env = getEnv();
  const forwarded = process.env.DISHA_TRUST_PROXY === "true" ? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() : undefined;
  const key = `rate:${forwarded ?? "local"}:${req.nextUrl.pathname}`;
  const redis = await getRedisClient();
  if (redis) {
    const count = Number(await redis.eval("local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n", { keys: [key], arguments: [String(WINDOW_SECONDS)] }));
    return count <= env.DISHA_WEB_RATE_LIMIT;
  }
  if (env.NODE_ENV === "production") throw Object.assign(new Error("Rate-limit service is unavailable"), { status: 503 });
  const now = Date.now();
  for (const [storedKey, timestamps] of memory) if (!timestamps.some((ts) => now - ts < WINDOW_SECONDS * 1000)) memory.delete(storedKey);
  if (!memory.has(key) && memory.size >= 10000) return false;
  const bucket = memory.get(key)?.filter((ts) => now - ts < WINDOW_SECONDS * 1000) ?? [];
  if (bucket.length >= env.DISHA_WEB_RATE_LIMIT) {
    memory.set(key, bucket);
    return false;
  }
  bucket.push(now);
  memory.set(key, bucket);
  return true;
}
