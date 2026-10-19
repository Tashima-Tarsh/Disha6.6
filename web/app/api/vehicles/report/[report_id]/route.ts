import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { vehicleIntelligenceService } from "@/services/vehicle/vehicle-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ report_id: string }> },
) {
  try {
    const { report_id } = await params;
    const reqId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    const format = req.nextUrl.searchParams.get("format") ?? "html";

    const reportData = await vehicleIntelligenceService.getReportById(report_id);
    if (!reportData) {
      return NextResponse.json(
        { error: "Report record not found", id: report_id },
        { status: 404, headers: { "X-Request-ID": reqId } },
      );
    }

    if (format === "json") {
      return NextResponse.json(reportData.result, {
        status: 200,
        headers: { "X-Request-ID": reqId, "Cache-Control": "private, max-age=60" },
      });
    }

    return new NextResponse(reportData.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Request-ID": reqId,
        "Content-Disposition": `inline; filename="DISHA-Vehicle-Report-${reportData.result.registration_number}.html"`,
      },
    });
  } catch (error) {
    return errorResponse(error, req);
  }
}
