import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { getOsintMetrics } from "@/lib/unified/osint-runtime-service";

const BACKEND = process.env.DISHA_OSINT_BACKEND_URL ?? process.env.NEXT_PUBLIC_OSINT_BACKEND ?? "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const metrics = await getOsintMetrics();
    let backendReachable = false;
    let backendHealth: unknown = null;
    try {
      const res = await fetch(`${BACKEND}/`, {
        signal: AbortSignal.any([req.signal, AbortSignal.timeout(5000)]),
        redirect: "error",
        cache: "no-store",
      });
      if (res.ok) {
        backendReachable = true;
        backendHealth = await res.json();
      }
    } catch {
      backendReachable = false;
    }

    // Service reachability is not evidence that any particular tool executed.
    // Never add the backend process to the OSINT tool-level healthy count.
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...metrics,
      backend: { reachable: backendReachable, health: backendHealth },
      status: metrics.healthy > 0
        ? (metrics.degraded > 0 || metrics.unconfigured > 0 ? "DEGRADED" : "OPERATIONAL")
        : metrics.degraded > 0 ? "DEGRADED" : "UNCONFIGURED",
      truthfulInvariant: "Tool operational status requires observed successful runtime evidence, not process reachability.",
    }, {
      headers: { "X-Request-ID": ctx.requestId, "Cache-Control": "no-store, max-age=0" },
    });
  });
}
