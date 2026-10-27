import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/server/auth";
import {
  executeOsirisAdapter,
  listOsirisIntegrations,
  validateOsirisAdapterReadiness,
} from "@/lib/unified/osiris-workflow-integration";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const principal = await requirePrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  return NextResponse.json({
    integrations: listOsirisIntegrations(),
  });
}

export async function POST(request: NextRequest) {
  const principal = await requirePrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  let body: { adapterId: string; target?: string; id?: string; limit?: number; missionId?: string; purpose?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.adapterId) {
    return NextResponse.json({ error: "adapter_id_required" }, { status: 400 });
  }

  const readiness = await validateOsirisAdapterReadiness(body.adapterId);
  if (!readiness.ready) {
    return NextResponse.json({
      error: "adapter_not_ready",
      readiness,
    }, { status: 400 });
  }

  const result = await executeOsirisAdapter(
    body.adapterId,
    {
      target: body.target,
      id: body.id,
      limit: body.limit,
    },
    {
      missionId: body.missionId ?? principal.userId,
      userId: principal.userId,
      purpose: body.purpose ?? "osiris_intelligence_query",
    }
  );

  return NextResponse.json(result);
}
