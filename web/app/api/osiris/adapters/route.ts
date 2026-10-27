import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/server/auth";
import {
  listOsirisAdapterMetadata,
  checkOsirisAdaptersHealth,
} from "@/lib/unified/osiris-intelligence-adapters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const principal = await requirePrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeHealth = searchParams.get("health") === "1";

  const metadata = listOsirisAdapterMetadata();
  let health: Record<string, "healthy" | "degraded" | "unavailable" | "not_configured"> | undefined;

  if (includeHealth) {
    health = await checkOsirisAdaptersHealth();
  }

  return NextResponse.json({
    subsystem: "osiris-intelligence",
    upstream: "https://github.com/simplifaisoul/osiris",
    pinnedSha: "085b2429b11b2b1af43880caaa088575cc98c14f",
    adapters: metadata.map((m) => ({
      ...m,
      health: health?.[m.id],
    })),
    count: metadata.length,
  });
}
