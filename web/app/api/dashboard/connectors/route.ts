import { NextRequest, NextResponse } from "next/server";

import {
  nationalConnectors,
  probeConnector,
} from "@/lib/national-connectors";
import { withContext } from "@/lib/unified/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withContext(request, "agent:read", async () => {
    const probe = request.nextUrl.searchParams.get("probe") === "1";
    const probes = probe
      ? await Promise.all(
          nationalConnectors.map(async (connector) => ({
            id: connector.id,
            probe: await probeConnector(connector),
          })),
        )
      : [];

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      notice:
        "Official-source connector manifest. Probe results show source reachability, not data completeness.",
      connectors: nationalConnectors,
      probes,
    });
  });
}
