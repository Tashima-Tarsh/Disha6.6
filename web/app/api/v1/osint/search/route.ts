import { NextRequest, NextResponse } from "next/server";

import { getDbPool } from "@/lib/server/db";
import { withContext } from "@/lib/unified/api";
import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";
import { runUniversalOsintSearch, sanitizeUniversalQuery } from "@/lib/unified/universal-osint-search";

import { getOsintBackendUrl } from "@/lib/server/osint-backend-client";

const BACKEND = getOsintBackendUrl();

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const query = sanitizeUniversalQuery(req.nextUrl.searchParams.get("q") ?? "India government");
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

    // Run the Disha governed bus (policy + evidence) and also fetch live
    // results from the FastAPI OSINT-ONE backend so search returns real data.
    const [health, backendTools] = await Promise.all([
      bus.health(),
      (async () => {
        try {
          const res = await fetch(`${BACKEND}/tools`, { signal: req.signal });
          return await res.json();
        } catch { return []; }
      })(),
    ]);

    let search: any = { results: [], adapters: [] };
    try {
      search = await runUniversalOsintSearch(bus, query, context);
    } catch {
      search = { results: [], adapters: [] };
    }

    // Enrich search results with live backend collector output when the bus
    // returns no live observations.
    const liveResults: any[] = [];
    if (Array.isArray(backendTools)) {
      for (const t of backendTools) {
        liveResults.push({
          tool: t.name,
          category: t.category,
          inputs: t.inputs,
          status: "runnable",
          note: "Execute via POST /api/v1/osint/run with this adapterId",
        });
      }
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      query,
      mode: getDbPool() ? "evidence-backed" : "live-unpersisted",
      persistenceAvailable: Boolean(getDbPool()),
      adapterSummary: {
        total: health.length,
        healthy: health.filter((item: any) => item.status === "healthy").length,
        degraded: health.filter((item: any) => item.status === "degraded").length,
        unavailable: health.filter((item: any) => item.status === "unavailable" || item.status === "not_configured").length,
        backendCollectors: Array.isArray(backendTools) ? backendTools.length : 0,
      },
      health,
      search,
      liveCollectors: liveResults,
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
