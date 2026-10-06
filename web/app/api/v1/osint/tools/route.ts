import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { loadOsintRegistry, type OsintToolRecord } from "@/lib/unified/osint-runtime-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const registry = await loadOsintRegistry();
    const url = new URL(req.url);

    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status");
    const runtime = url.searchParams.get("runtime");
    const search = url.searchParams.get("search")?.toLowerCase();
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "100", 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));

    let filtered = registry;

    if (category) {
      filtered = filtered.filter((t: OsintToolRecord) => t.category.toLowerCase() === category.toLowerCase());
    }

    if (status) {
      filtered = filtered.filter((t: OsintToolRecord) => t.status.toLowerCase() === status.toLowerCase());
    }

    if (runtime) {
      filtered = filtered.filter((t: OsintToolRecord) => t.runtimeType.toLowerCase() === runtime.toLowerCase());
    }

    if (search) {
      filtered = filtered.filter((t: OsintToolRecord) =>
        t.name.toLowerCase().includes(search) ||
        t.toolId.toLowerCase().includes(search) ||
        t.fullName.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search),
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      total,
      limit,
      offset,
      tools: paginated,
      truthfulInvariant: "Real Data or No Data. Missing tools render with UNCONFIGURED, DEGRADED, or REFERENCE_ONLY.",
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
