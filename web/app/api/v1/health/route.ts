import { NextResponse } from "next/server";
import { getEnv } from "@/lib/server/env";
import { getDbPool } from "@/lib/server/db";
import { getRedisClient } from "@/lib/server/redis";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const env = getEnv();
    const pool = getDbPool();
    if (!pool) return NextResponse.json({ status: "unconfigured", database: "unconfigured" }, { status: 503 });
    const schema = await pool.query("select to_regclass('public.evidence_events') as evidence, to_regclass('public.mission_results') as missions, to_regclass('public.durable_work_items') as workflows, to_regclass('public.password_credentials') as accounts");
    if (!schema.rows[0]?.evidence || !schema.rows[0]?.missions || !schema.rows[0]?.workflows || !schema.rows[0]?.accounts) throw new Error("schema_unavailable");
    const redis = await getRedisClient();
    if (env.NODE_ENV === "production" && !redis) throw new Error("redis_unconfigured");
    if (redis && await redis.ping() !== "PONG") throw new Error("redis_unavailable");
    return NextResponse.json({ status: "ok", database: "ready", redis: redis ? "ready" : "unconfigured", release: process.env.DISHA_RELEASE_SHA ?? "unknown" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
