import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/server/audit";
import { passwordLogin, setSessionCookies } from "@/lib/server/auth";
import { setCsrfCookie } from "@/lib/server/csrf";
import { assertPublicRequestGuards, errorResponse } from "@/lib/server/http";
import { loginSchema } from "@/lib/server/schemas/api";
import { requestId } from "@/lib/server/security";

export async function POST(req: NextRequest) {
  try {
    await assertPublicRequestGuards(req);
    const body = loginSchema.parse(await req.json());
    const session = await passwordLogin(body.email, body.password, body.rememberMe);
    const response = NextResponse.json({ user: session.principal });
    setSessionCookies(response, session.accessToken, session.refreshToken, session.persistent);
    setCsrfCookie(response);
    await audit({
      requestId: requestId(req),
      userId: session.principal.userId,
      action: "auth.login",
      outcome: "success",
    });
    return response;
  } catch (error) {
    await audit({
      requestId: requestId(req),
      action: "auth.login.failed",
      outcome: "failure",
      metadata: { path: req.nextUrl.pathname },
    }).catch(() => {});
    return errorResponse(error, req);
  }
}
