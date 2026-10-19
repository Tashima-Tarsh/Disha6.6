import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { vehicleIntelligenceService } from "@/services/vehicle/vehicle-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const reqId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    const providers = vehicleIntelligenceService.getProviders();

    return NextResponse.json(
      {
        total: providers.length,
        providers,
      },
      {
        status: 200,
        headers: {
          "X-Request-ID": reqId,
          "Cache-Control": "public, max-age=30",
        },
      },
    );
  } catch (error) {
    return errorResponse(error, req);
  }
}
