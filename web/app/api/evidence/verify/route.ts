import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { evidenceEventSchema } from "@/lib/unified/contracts";
import { getEvidenceEvents, verifyEvidenceChain } from "@/lib/unified/evidence-ledger";
import { withContext } from "@/lib/unified/api";

const schema = z.union([
  z.object({ events: z.array(evidenceEventSchema) }),
  z.object({ missionId: z.string().min(1) }),
]);

export async function POST(req: NextRequest) {
  return withContext(req, "audit:read", async (ctx) => {
    const parsed = schema.parse(await req.json());
    const events = "events" in parsed ? parsed.events : await getEvidenceEvents(parsed.missionId);
    return NextResponse.json(verifyEvidenceChain(events), { headers: { "X-Request-ID": ctx.requestId } });
  });
}
