import crypto from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { getDbPool } from "./db";
import { appendEvidenceEvent } from "../unified/evidence-ledger";
import type { Principal, Role } from "./types";

const SESSION_ID_BYTES = 32; // 256-bit
const ABSOLUTE_TTL_SECONDS = 8 * 60 * 60;      // 8 hours absolute
const IDLE_TTL_SECONDS = 30 * 60;              // 30 minutes idle
const REVOKE_ALL_REASON = "password-change";

export type SessionRecord = {
  sessionIdHash: string;
  userId: string;
  email: string;
  roles: Role[];
  deviceId?: string;
  ip?: string;
  geo?: string;
  userAgent?: string;
  createdAt: Date;
  lastSeen: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

type CreateSessionInput = {
  userId: string;
  email: string;
  roles: Role[];
  deviceId?: string;
  ip?: string;
  geo?: string;
  userAgent?: string;
};

function hashSessionId(sessionId: string): string {
  return crypto.createHash("sha256").update(sessionId).digest("hex");
}

function generateSessionId(): string {
  return crypto.randomBytes(SESSION_ID_BYTES).toString("base64url");
}

async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getDbPool();
  if (!pool) throw new Error("Session store requires DATABASE_URL");
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function createSessionRecord(input: CreateSessionInput): Promise<{ sessionId: string; record: SessionRecord }> {
  const sessionId = generateSessionId();
  const sessionIdHash = hashSessionId(sessionId);
  const now = new Date();
  const expiresAt = new Date(Date.now() + ABSOLUTE_TTL_SECONDS * 1000);

  const record: SessionRecord = {
    sessionIdHash,
    userId: input.userId,
    email: input.email,
    roles: input.roles,
    deviceId: input.deviceId,
    ip: input.ip,
    geo: input.geo,
    userAgent: input.userAgent,
    createdAt: now,
    lastSeen: now,
    expiresAt,
    revokedAt: null,
  };

  await withClient(async (client) => {
    await client.query("begin");
    try {
      await client.query(
        `insert into sessions (
          session_id_hash, user_id, email, roles, device_id, ip, geo, user_agent,
          created_at, last_seen, expires_at, revoked_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          record.sessionIdHash, record.userId, record.email, record.roles,
          record.deviceId ?? null, record.ip ?? null, record.geo ?? null,
          record.userAgent ?? null, record.createdAt, record.lastSeen,
          record.expiresAt, record.revokedAt,
        ],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });

  return { sessionId, record };
}

export async function getSessionRecord(sessionId: string): Promise<SessionRecord | null> {
  const sessionIdHash = hashSessionId(sessionId);
  const result = await withClient(async (client) => {
    const { rows } = await client.query<{
      session_id_hash: string; user_id: string; email: string; roles: Role[];
      device_id: string | null; ip: string | null; geo: string | null;
      user_agent: string | null; created_at: Date; last_seen: Date;
      expires_at: Date; revoked_at: Date | null;
    }>(
      `select * from sessions where session_id_hash = $1 and revoked_at is null and expires_at > now()`,
      [sessionIdHash],
    );
    return rows;
  });
  const row = result[0];
  if (!row) return null;
  return {
    sessionIdHash: row.session_id_hash,
    userId: row.user_id,
    email: row.email,
    roles: row.roles,
    deviceId: row.device_id ?? undefined,
    ip: row.ip ?? undefined,
    geo: row.geo ?? undefined,
    userAgent: row.user_agent ?? undefined,
    createdAt: row.created_at,
    lastSeen: row.last_seen,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
}

export async function touchSession(sessionId: string): Promise<void> {
  const sessionIdHash = hashSessionId(sessionId);
  await withClient(async (client) => {
    await client.query(
      `update sessions set last_seen = now() where session_id_hash = $1 and revoked_at is null and expires_at > now()`,
      [sessionIdHash],
    );
  });
}

export async function isSessionIdleExpired(sessionId: string): Promise<boolean> {
  const record = await getSessionRecord(sessionId);
  if (!record) return true;
  return Date.now() - record.lastSeen.getTime() > IDLE_TTL_SECONDS * 1000;
}

export async function rotateSession(sessionId: string): Promise<{ sessionId: string; record: SessionRecord }> {
  const oldRecord = await getSessionRecord(sessionId);
  if (!oldRecord) throw new Error("Session not found or revoked");

  // Mark old session revoked
  await withClient(async (client) => {
    await client.query(
      `update sessions set revoked_at = now() where session_id_hash = $1`,
      [hashSessionId(sessionId)],
    );
  });

  return createSessionRecord({
    userId: oldRecord.userId,
    email: oldRecord.email,
    roles: oldRecord.roles,
    deviceId: oldRecord.deviceId,
    ip: oldRecord.ip,
    geo: oldRecord.geo,
    userAgent: oldRecord.userAgent,
  });
}

export async function revokeSession(sessionId: string): Promise<void> {
  await withClient(async (client) => {
    await client.query(
      `update sessions set revoked_at = now() where session_id_hash = $1`,
      [hashSessionId(sessionId)],
    );
  });
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await withClient(async (client) => {
    await client.query(
      `update sessions set revoked_at = now() where user_id = $1 and revoked_at is null`,
      [userId],
    );
  });
}

export async function listSessionsForUser(userId: string): Promise<SessionRecord[]> {
  const result = await withClient(async (client) => {
    const { rows } = await client.query<{
      session_id_hash: string; user_id: string; email: string; roles: Role[];
      device_id: string | null; ip: string | null; geo: string | null;
      user_agent: string | null; created_at: Date; last_seen: Date;
      expires_at: Date; revoked_at: Date | null;
    }>(
      `select * from sessions where user_id = $1 order by last_seen desc`,
      [userId],
    );
    return rows;
  });
  return result.map((row) => ({
    sessionIdHash: row.session_id_hash,
    userId: row.user_id,
    email: row.email,
    roles: row.roles,
    deviceId: row.device_id ?? undefined,
    ip: row.ip ?? undefined,
    geo: row.geo ?? undefined,
    userAgent: row.user_agent ?? undefined,
    createdAt: row.created_at,
    lastSeen: row.last_seen,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  }));
}

export async function recordAuthEvent({
  missionId,
  userId,
  action,
  input,
  output,
}: {
  missionId: string;
  userId: string;
  action: string;
  input: unknown;
  output?: unknown;
}): Promise<void> {
  await appendEvidenceEvent({
    missionId,
    actor: userId,
    action,
    input,
    output,
  });
}

export function sessionIdFromCookie(req: { cookies: { get: (name: string) => { value?: string } | null } }): string | null {
  return req.cookies.get("__Host-disha_session")?.value ?? null;
}

export type PrincipalFromSession = { userId: string; email: string; roles: Role[]; sessionId: string };

export function principalFromSession(record: SessionRecord, sessionId: string): PrincipalFromSession {
  return { userId: record.userId, email: record.email, roles: record.roles, sessionId };
}
