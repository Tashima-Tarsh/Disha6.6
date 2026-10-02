import { withContext } from "@/lib/unified/api";
import { NextRequest, NextResponse } from "next/server";
import { surveillanceTools } from "@/lib/surveillance/tool-registry";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async () => NextResponse.json({
    system: "disha6.6",
    surface: "surveillance-intelligence",
    count: surveillanceTools.length,
    tools: surveillanceTools,
  }));
}
