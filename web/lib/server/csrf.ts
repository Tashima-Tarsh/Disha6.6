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

  // 1. Bearer Token Auth (CLI, agents, programmatic APIs are immune to CSRF)
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) return;

  // 2. Browser Sec-Fetch-Site validation (Standard Defense-in-Depth against cross-origin forgery)
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") return;

  // 3. Origin / Host comparison
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return;
    } catch {}
  }

  // 4. Double-submit cookie verification
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get(CSRF_HEADER);
  if (cookieToken && headerToken && cookieToken === headerToken) {
    return;
  }

  throw Object.assign(new Error("Invalid CSRF token"), { status: 403 });
}
