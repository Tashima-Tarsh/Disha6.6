import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { vehicleIntelligenceService } from "@/services/vehicle/vehicle-service";
import { resolveBharatSeries } from "@/lib/vehicle/rto-directory";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ rto_code: string }> },
) {
  try {
    const { rto_code } = await params;
    const reqId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    const rawCode = rto_code.toUpperCase().trim();

    if (rawCode === "BH" || rawCode.startsWith("BH")) {
      const bhMeta = resolveBharatSeries(new Date().getFullYear());
      return NextResponse.json(
        {
          code: "BH",
          type: "bharat_series",
          details: bhMeta,
        },
        {
          status: 200,
          headers: { "X-Request-ID": reqId, "Cache-Control": "public, max-age=3600" },
        },
      );
    }

    const rtoInfo = vehicleIntelligenceService.getRtoDetails(rawCode);

    if (!rtoInfo.state && !rtoInfo.rto) {
      return NextResponse.json(
        {
          error: "Unrecognized RTO or State code",
          code: rawCode,
        },
        {
          status: 404,
          headers: { "X-Request-ID": reqId },
        },
      );
    }

    return NextResponse.json(
      {
        rtoCode: rtoInfo.rtoCode,
        state: rtoInfo.state,
        rto: rtoInfo.rto,
      },
      {
        status: 200,
        headers: {
          "X-Request-ID": reqId,
          "Cache-Control": "public, max-age=86400",
        },
      },
    );
  } catch (error) {
    return errorResponse(error, req);
  }
}
