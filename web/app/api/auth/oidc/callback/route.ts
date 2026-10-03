import { NextRequest, NextResponse } from "next/server";

import { audit } from "@/lib/server/audit";
import {
  authSigningSecret,
  createSession,
  setSessionCookies,
} from "@/lib/server/auth";
import { verifySignedJson } from "@/lib/server/crypto";
import { getEnv } from "@/lib/server/env";
import { errorResponse } from "@/lib/server/http";
import {
  fetchMeriPehchaanJson,
  readDisplayEmailFromIdToken,
  requiredProviderString,
} from "@/lib/server/meri-pehchaan";
import { requestId } from "@/lib/server/security";

const OIDC_VERIFIER_COOKIE = "disha_oidc_verifier";

function safeReturnUrl(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value === "/workbench"
  ) {
    return "/dashboard";
  }
  return value;
}

function browserAcceptsJson(req: NextRequest) {
  return req.headers.get("accept")?.includes("application/json") ?? false;
}

function loginErrorRedirect(req: NextRequest, code: string) {
  const login = new URL("/login", req.nextUrl.origin);
  login.searchParams.set("authError", code);
  return NextResponse.redirect(login);
}

export async function GET(req: NextRequest) {
  try {
    const env = getEnv();
    if (env.DISHA_AUTH_MODE !== "oidc" && env.DISHA_AUTH_MODE !== "hybrid") {
      throw Object.assign(new Error("Government identity sign-in is disabled"), { status: 404 });
    }

    const providerError = req.nextUrl.searchParams.get("error");
    if (providerError) {
      if (!browserAcceptsJson(req)) return loginErrorRedirect(req, "government-signin-cancelled");
      throw Object.assign(new Error("Government identity authorization was not completed"), { status: 401 });
    }

    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    if (!code || !state) {
      throw Object.assign(new Error("Meri Pehchaan callback requires code and state"), { status: 400 });
    }

    let statePayload: Record<string, unknown>;
    try {
      statePayload = verifySignedJson(state, authSigningSecret());
    } catch {
      throw Object.assign(new Error("Invalid Meri Pehchaan state"), { status: 400 });
    }
    if (statePayload.provider !== "meri-pehchan") {
      throw Object.assign(new Error("Invalid government identity provider state"), { status: 400 });
    }

    const verifier = req.cookies.get(OIDC_VERIFIER_COOKIE)?.value;
    if (!verifier) {
      throw Object.assign(new Error("Meri Pehchaan PKCE verifier cookie is missing"), { status: 400 });
    }

    const clientId = env.DISHA_MERI_PEHCHAN_CLIENT_ID;
    const clientSecret = env.DISHA_MERI_PEHCHAN_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw Object.assign(new Error("Meri Pehchaan client credentials are not configured"), { status: 503 });
    }

    const redirectUri =
      env.DISHA_MERI_PEHCHAN_REDIRECT_URI ??
      env.DISHA_OIDC_REDIRECT_URI ??
      new URL("/api/auth/oidc/callback", req.nextUrl.origin).toString();

    const tokenSet = await fetchMeriPehchaanJson(env.DISHA_MERI_PEHCHAN_TOKEN_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization:
          "Basic " +
          Buffer.from(clientId + ":" + clientSecret, "utf8").toString("base64"),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: verifier,
      }),
    });
    const accessToken = requiredProviderString(tokenSet, "access_token");

    const profile = await fetchMeriPehchaanJson(env.DISHA_MERI_PEHCHAN_USER_URL, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: "Bearer " + accessToken,
      },
    });

    const digilockerId = requiredProviderString(profile, "digilockerid");
    requiredProviderString(profile, "name");

    // Authorization identity comes from the authenticated government /user response.
    // The ID-token email, when present, is display-only and is not used as the session subject.
    const displayIdentity =
      readDisplayEmailFromIdToken(tokenSet.id_token) ??
      `meri-pehchaan:${digilockerId}`;

    const session = await createSession(displayIdentity, ["analyst"], {
      subject: `meri-pehchaan:${digilockerId}`,
    });
    const response = NextResponse.redirect(
      new URL(safeReturnUrl(statePayload.returnUrl), req.nextUrl.origin),
    );
    setSessionCookies(response, session.accessToken, session.refreshToken);
    response.cookies.set(OIDC_VERIFIER_COOKIE, "", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/oidc",
      maxAge: 0,
    });

    await audit({
      requestId: requestId(req),
      action: "auth.oidc.callback",
      outcome: "success",
      metadata: { provider: "meri-pehchan" },
    });
    return response;
  } catch (error) {
    if (!browserAcceptsJson(req)) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? Number(error.status)
          : 500;
      return loginErrorRedirect(
        req,
        status === 503 ? "meri-pehchaan-not-configured" : "government-signin-failed",
      );
    }
    return errorResponse(error, req);
  }
}
