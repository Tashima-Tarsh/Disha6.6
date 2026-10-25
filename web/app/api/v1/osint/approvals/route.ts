import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withContext } from "@/lib/unified/api";
import { issueAuthorizationGrant, getAuthorizationGrant, type AuthorizationScope } from "@/lib/server/authorization-grants";

export const dynamic = "force-dynamic";

const issueGrantSchema = z.object({
  scope: z.enum(["active_recon", "identity_enumeration", "high_risk_execution"]),
  toolId: z.string().min(1).max(128).optional().default("*"),
  targetPattern: z.string().min(1).max(256).optional().default("*"),
  purpose: z.string().min(5).max(1000),
  ttlMinutes: z.number().int().min(1).max(240).optional().default(30),
});

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    let body: z.infer<typeof issueGrantSchema>;
    try {
      const raw = await req.json();
      body = issueGrantSchema.parse(raw);
    } catch (err) {
      return NextResponse.json(
        { error: "invalid_request", message: err instanceof Error ? err.message : String(err) },
        { status: 400, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    try {
      const grant = issueAuthorizationGrant({
        scope: body.scope as AuthorizationScope,
        approver: ctx.principal,
        toolId: body.toolId,
        targetPattern: body.targetPattern,
        purpose: body.purpose,
        ttlMinutes: body.ttlMinutes,
      });

      return NextResponse.json(
        {
          success: true,
          grant,
          message: `Independent authorization grant issued for scope '${grant.scope}'.`,
        },
        { status: 201, headers: { "X-Request-ID": ctx.requestId } },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number })?.status || 403;
      return NextResponse.json(
        { error: "grant_issue_failed", message },
        { status, headers: { "X-Request-ID": ctx.requestId } },
      );
    }
  });
}

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const grantId = req.nextUrl.searchParams.get("grantId");
    if (!grantId) {
      return NextResponse.json(
        { error: "grant_id_required", message: "Query parameter 'grantId' is required." },
        { status: 400, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    const grant = getAuthorizationGrant(grantId);
    if (!grant) {
      return NextResponse.json(
        { error: "grant_not_found", message: `Authorization grant '${grantId}' does not exist or has expired.` },
        { status: 404, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    return NextResponse.json(
      { grant },
      { headers: { "X-Request-ID": ctx.requestId } },
    );
  });
}
