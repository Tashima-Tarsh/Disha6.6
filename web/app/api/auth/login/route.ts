import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { loginSchema } from "@/lib/server/schemas/api";
import { passwordLogin } from "@/lib/server/auth";
import { setSessionCookies } from "@/lib/server/auth";
import { checkAllAuthRateLimits } from "@/lib/server/auth-rate-limit";
import { requestId } from "@/lib/server/security";

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    await checkAllAuthRateLimits(req, undefined);
    const body = loginSchema.parse(await req.json());
    const { email, password } = body;
    const session = await passwordLogin(
      email,
      password,
      req.headers.get("x-device-id") ?? undefined,
      req.headers.get("x-real-ip") ?? req.headers.get("cf-connecting-ip") ?? undefined,
      undefined,
      req.headers.get("user-agent") ?? undefined,
      body.rememberMe,
    );
    const response = NextResponse.json({ user: session.principal });
    setSessionCookies(response, session.accessToken, session.refreshToken, session.sessionId, session.persistent);
    return response;
  } catch (error) {
    // Equalise total response time so failures don't leak timing.
    const elapsed = Date.now() - start;
    if (elapsed < 600) {
      await new Promise((r) => setTimeout(r, 600 - elapsed));
    }
    return errorResponse(error, req);
  }
}
