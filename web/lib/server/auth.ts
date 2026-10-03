import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { PoolClient } from "pg";
import crypto from "node:crypto";
import { getEnv, isProduction } from "./env";
import { hashSecret, randomToken, signJson, verifySecret, verifySignedJson } from "./crypto";
import { getDbPool } from "./db";
import type { Principal, Role } from "./types";

export const ACCESS_COOKIE_NAME = "disha_access";
const ACCESS_COOKIE = ACCESS_COOKIE_NAME;
const REFRESH_COOKIE = "disha_refresh";
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 14 * 24 * 60 * 60;
const SESSION_REFRESH_TTL_SECONDS = 8 * 60 * 60;
const tokenDigest = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

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

async function storeRefreshToken(payload: TokenPayload, token: string, client?: PoolClient): Promise<void> {
  const pool = client ?? getDbPool();
  if (!pool) return;
  await pool.query(
    `insert into refresh_tokens (jti, user_id, session_id, token_hash, expires_at)
     values ($1, $2, $3, $4, to_timestamp($5))
     on conflict (jti) do update set token_hash = excluded.token_hash, expires_at = excluded.expires_at, revoked_at = null`,
    [payload.jti, payload.sub, payload.sessionId, tokenDigest(token), payload.exp],
  );
}

const tokenSchema = z.object({
  sub: z.string().min(1), email: z.string().email(), roles: z.array(z.enum(["admin", "operator", "analyst", "viewer"])).min(1),
  sessionId: z.string().min(1), typ: z.enum(["access", "refresh"]), jti: z.string().min(1),
  exp: z.number().int().positive(), persistent: z.boolean().optional(),
});
function parseToken(token: string): TokenPayload {
  try { return tokenSchema.parse(verifySignedJson(token, authSigningSecret())); }
  catch { throw Object.assign(new Error("Invalid or expired session"), { status: 401 }); }
}

export async function revokeSession(sessionId: string): Promise<void> {
  const pool = getDbPool();
  if (pool) await pool.query("update refresh_tokens set revoked_at = now() where session_id = $1 and revoked_at is null", [sessionId]);
}

export async function revokeRequestSession(req: NextRequest): Promise<string | undefined> {
  for (const token of [req.cookies.get(ACCESS_COOKIE)?.value, getRefreshToken(req)]) {
    if (!token) continue;
    let payload: TokenPayload;
    try { payload = parseToken(token); } catch { continue; }
    await revokeSession(payload.sessionId);
    return payload.sub;
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
  options: { persistent?: boolean; userId?: string; sessionId?: string; client?: PoolClient } = {},
) {
  const persistent = options.persistent ?? true;
  const userId = options.userId ?? email.toLowerCase();
  const sessionId = options.sessionId ?? randomToken();
  const base = { sub: userId, email, roles, sessionId, persistent };
  const access = createToken(base, "access");
  const refresh = createToken(
    base,
    "refresh",
    persistent ? REFRESH_TTL_SECONDS : SESSION_REFRESH_TTL_SECONDS,
  );
  await storeRefreshToken(refresh.payload, refresh.token, options.client);
  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    principal: { userId, email, roles, sessionId },
    persistent,
  };
}

export async function rotateSession(refreshToken: string) {
  const payload = parseToken(refreshToken);
  if (payload.typ !== "refresh") throw Object.assign(new Error("Refresh token required"), { status: 401 });
  const pool = getDbPool();
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      // Serialize rotation with account reset/disable so resets revoke every resulting session.
      await client.query("select user_id from password_credentials where user_id = $1 for update", [payload.sub]);
      const stored = await client.query(
        "select token_hash from refresh_tokens where jti = $1 and session_id = $2 and revoked_at is null and expires_at > now() for update",
        [payload.jti, payload.sessionId],
      );
      const storedHash = stored.rows[0]?.token_hash as string | undefined;
      if (!storedHash || !(storedHash === tokenDigest(refreshToken) || (storedHash.includes(":") && verifySecret(refreshToken, storedHash)))) {
        throw Object.assign(new Error("Refresh token revoked"), { status: 401 });
      }
      const consumed = await client.query(
        "update refresh_tokens set revoked_at = now() where jti = $1 and session_id = $2 and token_hash = $3 and revoked_at is null and expires_at > now() returning jti",
        [payload.jti, payload.sessionId, storedHash],
      );
      if (!consumed.rowCount) throw Object.assign(new Error("Refresh token revoked"), { status: 401 });
      const session = await createSession(payload.email, payload.roles, { persistent: payload.persistent ?? true, userId: payload.sub, sessionId: payload.sessionId, client });
      await client.query("commit");
      return session;
    } catch (error) { await client.query("rollback"); throw error; }
    finally { client.release(); }
  }
  return createSession(payload.email, payload.roles, { persistent: payload.persistent ?? true, userId: payload.sub });
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

export async function principalFromAccessToken(token: string): Promise<Principal> {
  const payload = parseToken(token);
  if (payload.typ !== "access") throw Object.assign(new Error("Access token required"), { status: 401 });
  const pool = getDbPool();
  if (pool) {
    const active = await pool.query("select 1 from refresh_tokens where session_id = $1 and user_id = $2 and revoked_at is null and expires_at > now() limit 1", [payload.sessionId, payload.sub]);
    if (!active.rowCount) throw Object.assign(new Error("Session revoked"), { status: 401 });
  }
  return {
    userId: payload.sub,
    email: payload.email,
    roles: payload.roles,
    sessionId: payload.sessionId,
  };
}

export async function requirePrincipal(req: NextRequest): Promise<Principal> {
  const token = req.cookies.get(ACCESS_COOKIE)?.value ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return principalFromAccessToken(token);
}

export async function passwordLogin(email: string, password: string, persistent = true) {
  const env = getEnv();
  const normalizedEmail = email.trim().toLowerCase();

  if (env.NODE_ENV !== "production" && env.DISHA_AUTH_MODE === "dev-jwt") {
    const expected = env.DISHA_DEV_PASSWORD ?? "change-me-in-env";
    if (password !== expected) throw Object.assign(new Error("Invalid credentials"), { status: 401 });
    const devAdmins = new Set(
      (env.DISHA_DEV_ADMIN_EMAILS ?? "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    );
    const roles: Role[] = devAdmins.has(normalizedEmail) ? ["admin"] : ["analyst"];
    return createSession(normalizedEmail, roles, { persistent });
  }

  if (env.DISHA_AUTH_MODE !== "password") {
    throw Object.assign(new Error("Password login is disabled"), { status: 403 });
  }

  const pool = getDbPool();
  if (!pool) {
    throw Object.assign(new Error("Password authentication requires the production database"), { status: 503 });
  }

  const result = await pool.query(
    `select id, email, roles, password_hash, disabled_at
       from users
      where lower(email) = $1
      limit 1`,
    [normalizedEmail],
  );
  const user = result.rows[0] as
    | { id: string; email: string; roles: Role[]; password_hash: string | null; disabled_at: Date | null }
    | undefined;

  if (!user || user.disabled_at || !user.password_hash || !verifySecret(password, user.password_hash)) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  return createSession(user.email, user.roles?.length ? user.roles : ["analyst"], { persistent });
}

// Compatibility for callers that explicitly use the local development entrypoint.
export const devLogin = login;
