import { NextResponse } from "next/server";
import { callOsintBackend, OsintBackendError } from "@/lib/server/osint-backend-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await callOsintBackend("/api/v1/graph/stats", { method: "GET" });
    return NextResponse.json(data);
  } catch (err: unknown) {
    if (err instanceof OsintBackendError) {
      return NextResponse.json(
        { error: err.message, code: err.code, detail: err.detail },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
