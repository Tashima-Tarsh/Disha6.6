import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/server/audit";
import { getRefreshToken, rotateSession, setSessionCookies } from "@/lib/server/auth";
import { assertCsrf, setCsrfCookie } from "@/lib/server/csrf";
import { errorResponse } from "@/lib/server/http";
import { requestId } from "@/lib/server/security";

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const refreshToken = getRefreshToken(req);
    if (!refreshToken) throw Object.assign(new Error("Refresh token required"), { status: 401 });
    const session = await rotateSession(refreshToken);
    const response = NextResponse.json({ user: session.principal });
    setSessionCookies(response, session.accessToken, session.refreshToken, session.sessionId, session.persistent);
    setCsrfCookie(response);
    await audit({
      requestId: requestId(req),
      userId: session.principal.userId,
      action: "auth.refresh",
      outcome: "success",
    });
    return response;
  } catch (error) {
    return errorResponse(error, req);
  }
}
