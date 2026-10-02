import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

import { authSigningSecret, createSession, setSessionCookies } from "./auth";
import { hashSecret, signJson, verifySecret, verifySignedJson } from "./crypto";
import { getEnv, isProduction } from "./env";

const OTP_COOKIE = "disha_otp_challenge";
const OTP_TTL_SECONDS = 5 * 60;

type OtpChallenge = {
  mobile: string;
  codeHash: string;
  attempts: number;
  exp: number;
};

function normalizeMobile(mobile: string) {
  const trimmed = mobile.trim();
  return trimmed.startsWith("+") ? trimmed : `+91${trimmed.replace(/^0+/, "")}`;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

function createOtpCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function isDevMode() {
  return getEnv().NODE_ENV !== "production";
}

export function issueOtpChallenge(response: NextResponse, mobile: string) {
  if (isProduction()) throw Object.assign(new Error("SMS sign-in is unavailable: no verified delivery provider is configured. Use OIDC."), { status: 503 });
  const normalizedMobile = normalizeMobile(mobile);
  const code = createOtpCode();
  const challenge: OtpChallenge = {
    mobile: normalizedMobile,
    codeHash: hashSecret(code),
    attempts: 0,
    exp: Math.floor(Date.now() / 1000) + OTP_TTL_SECONDS,
  };

  response.cookies.set(OTP_COOKIE, signJson(challenge, authSigningSecret()), cookieOptions(OTP_TTL_SECONDS));

  return {
    mobile: normalizedMobile,
    expiresInSeconds: OTP_TTL_SECONDS,
    devCode: isDevMode() ? code : undefined,
  };
}

export async function verifyOtpChallenge(req: NextRequest, response: NextResponse, mobile: string, code: string) {
  const token = req.cookies.get(OTP_COOKIE)?.value;
  if (!token) throw Object.assign(new Error("OTP challenge not found. Request a fresh OTP."), { status: 401 });

  let challenge: OtpChallenge;
  try {
    challenge = verifySignedJson(token, authSigningSecret()) as unknown as OtpChallenge;
  } catch {
    response.cookies.set(OTP_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
    throw Object.assign(new Error("OTP challenge expired. Request a fresh OTP."), { status: 401 });
  }
  if (isProduction()) throw Object.assign(new Error("SMS sign-in is unavailable: no verified delivery provider is configured. Use OIDC."), { status: 503 });
  const normalizedMobile = normalizeMobile(mobile);

  if (challenge.mobile !== normalizedMobile) {
    throw Object.assign(new Error("OTP mobile number does not match the active challenge."), { status: 401 });
  }
  if (challenge.attempts >= 5) {
    response.cookies.set(OTP_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
    throw Object.assign(new Error("OTP attempt limit exceeded. Request a fresh OTP."), { status: 429 });
  }

  if (!verifySecret(code, challenge.codeHash)) {
    const updated = { ...challenge, attempts: challenge.attempts + 1 };
    const remainingTtl = Math.max(1, challenge.exp - Math.floor(Date.now() / 1000));
    response.cookies.set(OTP_COOKIE, signJson(updated, authSigningSecret()), cookieOptions(remainingTtl));
    throw Object.assign(new Error("Invalid OTP."), { status: 401 });
  }

  response.cookies.set(OTP_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  const mobileDigits = normalizedMobile.replace(/\D/g, "");
  const session = await createSession(`mobile-${mobileDigits}@disha.local`, ["analyst"]);
  setSessionCookies(response, session.accessToken, session.refreshToken);
  return session;
}
