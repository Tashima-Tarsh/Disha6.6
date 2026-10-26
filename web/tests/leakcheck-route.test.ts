import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "../app/api/osint/leakcheck/route";

vi.mock("@/lib/server/osint-backend-client", () => ({
  callOsintBackend: vi.fn(async (_endpoint: string, opts: any) => {
    return {
      success: true,
      tier: "public",
      target: opts?.body?.query || "test@example.com",
      found: 10,
      fields: ["email", "username", "password"],
      sources: [{ name: "Collection 1", date: "2019-01" }],
    };
  }),
  OsintBackendError: class extends Error {
    statusCode = 502;
    code = "BACKEND_ERROR";
    detail = "";
  },
}));

describe("/api/osint/leakcheck route handler", () => {
  it("processes POST query and forwards to OSINT backend", async () => {
    const req = new NextRequest("http://localhost:3000/api/osint/leakcheck", {
      method: "POST",
      body: JSON.stringify({ query: "test@example.com" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.found).toBe(10);
    expect(data.fields).toContain("password");
  });

  it("processes GET query parameters", async () => {
    const req = new NextRequest("http://localhost:3000/api/osint/leakcheck?check=admin@example.com", {
      method: "GET",
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.target).toBe("admin@example.com");
  });
});
