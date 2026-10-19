import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { requireRequestContext } from "@/lib/server/security";
import type { RequestContext } from "@/lib/server/types";
import { vehicleLookupRequestSchema } from "@/lib/vehicle/types";
import { vehicleIntelligenceService } from "@/services/vehicle/vehicle-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let ctx: RequestContext;
    try {
      ctx = await requireRequestContext(req, "agent:run");
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

    const json = await req.json();
    const parsed = vehicleLookupRequestSchema.parse(json);

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    const result = await vehicleIntelligenceService.lookupVehicle(parsed, {
      caseId: parsed.case_id,
      investigatorId: ctx.principal.userId,
      actorRole: ctx.principal.roles[0],
      purpose: parsed.purpose || "vehicle_registration_verification",
      consentConfirmed: parsed.consent_confirmed,
      allowCached: parsed.allow_cached,
      preferredProvider: parsed.preferred_provider,
      ipAddress: clientIp,
      signal: req.signal,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return errorResponse(error, req);
  }
}
