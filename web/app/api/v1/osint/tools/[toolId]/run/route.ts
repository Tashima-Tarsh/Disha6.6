import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withContext } from "@/lib/unified/api";
import { universalOsintExecutionService } from "@/lib/osint/universal-execution-service";
import { validateExecutionAuthorization } from "@/lib/server/authorization-grants";

export const dynamic = "force-dynamic";

const runPayloadSchema = z.object({
  target: z.string().min(1).max(512),
  targetType: z.string().optional().default("general"),
  options: z.record(z.string(), z.string()).optional().default({}),
  approvalGrantId: z.string().min(1).max(128).optional(),
  confirmed: z.boolean().optional(),
  activeAuthorization: z.boolean().optional(),
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

    const toolDef = universalOsintExecutionService.getToolDefinition(toolId);
    if (!toolDef) {
      return NextResponse.json(
        { error: "tool_not_found", message: `Tool '${toolId}' is not registered in the OSINT universe.` },
        { status: 404, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    // Independently validate authorization. Client booleans cannot self-declare permission.
    const auth = await validateExecutionAuthorization({
      principal: ctx.principal,
      tool: toolDef,
      target: body.target,
      grantId: body.approvalGrantId,
    });

    if (!auth.authorized) {
      return NextResponse.json(
        {
          error: "authorization_required",
          message: auth.reason,
          toolId: toolDef.toolId,
          executionClass: toolDef.scopeRequirements.executionClass,
          requiresIndependentGrant: true,
        },
        { status: 403, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    const adapterContext = {
      missionId: ctx.requestId,
      userId: ctx.principal?.userId || "operator",
      userRoles: ctx.principal?.roles || [],
      purpose: body.purpose,
      identityAuthorization: auth.identityAuthorized,
      activeAuthorization: auth.activeAuthorized,
      approvalGrantId: auth.grant?.grantId || body.approvalGrantId,
      signal: req.signal,
    };

    const result = await universalOsintExecutionService.execute(
      toolId,
      {
        target: body.target,
        targetType: body.targetType,
        options: body.options,
        confirmed: auth.identityAuthorized,
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
