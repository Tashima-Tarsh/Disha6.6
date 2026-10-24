import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { hashValue } from "@/lib/unified/hash";

const BACKEND = process.env.NEXT_PUBLIC_OSINT_BACKEND ?? "http://localhost:8000";
const OSINT_API_KEY = process.env.DISHA_OSINT_API_KEY || process.env.OSINT_API_KEY;

const bodySchema = z.object({
  missionId: z.string().min(1).max(128),
  formationId: z.string().min(1).max(64),
  inputs: z.record(z.string(), z.unknown()).default({}),
  allowActive: z.boolean().optional().default(false),
  purpose: z.string().min(3).max(1000).optional(),
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    if (!OSINT_API_KEY) {
      return NextResponse.json(
        { error: "OSINT backend is not configured with DISHA_OSINT_API_KEY" },
        { status: 503, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    const body = bodySchema.parse(await req.json());

    let backend: Record<string, unknown> | null = null;
    let backendError: string | null = null;

    try {
      const res = await fetch(`${BACKEND}/api/v1/vyuh/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OSINT_API_KEY}`,
        },
        body: JSON.stringify({
          formation_id: body.formationId,
          inputs: body.inputs,
          missionId: body.missionId,
          allowActive: body.allowActive === true,
        }),
        signal: req.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        backendError = `Backend HTTP ${res.status}: ${text.slice(0, 500)}`;
      } else {
        backend = (await res.json()) as Record<string, unknown>;
      }
    } catch (e: any) {
      backendError = e?.message ?? String(e);
    }

    const ledgerEventIds: string[] = [];

    const parent = await appendEvidenceEvent({
      missionId: body.missionId,
      actor: ctx.principal.userId,
      action: "vyuha_formation_proposed",
      input: {
        formationId: body.formationId,
        purpose: body.purpose ?? "vyuha_activation",
        inputHash: hashValue(body.inputs),
        allowActive: body.allowActive === true,
      },
      output: {
        mode: "proposal_only",
        status: backendError ? "failed" : "proposed",
        backendError,
        formation: backend?.formation ?? body.formationId,
        name: backend?.name,
      },
    });
    ledgerEventIds.push(parent.eventId);

    const results = (backend?.results && typeof backend.results === "object"
      ? backend.results
      : {}) as Record<string, unknown>;

    for (const [name, value] of Object.entries(results)) {
      if (
        value &&
        typeof value === "object" &&
        ["proposal", "not_installed", "denied_by_policy"].includes(
          String((value as any).status),
        )
      ) {
        continue;
      }
      const child = await appendEvidenceEvent({
        missionId: body.missionId,
        actor: `vyuha:${body.formationId}`,
        action: "vyuha_observation",
        parentEventId: parent.eventId,
        input: { collector: name, formationId: body.formationId },
        output: {
          resultHash: hashValue(value),
          verification: "OBSERVED",
          summary:
            typeof value === "object" && value !== null
              ? Object.keys(value as object).slice(0, 12)
              : typeof value,
        },
      });
      ledgerEventIds.push(child.eventId);
    }

    return NextResponse.json(
      {
        mode: "proposal_only",
        formationId: body.formationId,
        missionId: body.missionId,
        backendError,
        backend,
        ledgerEventIds,
        constitutional: {
          highRisk: "blocked",
          verification: "OBSERVED only — human review required for VERIFIED",
        },
      },
      {
        status: backendError ? 502 : 200,
        headers: { "X-Request-ID": ctx.requestId },
      },
    );
  });
}
