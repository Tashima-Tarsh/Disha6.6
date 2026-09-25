import { NextResponse } from "next/server";
import { surveillanceTools } from "@/lib/surveillance/tool-registry";

export async function GET() {
  return NextResponse.json({
    system: "disha6.6",
    surface: "surveillance-intelligence",
    count: surveillanceTools.length,
    tools: surveillanceTools,
  });
}
