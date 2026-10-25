import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withContext } from "@/lib/unified/api";
import {
  GodModeResearchEngine,
  type GodModeResearchRequest,
} from "@/lib/intelligence/god-mode-research";

export const dynamic = "force-dynamic";

const researchRequestSchema = z.object({
  objective: z.string().min(3).max(1000),
  seed: z.object({
    entityType: z.enum([
      "domain",
      "ip",
      "person",
      "organization",
      "email",
      "phone",
      "cve",
      "entity",
    ]),
    value: z.string().min(1).max(500),
  }),
  budget: z
    .object({
      maxDepth: z.number().int().min(1).max(4).optional(),
      maxTools: z.number().int().min(1).max(20).optional(),
      maxExecutionTimeMs: z.number().int().min(1000).max(60000).optional(),
      maxApiCalls: z.number().int().min(1).max(30).optional(),
    })
    .optional(),
  requiredEvidenceClasses: z.array(z.string()).optional(),
  stopConditions: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: "invalid_json", message: "Malformed JSON body" },
        { status: 400, headers: { "X-Request-ID": ctx.requestId } }
      );
    }

    const parsed = researchRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "validation_error",
          details: parsed.error.issues,
        },
        { status: 400, headers: { "X-Request-ID": ctx.requestId } }
      );
    }

    const engine = new GodModeResearchEngine();
    const dossier = await engine.executeResearch(parsed.data as GodModeResearchRequest);

    return NextResponse.json(dossier, {
      status: 200,
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
