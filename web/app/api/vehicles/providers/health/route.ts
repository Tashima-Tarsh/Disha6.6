import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { vehicleIntelligenceService } from "@/services/vehicle/vehicle-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const reqId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    const health = await vehicleIntelligenceService.getProvidersHealth();

    const summary = {
      total: health.length,
      healthy: health.filter((h) => h.status === "healthy").length,
      degraded: health.filter((h) => h.status === "degraded").length,
      unavailable: health.filter((h) => h.status === "unavailable").length,
    };

    return NextResponse.json(
      {
        status: summary.healthy > 0 ? "operational" : "degraded",
        timestamp: new Date().toISOString(),
        summary,
        providers: health,
      },
      {
        status: 200,
        headers: {
          "X-Request-ID": reqId,
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return errorResponse(error, req);
  }
}
