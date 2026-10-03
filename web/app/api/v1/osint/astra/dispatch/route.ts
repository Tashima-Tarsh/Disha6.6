import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";
import { selectAstra6Tools } from "@/lib/unified/astra6-tool-selector";

const requestSchema = z.object({
  target: z.string().trim().min(2).max(512),
  targetType: z.enum(["domain", "ip", "email", "phone_number", "username"]).optional(),
  missionId: z.string().trim().min(1).max(128).optional(),
  purpose: z.string().trim().min(3).max(500).default("Governed ASTRA 6 deep public-source investigation"),
});

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = requestSchema.parse(await req.json());
    const missionId = body.missionId ?? `astra-${crypto.randomUUID()}`;
    const operatorRoleApproved = ctx.principal.roles.some((role) => role === "admin" || role === "operator");
    const identityApproved = operatorRoleApproved && process.env.DISHA_IDENTITY_ENUMERATION_APPROVED === "true";

    const plan = selectAstra6Tools(body.target, body.targetType, { identityApproved });
    const bus = createDefaultOsintBus({
      policyCheck: (metadata) => {
        const executionClass = metadata.executionClass ?? "passive_public";
        return (executionClass === "passive_public" || executionClass === "credentialed_public_api")
          && metadata.defaultEnabled !== false;
      },
    });

    const runs = await Promise.all(plan.selectedTools.map(async (tool) => {
      const result = await bus.run(
        `astra6-${tool.toolId}`,
        { target: plan.target, targetType: plan.targetType },
        {
          missionId,
          userId: ctx.principal.userId,
          purpose: body.purpose,
          identityApproved,
          signal: req.signal,
        },
      );
      return {
        toolId: tool.toolId,
        adapterId: `astra6-${tool.toolId}`,
        ...result,
      };
    }));

    await appendEvidenceEvent({
      missionId,
      actor: ctx.principal.userId,
      action: "astra6_deep_search_dispatched",
      input: {
        target: plan.target,
        targetType: plan.targetType,
        selectedTools: plan.selectedTools.map((tool) => tool.toolId),
        blockedTools: plan.blockedTools,
      },
      output: {
        runs: runs.map((run) => ({
          toolId: run.toolId,
          status: run.status,
          data: run.data,
          error: run.error,
        })),
      },
    });

    return NextResponse.json({
      missionId,
      target: plan.target,
      targetType: plan.targetType,
      identityApproved,
      selectedTools: plan.selectedTools.map((tool) => tool.toolId),
      blockedTools: plan.blockedTools,
      runs,
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
