import type { NextRequest, NextResponse } from "next/server";
import { getEnv, isProduction } from "./env";
import { hashSecret, randomToken, signJson, verifySignedJson } from "./crypto";
import { getDbPool } from "./db";
import type { Principal, Role } from "./types";

export const ACCESS_COOKIE_NAME = "disha_access";
const ACCESS_COOKIE = ACCESS_COOKIE_NAME;
const REFRESH_COOKIE = "disha_refresh";
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 14 * 24 * 60 * 60;
const SESSION_REFRESH_TTL_SECONDS = 8 * 60 * 60;

interface TokenPayload {
  sub: string;
  email: string;
  roles: Role[];
  sessionId: string;
  typ: "access" | "refresh";
  jti: string;
  exp: number;
  persistent?: boolean;
}

export function authSigningSecret(): string {
  return getEnv().DISHA_JWT_SECRET ?? "development-only-secret-change-me-32bytes";
}

function cookieOptions(maxAge: number) {
  const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false;
  const forceSecure = process.env.DISHA_COOKIE_SECURE === "true";
  const disableSecure = process.env.DISHA_COOKIE_SECURE === "false";
  const secure = disableSecure ? false : (forceSecure || (isProduction() && isHttps));
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

async function storeRefreshToken(payload: TokenPayload, token: string): Promise<void> {
  const pool = getDbPool();
  if (!pool) return;
  await pool.query(
    `insert into refresh_tokens (jti, user_id, session_id, token_hash, expires_at)
     values ($1, $2, $3, $4, to_timestamp($5))
     on conflict (jti) do update set token_hash = excluded.token_hash, expires_at = excluded.expires_at, revoked_at = null`,
    [payload.jti, payload.sub, payload.sessionId, hashSecret(token), payload.exp],
  );
}

async function revokeRefreshToken(jti: string): Promise<void> {
  const pool = getDbPool();
  if (!pool) return;
  await pool.query("update refresh_tokens set revoked_at = now() where jti = $1", [jti]);
}

async function ensureRefreshUsable(payload: TokenPayload): Promise<void> {
  const pool = getDbPool();
  if (!pool) return;
  const result = await pool.query("select revoked_at from refresh_tokens where jti = $1", [payload.jti]);
  if (result.rowCount === 0 || result.rows[0].revoked_at) {
    throw Object.assign(new Error("Refresh token revoked"), { status: 401 });
  }
}

function createToken(
  base: Omit<TokenPayload, "typ" | "jti" | "exp">,
  typ: "access" | "refresh",
  refreshTtlSeconds = REFRESH_TTL_SECONDS,
) {
  const ttl = typ === "access" ? ACCESS_TTL_SECONDS : refreshTtlSeconds;
  const payload: TokenPayload = {
    ...base,
    typ,
    jti: randomToken(),
    exp: Math.floor(Date.now() / 1000) + ttl,
  };
  return { payload, token: signJson({ ...payload }, authSigningSecret()) };
}

export async function createSession(
  email: string,
  roles: Role[] = ["analyst"],
  options: { persistent?: boolean } = {},
) {
  const persistent = options.persistent ?? true;
  const userId = email.toLowerCase();
  const sessionId = randomToken();
  const base = { sub: userId, email, roles, sessionId, persistent };
  const access = createToken(base, "access");
  const refresh = createToken(
    base,
    "refresh",
    persistent ? REFRESH_TTL_SECONDS : SESSION_REFRESH_TTL_SECONDS,
  );
  await storeRefreshToken(refresh.payload, refresh.token);
  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    principal: { userId, email, roles, sessionId },
    persistent,
  };
}

export async function rotateSession(refreshToken: string) {
  const payload = verifySignedJson(refreshToken, authSigningSecret()) as unknown as TokenPayload;
  if (payload.typ !== "refresh") throw Object.assign(new Error("Refresh token required"), { status: 401 });
  await ensureRefreshUsable(payload);
  await revokeRefreshToken(payload.jti);
  return createSession(payload.email, payload.roles, { persistent: payload.persistent ?? true });
}

export function setSessionCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  persistent = true,
): void {
  response.cookies.set(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_TTL_SECONDS));
  response.cookies.set(
    REFRESH_COOKIE,
    refreshToken,
    cookieOptions(persistent ? REFRESH_TTL_SECONDS : SESSION_REFRESH_TTL_SECONDS),
  );
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
}

export function getRefreshToken(req: NextRequest): string | null {
  return req.cookies.get(REFRESH_COOKIE)?.value ?? null;
}

export function principalFromAccessToken(token: string): Principal {
  const payload = verifySignedJson(token, authSigningSecret()) as unknown as TokenPayload;
  if (payload.typ !== "access") throw Object.assign(new Error("Access token required"), { status: 401 });
  return {
    userId: payload.sub,
    email: payload.email,
    roles: payload.roles,
    sessionId: payload.sessionId,
  };
}

export function requirePrincipal(req: NextRequest): Principal {
  const token = req.cookies.get(ACCESS_COOKIE)?.value ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return principalFromAccessToken(token);
}

export async function devLogin(email: string, password: string, persistent = true) {
  const env = getEnv();
  const passwordMode = env.DISHA_AUTH_MODE === "password";
  const developmentMode = env.NODE_ENV !== "production" && env.DISHA_AUTH_MODE === "dev-jwt";
  if (!passwordMode && !developmentMode) {
    throw Object.assign(new Error("Password login is disabled"), { status: 403 });
  }
  const expected = env.DISHA_DEV_PASSWORD ?? "change-me-in-env";
  if (password !== expected) throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  const normalizedEmail = email.toLowerCase();
  const devAdmins = new Set((env.DISHA_DEV_ADMIN_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
  const roles: Role[] = devAdmins.has(normalizedEmail) ? ["admin"] : ["analyst"];
  return createSession(email, roles, { persistent });
}
