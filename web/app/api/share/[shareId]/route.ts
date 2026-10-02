import { NextRequest, NextResponse } from "next/server";
import { assertPublicRequestGuards, errorResponse } from "@/lib/server/http";
import { requirePrincipal } from "@/lib/server/auth";
import { requestId, requireRequestContext } from "@/lib/server/security";
import type { RequestContext } from "@/lib/server/types";
import { getConversationShare, revokeConversationShare } from "@/services/shares";

interface RouteContext {
  params: Promise<{ shareId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    await assertPublicRequestGuards(req);
    const { shareId } = await params;
    let ctx: RequestContext | null = null;
    try {
      ctx = { requestId: requestId(req), principal: await requirePrincipal(req) };
    } catch {
      // Public and unlisted shares do not require an authenticated viewer.
    }
    const share = await getConversationShare(ctx, shareId, req.headers.get("x-share-password"));
    return NextResponse.json({
      id: share.id,
      title: share.conversation.title,
      messages: share.conversation.messages,
      model: share.conversation.model,
      createdAt: share.conversation.createdAt,
      shareCreatedAt: share.createdAt,
    }, { headers: { "X-Request-ID": requestId(req) } });
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 500;
    if (status === 401) {
      return NextResponse.json({ error: "Password required", requiresPassword: true }, { status: 401 });
    }
    return errorResponse(error, req);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const ctx = await requireRequestContext(req, "share:delete");
    const { shareId } = await params;
    const deleted = await revokeConversationShare(ctx, shareId);
    if (!deleted) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, req);
  }
}
