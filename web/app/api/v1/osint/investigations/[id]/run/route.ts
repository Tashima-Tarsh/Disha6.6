import type { NextRequest } from "next/server";
import { investigationResponse } from "@/services/investigation/controller";
import { investigations } from "@/services/investigation/service";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return investigationResponse(req, ctx => investigations.advance(id, ctx, req.signal));
}
