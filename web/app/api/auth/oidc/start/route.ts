import { safeReturnUrl } from "@/lib/auth-navigation";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { audit } from "@/lib/server/audit";
import { authSigningSecret } from "@/lib/server/auth";
import { signJson } from "@/lib/server/crypto";
import { getEnv } from "@/lib/server/env";
import { assertPublicRequestGuards, errorResponse } from "@/lib/server/http";
import { assertTrustedMeriPehchaanUrl } from "@/lib/server/meri-pehchaan";
import { oidcStartSchema } from "@/lib/server/schemas/api";
import { requestId } from "@/lib/server/security";

const OIDC_VERIFIER_COOKIE = "disha_oidc_verifier";



function browserAcceptsJson(req: NextRequest) {
  return req.headers.get("accept")?.includes("application/json") ?? false;
}

function configurationError(req: NextRequest, returnUrl?: string) {
  if (browserAcceptsJson(req)) {
    return NextResponse.json(
      {
        error: "Meri Pehchaan sign-in is awaiting application credentials issued through the official partner onboarding process.",
        code: "meri_pehchaan_not_configured",
        partnerPortal: "https://dlpartners.meripehchaan.gov.in/welcome/",
      },
      { status: 503 },
    );
  }
  const login = new URL("/login", req.nextUrl.origin);
  login.searchParams.set("authError", "meri-pehchaan-not-configured");
  login.searchParams.set("returnUrl", safeReturnUrl(returnUrl));
  return NextResponse.redirect(login);
}

export async function GET(req: NextRequest) {
  try {
    await assertPublicRequestGuards(req);
    const query = oidcStartSchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    const env = getEnv();

    if (env.DISHA_AUTH_MODE !== "oidc" && env.DISHA_AUTH_MODE !== "hybrid") {
      return configurationError(req, query.returnUrl);
    }

    const clientId = env.DISHA_MERI_PEHCHAN_CLIENT_ID;
    if (!clientId) return configurationError(req, query.returnUrl);

    const authUrl = assertTrustedMeriPehchaanUrl(env.DISHA_MERI_PEHCHAN_AUTH_URL);
    const redirectUri =
      env.DISHA_MERI_PEHCHAN_REDIRECT_URI ??
      env.DISHA_OIDC_REDIRECT_URI ??
      new URL("/api/auth/oidc/callback", req.nextUrl.origin).toString();

    const verifier = crypto.randomBytes(48).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    const state = signJson(
      {
        provider: query.provider,
        returnUrl: safeReturnUrl(query.returnUrl),
        nonce: crypto.randomUUID(),
        exp: Math.floor(Date.now() / 1000) + 10 * 60,
      },
      authSigningSecret(),
    );

    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    await audit({
      requestId: requestId(req),
      action: "auth.oidc.start",
      outcome: "success",
      metadata: { provider: query.provider },
    });

    const response = browserAcceptsJson(req)
      ? NextResponse.json({ redirectUrl: authUrl.toString() })
      : NextResponse.redirect(authUrl);
    response.cookies.set(OIDC_VERIFIER_COOKIE, verifier, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/oidc",
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    return errorResponse(error, req);
  }
}
