import { safeReturnUrl } from "@/lib/auth-navigation";
import { NextRequest, NextResponse } from "next/server";

import { audit } from "@/lib/server/audit";
import { passwordLogin, setSessionCookies } from "@/lib/server/auth";
import { setCsrfCookie } from "@/lib/server/csrf";
import { assertPublicRequestGuards, errorResponse } from "@/lib/server/http";
import { requestId } from "@/lib/server/security";



export async function POST(req: NextRequest) {
  try {
    await assertPublicRequestGuards(req);
    const form = await req.formData();
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const session = await passwordLogin(email, password);
    const response = NextResponse.redirect(new URL(safeReturnUrl(form.get("returnUrl")), req.nextUrl.origin), 303);
    setSessionCookies(response, session.accessToken, session.refreshToken);
    setCsrfCookie(response);
    await audit({
      requestId: requestId(req),
      userId: session.principal.userId,
      action: "auth.login.form",
      outcome: "success",
    });
    return response;
  } catch (error) {
    return errorResponse(error, req);
  }
}
