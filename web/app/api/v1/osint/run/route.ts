import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { validateContinuousOsintInput } from "@/lib/unified/continuous-osint";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { hashValue } from "@/lib/unified/hash";
import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";
import { canReadMission, getMission } from "@/lib/unified/orchestrator";

const requestSchema = z.object({
  missionId: z.string().min(1).max(128),
  adapterId: z.string().min(1).max(128),
  purpose: z.string().min(3).max(1000),
  input: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = requestSchema.parse(await req.json());
    const mission = await getMission(body.missionId);
    if (!mission || !canReadMission(mission, ctx.principal)) {
      return NextResponse.json(
        { error: "mission_not_found", message: "Mission is unavailable or not authorized." },
        { status: 404, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    // The governed bus, not a direct FastAPI /scan proxy, owns authorization,
    // execution-class controls, adapter readiness, rate limits, and timeouts.
    const input = validateContinuousOsintInput(body.adapterId, body.input);
    const bus = createDefaultOsintBus({
      policyCheck: (metadata) => {
        const executionClass = metadata.executionClass ?? "passive_public";
        return (executionClass === "passive_public" || executionClass === "credentialed_public_api")
          && metadata.defaultEnabled !== false;
      },
    });
    const result = await bus.run(body.adapterId, input, {
      missionId: body.missionId,
      userId: ctx.principal.userId,
      purpose: body.purpose,
      signal: req.signal,
    });

    await appendEvidenceEvent({
      missionId: body.missionId,
      actor: ctx.principal.userId,
      action: "governed_osint_adapter_attempted",
      input: { adapterId: body.adapterId, purpose: body.purpose, inputHash: hashValue(input) },
      output: result,
    });

    return NextResponse.json(result, {
      status: result.status === "completed" || result.status === "partial" ? 200 : 400,
      headers: { "X-Request-ID": ctx.requestId },
    });
  });
}
