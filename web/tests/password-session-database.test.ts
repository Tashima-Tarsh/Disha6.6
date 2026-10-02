import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { hashPassword, verifyPassword } from "../scripts/lib/passwords.mjs";
import { resetEnvForTests } from "../lib/server/env";
import { createSession, principalFromAccessToken, revokeSession, rotateSession } from "../lib/server/auth";
import { passwordLogin, changePassword } from "../lib/server/password-auth";
import { appendEvidenceEvent, getEvidenceEvents, verifyEvidenceChain } from "../lib/unified/evidence-ledger";

const state = vi.hoisted(() => ({ pool: null as Pool | null }));
vi.mock("../lib/server/db", () => ({ getDbPool: () => state.pool }));
let database: PGlite;
const password = ["isolated", "database", "test", "passphrase"].join("-");
let encoded: string;
beforeAll(async () => {
  database = new PGlite();
  await database.exec(await fs.readFile(new URL("../database/schema.sql", import.meta.url), "utf8"));
  await database.exec(await fs.readFile(new URL("../database/202610020001_password_accounts.sql", import.meta.url), "utf8"));
  const query = async (sql: string, values?: unknown[]) => {
    const result = await database.query(sql, values);
    return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 };
  };
  state.pool = { query, connect: async () => ({ query, release: () => undefined }) } as unknown as Pool;
  encoded = await hashPassword(password);
}, 30000);
beforeEach(async () => {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("DISHA_AUTH_MODE", "password");
  vi.stubEnv("DATABASE_URL", "postgresql://test-only/isolated_test"); resetEnvForTests();
  await database.exec("truncate password_credentials, users, refresh_tokens, evidence_events cascade");
  await database.query("insert into users (id, email, roles) values ($1, $2, $3)", ["test-user", "analyst@example.com", ["viewer"]]);
  await database.query("insert into password_credentials (user_id, email, password_hash) values ($1, $2, $3)", ["test-user", "analyst@example.com", encoded]);
});
afterAll(async () => { state.pool = null; vi.unstubAllEnvs(); resetEnvForTests(); await database?.close(); });

it("stores a salted, one-way credential and uses database roles", async () => {
  expect(encoded).not.toContain(password);
  expect(await hashPassword(password)).not.toBe(encoded);
  expect(await verifyPassword(password, encoded)).toBe(true);
  const session = await passwordLogin("ANALYST@example.com", password);
  expect(session.principal.roles).toEqual(["viewer"]);
  expect((await principalFromAccessToken(session.accessToken)).userId).toBe("test-user");
});
it("rejects unknown accounts and incorrect passwords", async () => {
  await expect(passwordLogin("admin@example.com", password)).rejects.toMatchObject({ status: 401 });
  await expect(passwordLogin("analyst@example.com", "a different passphrase")).rejects.toMatchObject({ status: 401 });
});
it("locks an account after five failures, then permits recovery after expiry", async () => {
  for (let attempt = 0; attempt < 5; attempt++) await expect(passwordLogin("analyst@example.com", "a different passphrase")).rejects.toMatchObject({ status: 401 });
  await expect(passwordLogin("analyst@example.com", password)).rejects.toMatchObject({ status: 401 });
  await database.query("update password_credentials set locked_until = now() - interval '1 second'");
  expect((await passwordLogin("analyst@example.com", password)).principal.userId).toBe("test-user");
});
it("revokes access and refresh tokens on logout", async () => {
  const session = await passwordLogin("analyst@example.com", password);
  await revokeSession(session.principal.sessionId);
  await expect(principalFromAccessToken(session.accessToken)).rejects.toMatchObject({ status: 401 });
  await expect(rotateSession(session.refreshToken)).rejects.toMatchObject({ status: 401 });
});
it("consumes refresh tokens once and keeps the session valid after rotation", async () => {
  const session = await passwordLogin("analyst@example.com", password);
  const next = await rotateSession(session.refreshToken);
  expect(next.principal.sessionId).toBe(session.principal.sessionId);
  await expect(rotateSession(session.refreshToken)).rejects.toMatchObject({ status: 401 });
  expect((await principalFromAccessToken(next.accessToken)).userId).toBe("test-user");
});
it("password change revokes every session and rejects the old password", async () => {
  const first = await passwordLogin("analyst@example.com", password);
  const second = await createSession("analyst@example.com", ["viewer"], { userId: "test-user" });
  const replacement = password + "-changed";
  await changePassword("test-user", password, replacement);
  for (const session of [first, second]) {
    await expect(principalFromAccessToken(session.accessToken)).rejects.toMatchObject({ status: 401 });
    await expect(rotateSession(session.refreshToken)).rejects.toMatchObject({ status: 401 });
  }
  await expect(passwordLogin("analyst@example.com", password)).rejects.toMatchObject({ status: 401 });
  expect((await passwordLogin("analyst@example.com", replacement)).principal.userId).toBe("test-user");
});
it("rolls back consumed refresh state if replacement persistence fails", async () => {
  const session = await passwordLogin("analyst@example.com", password);
  await database.exec("create function reject_refresh() returns trigger language plpgsql as $$ begin raise exception 'test storage failure'; end $$; create trigger reject_refresh before insert on refresh_tokens for each row execute function reject_refresh();");
  try { await expect(rotateSession(session.refreshToken)).rejects.toThrow("test storage failure"); }
  finally { await database.exec("drop trigger reject_refresh on refresh_tokens; drop function reject_refresh()"); }
  expect((await principalFromAccessToken(session.accessToken)).userId).toBe("test-user");
  expect((await rotateSession(session.refreshToken)).principal.userId).toBe("test-user");
});
it("preserves omitted and empty lens results through a PostgreSQL round trip", async () => {
  await appendEvidenceEvent({ missionId: "round-trip", actor: "test-user", action: "received", input: { message: "synthetic test input" } });
  await appendEvidenceEvent({ missionId: "round-trip", actor: "test-user", action: "reviewed", input: { reviewed: true }, lensResults: [] });
  const stored = await getEvidenceEvents("round-trip");
  expect(stored[0].lensResults).toBeUndefined(); expect(stored[1].lensResults).toEqual([]);
  expect(verifyEvidenceChain(stored)).toEqual({ ok: true, errors: [] });
});
it("recovers the historical null-to-empty serialization only when the original digest matches", async () => {
  await appendEvidenceEvent({ missionId: "historical", actor: "test-user", action: "received", input: "synthetic test evidence" });
  await database.query("update evidence_events set lens_results = array[]::text[] where mission_id = 'historical'");
  expect(verifyEvidenceChain(await getEvidenceEvents("historical")).ok).toBe(true);
  await database.query("update evidence_events set lens_results = array['modified'] where mission_id = 'historical'");
  expect(verifyEvidenceChain(await getEvidenceEvents("historical")).ok).toBe(false);
});
