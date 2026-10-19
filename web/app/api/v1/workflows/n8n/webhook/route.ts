import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withContext } from "@/lib/unified/api";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { StatefulInvestigationGraph } from "@/lib/server/agent/langchain-pipeline";

const n8nWebhookPayloadSchema = z.object({
  eventType: z.enum([
    "TRIGGER_INVESTIGATION",
    "INGEST_FINDING",
    "SECURITY_ALERT",
    "EXPORT_CASE_DOSSIER",
  ]),
  target: z.string().min(1).max(256),
  targetType: z.string().default("person_name"),
  source: z.string().default("n8n-automation-node"),
  data: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    let rawJson: unknown;
    try {
      rawJson = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const parseResult = n8nWebhookPayloadSchema.safeParse(rawJson);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parseResult.data;
    const missionId = `n8n-${Date.now()}`;

    // 1. Audit event in Section 63 BSA evidence ledger
    const event = await appendEvidenceEvent({
      missionId,
      actor: "n8n-webhook-bridge",
      action: `n8n_${payload.eventType.toLowerCase()}`,
      input: { target: payload.target, targetType: payload.targetType, source: payload.source },
      output: { status: "accepted", dataReceived: Boolean(payload.data) },
    });

    let resultData: Record<string, unknown> = {
      status: "dispatched",
      eventId: event.eventId,
      missionId,
    };

    // 2. Dispatch according to event type
    if (payload.eventType === "TRIGGER_INVESTIGATION") {
      let state = StatefulInvestigationGraph.initialize(payload.target, payload.targetType, missionId);
      state = await StatefulInvestigationGraph.perceive(state);
      resultData = {
        status: "investigation_started",
        missionId,
        stage: state.stage,
        entities: state.perceivedEntities,
      };
    } else if (payload.eventType === "INGEST_FINDING") {
      resultData = {
        status: "finding_ingested",
        missionId,
        target: payload.target,
        timestamp: new Date().toISOString(),
      };
    }

    return NextResponse.json(
      {
        success: true,
        workflow: "disha-n8n-bridge",
        receivedAt: new Date().toISOString(),
        result: resultData,
      },
      { headers: { "X-Request-ID": ctx.requestId } }
    );
  });
}
