import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { getOsintMetrics } from "@/lib/unified/osint-runtime-service";

const BACKEND = process.env.NEXT_PUBLIC_OSINT_BACKEND ?? "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const metrics = await getOsintMetrics();

    let backendHealth: any = null;
    try {
      const res = await fetch(`${BACKEND}/`, { signal: req.signal });
      backendHealth = await res.json();
    } catch { backendHealth = null; }

    const healthy = metrics.healthy + (backendHealth ? 1 : 0);
    const total = metrics.total + (backendHealth ? 1 : 0);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...metrics,
      backend: backendHealth,
      status: healthy > 0 ? (total === healthy ? "OPERATIONAL" : "DEGRADED") : "UNCONFIGURED",
      truthfulInvariant: "Real Data or No Data. Metrics reflect verified runtime execution states without simulation. Backend live collectors return real data.",
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
