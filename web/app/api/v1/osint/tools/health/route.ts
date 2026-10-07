import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { getOsintMetrics } from "@/lib/unified/osint-runtime-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const metrics = await getOsintMetrics();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...metrics,
      status: metrics.degraded > 0 ? "DEGRADED" : metrics.healthy > 0 ? "OPERATIONAL" : "UNCONFIGURED",
      truthfulInvariant: "Real Data or No Data. Metrics reflect verified runtime execution states without simulation.",
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
