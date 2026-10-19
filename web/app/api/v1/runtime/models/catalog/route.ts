import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { UniversalModelGateway } from "@/lib/unified/model-gateway";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const models = await UniversalModelGateway.discoverInstalledModels();
    const isLocalOnly = UniversalModelGateway.isLocalOnly();

    return NextResponse.json(
      {
        catalog: models,
        total: models.length,
        localOnlyMode: isLocalOnly,
        timestamp: new Date().toISOString(),
      },
      { headers: { "X-Request-ID": ctx.requestId } }
    );
  });
}

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = (await req.json()) as { localOnlyMode?: boolean };
    if (typeof body.localOnlyMode === "boolean") {
      UniversalModelGateway.setLocalOnlyMode(body.localOnlyMode);
    }

    return NextResponse.json(
      {
        success: true,
        localOnlyMode: UniversalModelGateway.isLocalOnly(),
      },
      { headers: { "X-Request-ID": ctx.requestId } }
    );
  });
}
