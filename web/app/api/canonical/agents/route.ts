import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { listAgentManifests } from "@/lib/unified/canonical/governed-agent-swarm";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const agents = listAgentManifests();
    return NextResponse.json(
      {
        totalAgents: agents.length,
        agents,
        invariants: {
          aiCanAssignVerified: false,
          activeReconnaissanceAllowed: false,
          policyGateMandatory: true,
          untrustedDataBoundaryEnforced: true,
        },
      },
      { headers: { "X-Request-ID": ctx.requestId } },
    );
  });
}
