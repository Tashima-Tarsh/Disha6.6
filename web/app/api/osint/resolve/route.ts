import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_OSINT_BACKEND ?? "http://localhost:8000";
const OSINT_API_KEY = process.env.DISHA_OSINT_API_KEY || process.env.OSINT_API_KEY;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!OSINT_API_KEY) {
    return NextResponse.json(
      { error: "OSINT backend is not configured with DISHA_OSINT_API_KEY" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND}/api/v1/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OSINT_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 502 });
  }
}
