import type { NextRequest } from "next/server";
import { createText, investigationResponse } from "@/services/investigation/controller";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  return investigationResponse(req, ctx => createText(req, ctx));
}
