import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";

const BACKEND = process.env.DISHA_OSINT_BACKEND_URL ?? process.env.NEXT_PUBLIC_OSINT_BACKEND ?? "http://localhost:8000";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Legacy broad-proxy endpoints are intentionally fail-closed. Production callers
// should migrate to /api/v1/osint/run with an authorized mission and registered adapter.
export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    if (process.env.DISHA_LEGACY_OSINT_PROXY_ENABLED !== "true" || !ctx.principal.roles.includes("admin")) {
      return NextResponse.json(
        { error: "legacy_proxy_disabled", message: "Use the governed, mission-scoped OSINT API instead." },
        { status: 403, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    try {
      const body: unknown = await req.json();
      const res = await fetch(`${BACKEND}/api/v1/vyuh/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.any([req.signal, AbortSignal.timeout(120000)]),
        redirect: "error",
      });
      if (!res.ok) {
        return NextResponse.json({ error: "osint_backend_error", status: res.status }, {
          status: 502,
          headers: { "X-Request-ID": ctx.requestId },
        });
      }
      return NextResponse.json(await res.json(), {
        status: res.status,
        headers: { "X-Request-ID": ctx.requestId, "Cache-Control": "no-store" },
      });
    } catch {
      return NextResponse.json({ error: "osint_backend_unavailable" }, {
        status: 502,
        headers: { "X-Request-ID": ctx.requestId },
      });
    }
  });
}
