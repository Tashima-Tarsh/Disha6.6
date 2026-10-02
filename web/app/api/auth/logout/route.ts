import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/server/audit";
import { clearSessionCookies, revokeRequestSession } from "@/lib/server/auth";
import { assertCsrf } from "@/lib/server/csrf";
import { errorResponse } from "@/lib/server/http";
import { requestId } from "@/lib/server/security";

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const userId = await revokeRequestSession(req);
    const response = NextResponse.json({ success: true });
    clearSessionCookies(response);
    await audit({
      requestId: requestId(req),
      userId,
      action: "auth.logout",
      outcome: "success",
    });
    return response;
  } catch (error) {
    return errorResponse(error, req);
  }
}
