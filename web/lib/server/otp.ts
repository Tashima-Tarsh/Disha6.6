import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

import { authSigningSecret, createSession, setSessionCookies } from "./auth";
import { hashSecret, signJson, verifySecret, verifySignedJson } from "./crypto";
import { getEnv, isProduction } from "./env";
import { getRedisClient } from "./redis";

const OTP_COOKIE = "disha_otp_challenge";
const OTP_TTL_SECONDS = 5 * 60;
const MAX_OTP_ATTEMPTS = 5;

type OtpChallenge = {
  challengeId?: string;
  mobile: string;
  codeHash: string;
  attempts: number;
  exp: number;
};

// In-memory fallback attempt tracker with timestamp
const memoryAttempts = new Map<string, { attempts: number; expiresAt: number }>();

function pruneExpiredAttempts(): void {
  const now = Date.now();
  for (const [key, val] of memoryAttempts.entries()) {
    if (val.expiresAt <= now) {
      memoryAttempts.delete(key);
    }
  }
}

async function recordOtpAttempt(key: string): Promise<number> {
  try {
    const redis = await getRedisClient();
    if (redis) {
      const attemptsKey = `otp:attempts:${key}`;
      const count = await redis.incr(attemptsKey);
      if (count === 1) await redis.expire(attemptsKey, OTP_TTL_SECONDS);
      return count;
    }
  } catch {}

  pruneExpiredAttempts();
  const now = Date.now();
  const current = memoryAttempts.get(key);
  if (!current || current.expiresAt <= now) {
    memoryAttempts.set(key, { attempts: 1, expiresAt: now + OTP_TTL_SECONDS * 1000 });
    return 1;
  }
  current.attempts += 1;
  return current.attempts;
}

async function clearOtpAttempts(key: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (redis) {
      await redis.del(`otp:attempts:${key}`).catch(() => {});
    }
  } catch {}
  memoryAttempts.delete(key);
}

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

function shouldExposeDevCode(): boolean {
  if (process.env.DISHA_EXPOSE_DEV_OTP === "true") return true;
  if (process.env.DISHA_EXPOSE_DEV_OTP === "false") return false;
  return getEnv().NODE_ENV === "test";
}

export function issueOtpChallenge(response: NextResponse, mobile: string) {
  const normalizedMobile = normalizeMobile(mobile);
  const code = createOtpCode();
  const challengeId = crypto.randomUUID();
  const challenge: OtpChallenge = {
    challengeId,
    mobile: normalizedMobile,
    codeHash: hashSecret(code),
    attempts: 0,
    exp: Math.floor(Date.now() / 1000) + OTP_TTL_SECONDS,
  };

  response.cookies.set(OTP_COOKIE, signJson(challenge, authSigningSecret()), cookieOptions(OTP_TTL_SECONDS));

  return {
    mobile: normalizedMobile,
    expiresInSeconds: OTP_TTL_SECONDS,
    devCode: shouldExposeDevCode() ? code : undefined,
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
  const normalizedMobile = normalizeMobile(mobile);

  if (challenge.mobile !== normalizedMobile) {
    throw Object.assign(new Error("OTP mobile number does not match the active challenge."), { status: 401 });
  }

  const trackerKey = challenge.challengeId || normalizedMobile;
  const serverAttempts = await recordOtpAttempt(trackerKey);

  if (serverAttempts > MAX_OTP_ATTEMPTS || challenge.attempts >= MAX_OTP_ATTEMPTS) {
    response.cookies.set(OTP_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
    await clearOtpAttempts(trackerKey);
    throw Object.assign(new Error("OTP attempt limit exceeded. Request a fresh OTP."), { status: 429 });
  }

  if (!verifySecret(code, challenge.codeHash)) {
    const updated = { ...challenge, attempts: Math.max(challenge.attempts + 1, serverAttempts) };
    const remainingTtl = Math.max(1, challenge.exp - Math.floor(Date.now() / 1000));
    response.cookies.set(OTP_COOKIE, signJson(updated, authSigningSecret()), cookieOptions(remainingTtl));
    throw Object.assign(new Error("Invalid OTP."), { status: 401 });
  }

  await clearOtpAttempts(trackerKey);
  response.cookies.set(OTP_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  const mobileDigits = normalizedMobile.replace(/\D/g, "");
  const session = await createSession(`mobile-${mobileDigits}@disha.local`, ["analyst"]);
  setSessionCookies(response, session.accessToken, session.refreshToken);
  return session;
}
