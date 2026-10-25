import { NextRequest, NextResponse } from "next/server";
import { CANONICAL_VYUH_FORMATIONS } from "../formations/route";

const BACKEND = process.env.NEXT_PUBLIC_OSINT_BACKEND ?? "http://localhost:8000";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const formationId = body.formation_id;
  const inputs = body.inputs || {};

  try {
    const res = await fetch(`${BACKEND}/api/v1/vyuh/activate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DISHA_OSINT_API_KEY || "dev-local-key"}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
  } catch {
    // Graceful fallback when backend process is unavailable
  }

  const formation = CANONICAL_VYUH_FORMATIONS[formationId];
  if (!formation) {
    return NextResponse.json({ error: `Unknown formation: ${formationId}` }, { status: 400 });
  }

  return NextResponse.json({
    mode: "proposal_only",
    formation: formationId,
    name: formation.name,
    purpose: formation.purpose,
    results: {
      status: "advisory_proposal_active",
      collectors: formation.collectors,
      targetInputs: inputs,
      note: "Formation activated in advisory proposal mode under DISHA Constitution Article V.",
    },
    constitutional: {
      highRisk: "blocked",
      verification: "OBSERVED only — human review required for VERIFIED",
      activeNetworkDefault: "deny",
    },
  }, { status: 200 });
}
