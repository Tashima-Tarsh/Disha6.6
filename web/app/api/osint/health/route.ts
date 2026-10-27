import { NextRequest, NextResponse } from "next/server";
import { callOsintBackend, OsintBackendError } from "@/lib/server/osint-backend-client";
import { withContext } from "@/lib/unified/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withContext(request, "agent:read", async () => {
    try {
      const data = await callOsintBackend("/", { method: "GET", timeoutMs: 5000 });
      return NextResponse.json(data);
    } catch (err: unknown) {
      if (err instanceof OsintBackendError) {
        return NextResponse.json(
          { error: err.message, code: err.code, status: "unavailable" },
          { status: err.statusCode }
        );
      }
      return NextResponse.json(
        { error: err instanceof Error ? err.message : String(err), status: "unavailable" },
        { status: 502 }
      );
    }
  });
}
