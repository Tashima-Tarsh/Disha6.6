import type { NextRequest, NextResponse } from "next/server";
import { randomToken } from "./crypto";
import { isProduction } from "./env";

const CSRF_COOKIE = "disha_csrf";
const CSRF_HEADER = "x-csrf-token";

export function setCsrfCookie(response: NextResponse): string {
  const token = randomToken();
  const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false;
  const forceSecure = process.env.DISHA_COOKIE_SECURE === "true";
  const disableSecure = process.env.DISHA_COOKIE_SECURE === "false";
  const secure = disableSecure ? false : (forceSecure || (isProduction() && isHttps));
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
  });
  return token;
}

export function assertCsrf(req: NextRequest): void {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;
  const isDev = process.env.DISHA_AUTH_MODE === "dev-jwt" || process.env.NODE_ENV !== "production";
  if (isDev) return; // Local development does not require strict CSRF enforcement
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw Object.assign(new Error("Invalid CSRF token"), { status: 403 });
  }
}
