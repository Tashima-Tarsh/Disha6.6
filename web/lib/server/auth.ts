import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { getEnv, isProduction } from "./env";
import { hmacPepper } from "./crypto";
import { getDbPool } from "./db";
import type { Role } from "./types";
import {
  hashPassword,
  verifyPassword,
  needsRehash,
  dummyHash,
  checkBreach,
  estimateEntropy,
} from "./password";
import { createSessionRecord, principalFromSession, SessionRecord } from "./session";
import { appendEvidenceEvent } from "../unified/evidence-ledger";
import { requestId } from "./security";

export const ACCESS_COOKIE_NAME = "disha_access";
const REFRESH_COOKIE = "disha_refresh";
const SESSION_COOKIE = "__Host-disha_session";
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 14 * 24 * 60 * 60;

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
  const secret = getEnv().DISHA_JWT_SECRET;
  if (!secret) throw new Error("DISHA_JWT_SECRET must be set; no fallback secret is allowed");
  return secret;
}

const inMemoryRevokedJtis = new Map<string, number>();

function pruneRevokedJtis(): void {
  const now = Date.now();
  for (const [jti, exp] of inMemoryRevokedJtis.entries()) {
    if (exp <= now) inMemoryRevokedJtis.delete(jti);
  }
}

async function storeRefreshToken(payload: TokenPayload, token: string): Promise<void> {
  const pool = getDbPool();
  if (!pool) return;
  await pool.query(
    `insert into refresh_tokens (jti, user_id, session_id, token_hash, expires_at)
     values ($1, $2, $3, $4, to_timestamp($5))
     on conflict (jti) do update set token_hash = excluded.token_hash, expires_at = excluded.expires_at, revoked_at = null`,
    [payload.jti, payload.sub, payload.sessionId, hmacPepper(token).toString("base64url"), payload.exp],
  );
}

async function revokeRefreshToken(jti: string): Promise<void> {
  const pool = getDbPool();
  if (pool) {
    await pool.query("update refresh_tokens set revoked_at = now() where jti = $1", [jti]);
    return;
  }
  pruneRevokedJtis();
  inMemoryRevokedJtis.set(jti, Date.now() + REFRESH_TTL_SECONDS * 1000);
}

async function ensureRefreshUsable(payload: TokenPayload): Promise<void> {
  const pool = getDbPool();
  if (pool) {
    const result = await pool.query("select revoked_at from refresh_tokens where jti = $1", [payload.jti]);
    if (result.rowCount === 0 || result.rows[0].revoked_at) {
      throw Object.assign(new Error("Refresh token revoked"), { status: 401 });
    }
    return;
  }
  pruneRevokedJtis();
  if (inMemoryRevokedJtis.has(payload.jti)) {
    throw Object.assign(new Error("Refresh token revoked"), { status: 401 });
  }
}

function createToken(base: Omit<TokenPayload, "typ" | "jti" | "exp">, typ: "access" | "refresh", ttlSeconds: number) {
  const payload: TokenPayload = {
    ...base,
    typ,
    jti: crypto.randomBytes(16).toString("base64url"),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", authSigningSecret()).update(`${header}.${body}`).digest("base64url");
  return { payload, token: `${header}.${body}.${signature}` };
}

export async function createSession(
  email: string,
  roles: Role[] = ["analyst"],
  options: { persistent?: boolean; subject?: string } = {},
) {
  const persistent = options.persistent ?? true;
  const userId = (options.subject ?? email).trim().toLowerCase();
  const sessionId = crypto.randomBytes(32).toString("base64url");
  const base = { sub: userId, email, roles, sessionId, persistent };
  const access = createToken(base, "access", ACCESS_TTL_SECONDS);
  const refresh = createToken(base, "refresh", persistent ? REFRESH_TTL_SECONDS : 8 * 60 * 60);
  await storeRefreshToken(refresh.payload, refresh.token);
  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    principal: { userId, email, roles, sessionId },
    sessionId,
    persistent,
  };
}

export async function rotateSession(refreshToken: string) {
  const parts = refreshToken.split(".");
  if (parts.length !== 3) throw Object.assign(new Error("Malformed token"), { status: 401 });
  const [header, body, signature] = parts;
  const expected = crypto.createHmac("sha256", authSigningSecret()).update(`${header}.${body}`).digest("base64url");
  const sigBytes = Buffer.from(signature, "base64url");
  const expBytes = Buffer.from(expected, "base64url");
  if (sigBytes.length !== expBytes.length || !crypto.timingSafeEqual(sigBytes, expBytes)) {
    throw Object.assign(new Error("Invalid token signature"), { status: 401 });
  }
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
  if (payload.typ !== "refresh") throw Object.assign(new Error("Refresh token required"), { status: 401 });
  await ensureRefreshUsable(payload);
  await revokeRefreshToken(payload.jti);
  return createSession(payload.email, payload.roles, {
    persistent: payload.persistent ?? true,
    subject: payload.sub,
  });
}

export function setSessionCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  sessionId: string,
  persistent = true,
): void {
  const secure = process.env.DISHA_COOKIE_SECURE === "true"
    || (isProduction() && process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://"));
  response.cookies.set(ACCESS_COOKIE_NAME, accessToken, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: ACCESS_TTL_SECONDS });
  response.cookies.set(REFRESH_COOKIE, refreshToken, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: persistent ? REFRESH_TTL_SECONDS : 8 * 60 * 60 });
  response.cookies.set(SESSION_COOKIE, sessionId, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: persistent ? REFRESH_TTL_SECONDS : 8 * 60 * 60 });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE_NAME, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export function getRefreshToken(req: NextRequest): string | null {
  return req.cookies.get(REFRESH_COOKIE)?.value ?? null;
}

