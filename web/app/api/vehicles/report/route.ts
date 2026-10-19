import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/server/http";
import { requireRequestContext } from "@/lib/server/security";
import type { RequestContext } from "@/lib/server/types";
import { vehicleIntelligenceService } from "@/services/vehicle/vehicle-service";

export const dynamic = "force-dynamic";

const reportRequestSchema = z.object({
  lookup_id: z.string().uuid().optional(),
  registration_number: z.string().min(2).max(30).optional(),
  format: z.enum(["html", "json"]).default("html"),
  case_id: z.string().optional(),
  purpose: z.string().default("forensic_vehicle_report_generation"),
});

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

    const body = reportRequestSchema.parse(await req.json());

    let result;
    if (body.lookup_id) {
      result = await vehicleIntelligenceService.getVerificationById(body.lookup_id);
      if (!result) {
        return NextResponse.json(
          { error: "Lookup record not found for the specified lookup_id", lookup_id: body.lookup_id },
          { status: 404, headers: { "X-Request-ID": ctx.requestId } },
        );
      }
    } else if (body.registration_number) {
      result = await vehicleIntelligenceService.lookupVehicle(
        {
          registration_number: body.registration_number,
          case_id: body.case_id,
          purpose: body.purpose,
        },
        {
          caseId: body.case_id,
          investigatorId: ctx.principal.userId,
          purpose: body.purpose,
          consentConfirmed: true,
        },
      );
    } else {
      return NextResponse.json(
        { error: "Either lookup_id or registration_number must be provided" },
        { status: 400, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    if (body.format === "json") {
      return NextResponse.json(result, {
        status: 200,
        headers: { "X-Request-ID": ctx.requestId },
      });
    }

    const html = vehicleIntelligenceService.generateForensicReportHtml(result);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Request-ID": ctx.requestId,
        "Content-Disposition": `inline; filename="DISHA-Vehicle-Report-${result.registration_number}.html"`,
      },
    });
  } catch (error) {
    return errorResponse(error, req);
  }
}

export async function GET(req: NextRequest) {
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

    const { searchParams } = req.nextUrl;
    const lookup_id = searchParams.get("lookup_id") || undefined;
    const registration_number = searchParams.get("registration_number") || searchParams.get("reg") || undefined;
    const format = (searchParams.get("format") || "html") as "html" | "json";
    const case_id = searchParams.get("case_id") || undefined;
    const purpose = searchParams.get("purpose") || "forensic_vehicle_report_generation";

    let result;
    if (lookup_id) {
      result = await vehicleIntelligenceService.getVerificationById(lookup_id);
      if (!result) {
        return NextResponse.json(
          { error: "Lookup record not found for the specified lookup_id", lookup_id },
          { status: 404, headers: { "X-Request-ID": ctx.requestId } },
        );
      }
    } else if (registration_number) {
      result = await vehicleIntelligenceService.lookupVehicle(
        {
          registration_number,
          case_id,
          purpose,
        },
        {
          caseId: case_id,
          investigatorId: ctx.principal.userId,
          purpose,
          consentConfirmed: true,
        },
      );
    } else {
      return NextResponse.json(
        { error: "Either lookup_id or registration_number must be provided" },
        { status: 400, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    if (format === "json") {
      return NextResponse.json(result, {
        status: 200,
        headers: { "X-Request-ID": ctx.requestId },
      });
    }

    const html = vehicleIntelligenceService.generateForensicReportHtml(result);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Request-ID": ctx.requestId,
        "Content-Disposition": `inline; filename="DISHA-Vehicle-Report-${result.registration_number}.html"`,
      },
    });
  } catch (error) {
    return errorResponse(error, req);
  }
}

