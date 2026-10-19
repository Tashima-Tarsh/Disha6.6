import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { UniversalModelGateway } from "@/lib/unified/model-gateway";

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = (await req.json()) as { modelTag: string };
    if (!body.modelTag || typeof body.modelTag !== "string") {
      return NextResponse.json({ error: "modelTag is required" }, { status: 400 });
    }

    const testResults = await UniversalModelGateway.runCapabilityBenchmark(body.modelTag);

    return NextResponse.json(
      {
        modelTag: body.modelTag,
        testedAt: new Date().toISOString(),
        capabilities: testResults,
      },
      { headers: { "X-Request-ID": ctx.requestId } }
    );
  });
}
