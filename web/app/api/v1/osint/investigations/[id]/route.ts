import type { NextRequest } from "next/server";
import { investigationResponse } from "@/services/investigation/controller";
import { investigations } from "@/services/investigation/service";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return investigationResponse(req, ctx => investigations.get(id, ctx.principal.userId));
}
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return investigationResponse(req, ctx => investigations.close(id, ctx));
}
