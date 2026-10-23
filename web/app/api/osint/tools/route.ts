import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";

const BACKEND = process.env.DISHA_OSINT_BACKEND_URL ?? process.env.NEXT_PUBLIC_OSINT_BACKEND ?? "http://localhost:8000";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    try {
      const res = await fetch(`${BACKEND}/tools`, {
        signal: AbortSignal.any([req.signal, AbortSignal.timeout(5000)]),
        redirect: "error",
        cache: "no-store",
      });
      if (!res.ok) {
        return NextResponse.json({ error: "osint_backend_error", status: res.status }, {
          status: 502,
          headers: { "X-Request-ID": ctx.requestId },
        });
      }
      return NextResponse.json(await res.json(), {
        headers: { "X-Request-ID": ctx.requestId, "Cache-Control": "no-store, max-age=0" },
      });
    } catch {
      return NextResponse.json({ error: "osint_backend_unavailable" }, {
        status: 502,
        headers: { "X-Request-ID": ctx.requestId },
      });
    }
  });
}
