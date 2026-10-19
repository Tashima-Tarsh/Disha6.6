import { NextRequest, NextResponse } from "next/server";
import { ReaMcpClient } from "@/lib/server/rea-mcp-client";

export async function GET() {
  const rea = ReaMcpClient.getInstance();
  const health = await rea.getHealth();
  const tools = rea.getTools();
  return NextResponse.json({
    engine: "REA: Reverse Engineer Anything",
    version: health.version,
    status: health.status,
    tools,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const toolName = String(body.tool || "analyze_javascript_application");
    const params = (body.params || {}) as Record<string, unknown>;

    const rea = ReaMcpClient.getInstance();
    const result = await rea.executeTool(toolName, params);

    return NextResponse.json({
      status: "ok",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
