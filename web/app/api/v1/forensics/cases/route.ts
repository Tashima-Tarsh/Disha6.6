import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withContext } from "@/lib/unified/api";
import { forensicCaseEvidence } from "@/lib/unified/forensic-case-evidence";

const createCaseSchema = z.object({
  caseId: z.string().min(3).max(96).optional(),
  title: z.string().min(3).max(220),
  description: z.string().max(2000).optional(),
  authorizationScope: z.string().min(8).max(2000),
});

export async function POST(req: NextRequest) {
  return withContext(req, "file:write", async (ctx) => {
    const body = createCaseSchema.parse(await req.json());
    const forensicCase = await forensicCaseEvidence.createCase(body, ctx);
    return NextResponse.json(
      { case: forensicCase },
      { status: 201, headers: { "X-Request-ID": ctx.requestId } },
    );
  });
}
