import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withContext } from "@/lib/unified/api";
import { ConstitutionalContradictionEngine } from "@/lib/unified/canonical/constitutional-contradiction-engine";
import { dishaClaimSchema, dishaEvidenceSchema } from "@/lib/unified/canonical/types";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const contradictions = await ConstitutionalContradictionEngine.listContradictions();
    return NextResponse.json(
      { contradictions, total: contradictions.length },
      { headers: { "X-Request-ID": ctx.requestId } },
    );
  });
}

const detectBodySchema = z.object({
  claimA: dishaClaimSchema,
  claimB: dishaClaimSchema,
  evidenceA: dishaEvidenceSchema.optional(),
  evidenceB: dishaEvidenceSchema.optional(),
});

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = detectBodySchema.parse(await req.json());
    const contra = ConstitutionalContradictionEngine.detectContradiction(
      body.claimA,
      body.claimB,
      body.evidenceA,
      body.evidenceB,
    );

    if (contra) {
      await ConstitutionalContradictionEngine.persistContradiction(contra);
    }

    return NextResponse.json(
      { contradictionDetected: Boolean(contra), contradiction: contra },
      { headers: { "X-Request-ID": ctx.requestId } },
    );
  });
}
