import { NextRequest, NextResponse } from "next/server";
import { callOsintBackend, OsintBackendError } from "@/lib/server/osint-backend-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await callOsintBackend("/api/v1/resolve", {
      method: "POST",
      body,
    });
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
