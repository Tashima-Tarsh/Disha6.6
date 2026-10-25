import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withContext } from "@/lib/unified/api";
import { universalOsintExecutionService } from "@/lib/osint/universal-execution-service";

export const dynamic = "force-dynamic";

const runPayloadSchema = z.object({
  target: z.string().min(1).max(512),
  targetType: z.string().optional().default("general"),
  options: z.record(z.string(), z.string()).optional().default({}),
  confirmed: z.boolean().optional().default(false),
  activeAuthorization: z.boolean().optional().default(false),
  purpose: z.string().min(3).max(1000).optional().default("Authorized OSINT intelligence query"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> },
) {
  return withContext(req, "agent:run", async (ctx) => {
    const { toolId } = await params;
    let body: z.infer<typeof runPayloadSchema>;

    try {
      const raw = await req.json();
      body = runPayloadSchema.parse(raw);
    } catch (err) {
      return NextResponse.json(
        { error: "invalid_request", message: err instanceof Error ? err.message : String(err) },
        { status: 400, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    const adapterContext = {
      missionId: ctx.requestId,
      userId: ctx.principal?.userId || "operator",
      purpose: body.purpose,
      identityAuthorization: body.confirmed,
      activeAuthorization: body.activeAuthorization,
      signal: req.signal,
    };

    const result = await universalOsintExecutionService.execute(
      toolId,
      {
        target: body.target,
        targetType: body.targetType,
        options: body.options,
        confirmed: body.confirmed,
      },
      adapterContext,
    );

    const httpStatus = result.status === "blocked_by_policy"
      ? 403
      : result.status === "auth_required"
        ? 401
        : result.status === "unconfigured"
          ? 503
          : 200;

    return NextResponse.json(result, {
      status: httpStatus,
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
