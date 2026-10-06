import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { smokeTestOsintTool } from "@/lib/unified/osint-runtime-service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> },
) {
  return withContext(req, "agent:run", async (ctx) => {
    const { toolId } = await params;

    try {
      const smokeResult = await smokeTestOsintTool(toolId);
      return NextResponse.json({
        toolId,
        smokeResult,
      }, {
        headers: {
          "X-Request-ID": ctx.requestId,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Smoke test failed";
      return NextResponse.json(
        { error: "smoke_test_error", message: errorMsg },
        { status: 500, headers: { "X-Request-ID": ctx.requestId } },
      );
    }
  });
}
