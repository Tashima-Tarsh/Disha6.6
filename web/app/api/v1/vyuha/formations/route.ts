import { NextRequest, NextResponse } from "next/server";

import { withContext } from "@/lib/unified/api";

import { getOsintBackendUrl, getOsintApiKey } from "@/lib/server/osint-backend-client";

const BACKEND = getOsintBackendUrl();
const OSINT_API_KEY = getOsintApiKey();

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    if (!OSINT_API_KEY) {
      return NextResponse.json(
        { error: "OSINT backend is not configured with DISHA_OSINT_API_KEY" },
        { status: 503, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    try {
      const res = await fetch(`${BACKEND}/api/v1/vyuh/formations`, {
        headers: { Authorization: `Bearer ${OSINT_API_KEY}` },
        signal: req.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return NextResponse.json(
          { error: `Backend HTTP ${res.status}`, detail: text.slice(0, 400) },
          { status: 502, headers: { "X-Request-ID": ctx.requestId } },
        );
      }
      const data = await res.json();
      return NextResponse.json(
        {
          ...data,
          constitutional: {
            mode: "proposal_only",
            note: "Formations are advisory. Activation records OBSERVED evidence only; human review elevates to VERIFIED.",
          },
        },
        { headers: { "X-Request-ID": ctx.requestId } },
      );
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message ?? String(e) },
        { status: 502, headers: { "X-Request-ID": ctx.requestId } },
      );
    }
  });
}
