import { NextRequest, NextResponse } from "next/server";
import { callOsintBackend, OsintBackendError } from "@/lib/server/osint-backend-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await callOsintBackend("/api/v1/leakcheck/lookup", {
      method: "POST",
      body,
      timeoutMs: 30000,
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || searchParams.get("check") || "";
    const type = searchParams.get("type") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 100;
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0;

    const data = await callOsintBackend("/api/v1/leakcheck/lookup", {
      method: "POST",
      body: { query, type, limit, offset },
      timeoutMs: 30000,
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