export function principalFromAccessToken(token: string): { userId: string; email: string; roles: Role[]; sessionId: string } {
  const parts = token.split(".");
  if (parts.length !== 3) throw Object.assign(new Error("Malformed token"), { status: 401 });
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  if (payload.typ !== "access") throw Object.assign(new Error("Access token required"), { status: 401 });
  return { userId: payload.sub, email: payload.email, roles: payload.roles, sessionId: payload.sessionId };
}

export function requirePrincipal(req: NextRequest): { userId: string; email: string; roles: Role[]; sessionId: string } {
  const token = req.cookies.get(ACCESS_COOKIE_NAME)?.value ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return principalFromAccessToken(token);
}

async function recordFailedAttempt(userId: string | null, email: string): Promise<void> {
  const pool = getDbPool();
  if (!pool) return;
  if (userId) {
    await pool.query(
      `update users set failed_attempts = failed_attempts + 1,
        locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else locked_until end
       where id = $1`,
      [userId],
    );
  }
  await appendEvidenceEvent({
    missionId: `auth:${email}`,
    actor: userId ?? "unknown",
    action: "auth.login.failed",
    input: { email },
    output: { locked: userId ? true : false },
  });
}

async function recordSuccess(userId: string, email: string): Promise<void> {
  const pool = getDbPool();
  if (pool) {
    await pool.query(`update users set failed_attempts = 0, locked_until = null where id = $1`, [userId]);
  }
  await appendEvidenceEvent({
    missionId: `auth:${email}`,
    actor: userId,
    action: "auth.login",
    input: { email },
    output: { sessionId: crypto.randomBytes(16).toString("base64url") },
  });
}

export async function passwordLogin(email: string, password: string, deviceId?: string, ip?: string, geo?: string, userAgent?: string, persistent = true) {
  const env = getEnv();
  const normalizedEmail = email.trim().toLowerCase();
  const start = Date.now();

  if (env.NODE_ENV !== "production" && env.DISHA_AUTH_MODE === "dev-jwt") {
    const expected = env.DISHA_DEV_PASSWORD;
    if (!expected) throw new Error("DISHA_DEV_PASSWORD must be set for dev-jwt auth");
    if (password !== expected) throw Object.assign(new Error("Credentials invalid"), { status: 401 });
    const devAdmins = new Set((env.DISHA_DEV_ADMIN_EMAILS ?? "").split(",").map((i) => i.trim().toLowerCase()).filter(Boolean));
    const roles: Role[] = devAdmins.has(normalizedEmail) ? ["admin"] : ["analyst"];
    const session = await createSession(normalizedEmail, roles, { persistent });
    await recordSuccess(session.principal.userId, normalizedEmail);
    return session;
  }

  if (env.DISHA_AUTH_MODE !== "password" && env.DISHA_AUTH_MODE !== "hybrid") {
    throw Object.assign(new Error("Credentials invalid"), { status: 401 });
  }

  const pool = getDbPool();
  if (!pool) throw Object.assign(new Error("Credentials invalid"), { status: 503 });

  const userResult = await pool.query(
    `select id, email, roles, password_hash, disabled_at, locked_until, failed_attempts
     from users where lower(email) = $1 limit 1`,
    [normalizedEmail],
  );
  const user = userResult.rows[0] as
    | { id: string; email: string; roles: Role[]; password_hash: string | null; disabled_at: Date | null; locked_until: Date | null; failed_attempts: number }
    | undefined;

  const userExists = !!user && !user.disabled_at;
  if (!userExists) {
    await dummyHash();
    void checkBreach(password);
    void estimateEntropy(password);
    const elapsed = Date.now() - start;
    if (elapsed < 300) await new Promise((r) => setTimeout(r, 300 - elapsed));
    throw Object.assign(new Error("Credentials invalid"), { status: 401 });
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    await dummyHash();
    throw Object.assign(new Error("Credentials invalid"), { status: 401 });
  }

  if (!user.password_hash) {
    await dummyHash();
    await recordFailedAttempt(user.id, normalizedEmail);
    throw Object.assign(new Error("Credentials invalid"), { status: 401 });
  }

  const { ok, needsRehash: needsRehashFlag } = await verifyPassword(password, user.password_hash);
  if (!ok) {
    await recordFailedAttempt(user.id, normalizedEmail);
    throw Object.assign(new Error("Credentials invalid"), { status: 401 });
  }

  const breach = checkBreach(password);
  if (breach.breached) {
    await recordFailedAttempt(user.id, normalizedEmail);
    await pool.query(`update users set locked_until = now() + interval '15 minutes' where id = $1`, [user.id]);
    throw Object.assign(new Error("Credentials invalid"), { status: 401 });
  }

  if (needsRehashFlag) {
    const { encoded } = await hashPassword(password);
    await pool.query(`update users set password_hash = $1, password_algorithm = 'argon2id', password_changed_at = now() where id = $2`, [encoded, user.id]);
  }

  await recordSuccess(user.id, normalizedEmail);
  return createSession(user.email, user.roles?.length ? user.roles : ["analyst"], { persistent, subject: user.id });
}
