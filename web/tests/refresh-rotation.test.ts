import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../lib/server/db", () => ({ getDbPool: () => ({ query: mocks.query }) }));
vi.mock("../lib/server/env", () => ({
  getEnv: () => ({ DISHA_JWT_SECRET: "test-signing-secret-at-least-32-characters-long" }),
  isProduction: () => false,
}));
vi.mock("../lib/server/crypto", () => ({
  hmacPepper: (token: string) => crypto.createHash("sha256").update(token).digest(),
}));
vi.mock("../lib/unified/evidence-ledger", () => ({ appendEvidenceEvent: vi.fn() }));
import { rotateSession } from "../lib/server/auth";

const secret = "test-signing-secret-at-least-32-characters-long";
function refresh(exp: number) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({
    sub: "u1", email: "member@example.test", roles: ["analyst"],
    sessionId: "session-1", typ: "refresh", jti: "refresh-1", exp, persistent: true,
  })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}
beforeEach(() => {
  mocks.query.mockReset();
  mocks.query.mockResolvedValue({ rowCount: 1, rows: [{ jti: "refresh-1" }] });
});
describe("refresh token lifetime and one-use admission", () => {
  it("rejects a signed but expired refresh token before accessing the database", async () => {
    await expect(rotateSession(refresh(Math.floor(Date.now() / 1000) - 5))).rejects.toMatchObject({ status: 401 });
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("binds a single atomic consumption to the refresh digest and principal", async () => {
    await rotateSession(refresh(Math.floor(Date.now() / 1000) + 120));
    const updates = mocks.query.mock.calls.filter(([sql]: [string]) => sql.includes("update refresh_tokens"));
    expect(updates).toHaveLength(1);
    expect(updates[0][0]).toContain("expires_at > now()");
    expect(updates[0][0]).toContain("token_hash = $4");
    expect(updates[0][0]).toContain("returning jti");
    expect(updates[0][1]).toHaveLength(4);
  });
  it("does not mint a second session from the same concurrently presented token", async () => {
    let consumed = false;
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("update refresh_tokens")) {
        if (consumed) return { rowCount: 0, rows: [] };
        consumed = true;
        return { rowCount: 1, rows: [{ jti: "refresh-1" }] };
      }
      return { rowCount: 1, rows: [] };
    });
    const token = refresh(Math.floor(Date.now() / 1000) + 120);
    const outcomes = await Promise.allSettled([rotateSession(token), rotateSession(token)]);
    expect(outcomes.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((x) => x.status === "rejected")).toHaveLength(1);
  });
});
