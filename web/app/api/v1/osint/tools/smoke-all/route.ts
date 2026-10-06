import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { loadOsintRegistry, smokeTestOsintTool, getOsintMetrics } from "@/lib/unified/osint-runtime-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const registry = await loadOsintRegistry();

    // Probe the top/core tools (e.g. up to 25 to respect request timeouts)
    const targets = registry.slice(0, 25);
    const results = [];

    for (const tool of targets) {
      try {
        const res = await smokeTestOsintTool(tool.toolId);
        results.push({ toolId: tool.toolId, status: "completed", result: res });
      } catch (err: unknown) {
        results.push({ toolId: tool.toolId, status: "error", error: err instanceof Error ? err.message : "failed" });
      }
    }

    const updatedMetrics = await getOsintMetrics();

    return NextResponse.json({
      testedCount: targets.length,
      results,
      metrics: updatedMetrics,
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
