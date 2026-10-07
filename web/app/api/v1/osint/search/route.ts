import { NextRequest, NextResponse } from "next/server";

import { getDbPool } from "@/lib/server/db";
import { withContext } from "@/lib/unified/api";
import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";
import { runUniversalOsintSearch, sanitizeUniversalQuery } from "@/lib/unified/universal-osint-search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const rawQuery = req.nextUrl.searchParams.get("q");
    if (!rawQuery?.trim()) {
      return NextResponse.json(
        { error: "Query is required." },
        { status: 400, headers: { "X-Request-ID": ctx.requestId, "Cache-Control": "no-store, max-age=0" } },
      );
    }
    const query = sanitizeUniversalQuery(rawQuery);
    const bus = createDefaultOsintBus({
      policyCheck: (metadata) => {
        const executionClass = metadata.executionClass ?? "passive_public";
        return (executionClass === "passive_public" || executionClass === "credentialed_public_api")
          && metadata.defaultEnabled !== false;
      },
    });

    const context = {
      missionId: "universal-osint-search",
      userId: ctx.principal.userId,
      purpose: "Governed universal search across approved passive and public OSINT adapters",
      signal: req.signal,
    };

    const [health, search] = await Promise.all([
      bus.health(),
      runUniversalOsintSearch(bus, query, context),
    ]);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      mode: getDbPool() ? "evidence-backed" : "live-unpersisted",
      persistenceAvailable: Boolean(getDbPool()),
      adapterSummary: {
        total: health.length,
        healthy: health.filter((item) => item.status === "healthy").length,
        degraded: health.filter((item) => item.status === "degraded").length,
        unavailable: health.filter((item) => item.status === "unavailable" || item.status === "not_configured").length,
      },
      health,
      search,
      notice: getDbPool()
        ? "Universal Search returns source-linked observations; persistence is available through the governed evidence workflow."
        : "Universal Search is live, but DATABASE_URL is unavailable so this request is not durably persisted.",
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
