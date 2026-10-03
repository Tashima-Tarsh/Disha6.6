import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withContext } from "@/lib/unified/api";
import { CorroborationEngine } from "@/lib/unified/canonical/corroboration-engine";

const evalBodySchema = z.object({
  claimId: z.string().min(1),
  sources: z.array(
    z.object({
      sourceId: z.string().min(1),
      sourceName: z.string().optional(),
      url: z.string().optional(),
      content: z.string().optional(),
      confidence: z.number().optional(),
    }),
  ).min(1),
});

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get("claimId");
    if (!claimId) {
      return NextResponse.json({ error: "claimId query param required" }, { status: 400 });
    }

    const corroboration = await CorroborationEngine.getForClaim(claimId);
    return NextResponse.json(
      { corroboration },
      { headers: { "X-Request-ID": ctx.requestId } },
    );
  });
}

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = evalBodySchema.parse(await req.json());
    const corrob = CorroborationEngine.evaluate(body.claimId, body.sources);
    await CorroborationEngine.persistCorroboration(corrob);

    return NextResponse.json(
      { corroboration: corrob },
      { headers: { "X-Request-ID": ctx.requestId } },
    );
  });
}
