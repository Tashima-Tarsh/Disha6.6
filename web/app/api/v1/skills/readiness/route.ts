import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { getCapabilityReadiness } from "@/lib/skills/capability-readiness";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const params = req.nextUrl.searchParams;
    const offsetRaw = params.get("offset");
    const limitRaw = params.get("limit");
    if (
      (offsetRaw !== null && !/^\d{1,7}$/.test(offsetRaw)) ||
      (limitRaw !== null && !/^\d{1,3}$/.test(limitRaw))
    ) {
      return NextResponse.json({ error: "invalid_pagination" }, { status: 400 });
    }
    const result = getCapabilityReadiness({
      search: params.get("q")?.slice(0, 160) ?? undefined,
      category: params.get("category")?.slice(0, 80) ?? undefined,
      offset: offsetRaw ? Number(offsetRaw) : undefined,
      limit: limitRaw ? Number(limitRaw) : undefined,
    });
    return NextResponse.json(result, {
      headers: { "X-Request-ID": ctx.requestId, "Cache-Control": "no-store" },
    });
  });
}
