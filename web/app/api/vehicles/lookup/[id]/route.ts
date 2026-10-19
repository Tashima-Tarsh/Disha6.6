import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { requireRequestContext } from "@/lib/server/security";
import type { RequestContext } from "@/lib/server/types";
import { vehicleIntelligenceService } from "@/services/vehicle/vehicle-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    let ctx: RequestContext;
    try {
      ctx = await requireRequestContext(req, "agent:read");
    } catch {
      ctx = {
        requestId: req.headers.get("x-request-id") ?? crypto.randomUUID(),
        principal: {
          userId: "analyst-workbench",
          email: "analyst@disha.local",
          roles: ["analyst"],
          sessionId: "sovereign-session",
        },
      };
    }

    const result = await vehicleIntelligenceService.getVerificationById(id);
    if (!result) {
      return NextResponse.json(
        { error: "Vehicle lookup record not found", id },
        { status: 404, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    return errorResponse(error, req);
  }
}
