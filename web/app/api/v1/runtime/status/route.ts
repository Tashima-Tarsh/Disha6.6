import { NextRequest, NextResponse } from "next/server";

import { getDbPool } from "@/lib/server/db";
import { getRedisClient } from "@/lib/server/redis";
import { withContext } from "@/lib/unified/api";
import { listDynamicSourcePolicies, type DynamicSourcePolicy } from "@/lib/unified/dynamic-source-scheduler";
import { modelRoutingStatus } from "@/lib/unified/model-router";
import { embeddingRoutingStatus } from "@/lib/unified/embedding-provider";
import { checkGovernedResearchRuntimeHealth } from "@/lib/extensions/research-runtime";
import { getPentagiStatus } from "@/lib/server/pentagi";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const db = getDbPool();
    let database: "ok" | "unconfigured" | "error" = db ? "ok" : "unconfigured";
    if (db) {
      try { await db.query("select 1"); } catch { database = "error"; }
    }
    let redis: "ok" | "unconfigured" | "error" = "unconfigured";
    try {
      const client = await getRedisClient();
      if (client) { await client.ping(); redis = "ok"; }
    } catch { redis = "error"; }
    const [routes, embedding, policies, research, pentagi] = await Promise.all([modelRoutingStatus(), embeddingRoutingStatus(), listDynamicSourcePolicies(), checkGovernedResearchRuntimeHealth(), getPentagiStatus()]);
    const body = {
      generatedAt: new Date().toISOString(),
      database,
      redis,
      modelRoutes: routes,
      embeddingRoute: embedding,
      sourceScheduler: {
        policyCount: policies.length,
        enabledCount: policies.filter((policy: DynamicSourcePolicy) => policy.enabled).length,
        nextDueAt: policies.filter((policy: DynamicSourcePolicy) => policy.enabled).map((policy: DynamicSourcePolicy) => policy.nextRunAt).sort()[0] ?? null,
      },
      researchRuntime: research,
      pentagi,
    };
    return NextResponse.json(body, { headers: { "X-Request-ID": ctx.requestId } });
  });
}
