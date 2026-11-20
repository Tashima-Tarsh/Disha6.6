import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  all: vi.fn(),
  account: vi.fn(),
  login: vi.fn(),
  cookies: vi.fn(),
}));
vi.mock("../lib/server/auth-rate-limit", () => ({
  checkAllAuthRateLimits: mocks.all,
  checkAuthRateLimit: mocks.account,
}));
vi.mock("../lib/server/auth", () => ({
  passwordLogin: mocks.login,
  setSessionCookies: mocks.cookies,
}));
vi.mock("../lib/server/http", () => ({
  errorResponse: (error: Error & { status?: number }) =>
    Response.json({ error: error.message }, { status: error.status ?? 500 }),
}));
vi.mock("../lib/server/security", () => ({ requestId: () => "test-request" }));

import { POST } from "../app/api/auth/login/route";

function request() {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "User@Example.com", password: "correct-length-password" }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.all.mockResolvedValue({ allowed: true, delayMs: 0 });
  mocks.account.mockResolvedValue({ allowed: true, delayMs: 0 });
  mocks.login.mockResolvedValue({
    principal: { userId: "u", email: "user@example.com", roles: ["analyst"] },
    accessToken: "at",
    refreshToken: "rt",
    sessionId: "sid",
    persistent: true,
  });
});
describe("login admission controls", () => {
  it("never verifies credentials when the IP/device limiter denies access", async () => {
    mocks.all.mockResolvedValueOnce({ allowed: false, delayMs: 0, reason: "locked_out_ip" });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(mocks.account).not.toHaveBeenCalled();
    expect(mocks.login).not.toHaveBeenCalled();
  });
  it("never verifies credentials when the account limiter denies access", async () => {
    mocks.account.mockResolvedValueOnce({ allowed: false, delayMs: 0, reason: "locked_out_account" });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(mocks.account).toHaveBeenCalledWith(expect.anything(), "account", "acct:user@example.com");
    expect(mocks.login).not.toHaveBeenCalled();
  });
  it("authenticates only after both admission checks succeed", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(mocks.cookies).toHaveBeenCalledTimes(1);
  });
});
