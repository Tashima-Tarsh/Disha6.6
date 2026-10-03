import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { buildCanonicalUniverseRuntime } from "@/lib/unified/canonical-source-registry";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const universe = await buildCanonicalUniverseRuntime();

    return NextResponse.json({
      ...universe,
      authenticatedPrincipal: {
        userId: ctx.principal?.userId ?? "anonymous",
        roles: ctx.principal?.roles ?? [],
      },
      truthfulInvariant: "Real Data or No Data. Missing providers render as UNCONFIGURED or UNAVAILABLE; zero synthetic intelligence or simulated telemetry is admitted.",
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
