import { NextRequest, NextResponse } from "next/server";

import { withContext } from "@/lib/unified/api";
import {
  getOsintServiceConnectorSummary,
  listOsintServiceConnectors,
  probeConfiguredOsintServices,
} from "@/lib/unified/osint-service-connectors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const shouldProbe = req.nextUrl.searchParams.get("probe") === "1";
    const probes = shouldProbe ? await probeConfiguredOsintServices() : [];

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      summary: getOsintServiceConnectorSummary(),
      connectors: listOsintServiceConnectors(),
      probes,
      safetyRule: "OpenCTI and IntelOwl are live only when explicitly configured. SpiderFoot, Sherlock and Maigret are registered as upstream service/tool targets but are not executable in the default disha6.6 runtime.",
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
