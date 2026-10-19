import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST as toggleMode } from "../app/api/v1/runtime/models/catalog/route";
import { POST as runTest } from "../app/api/v1/runtime/models/test/route";
import { signJson } from "../lib/server/crypto";
import { authSigningSecret } from "../lib/server/auth";

function createTestAuthHeaders() {
  const token = signJson(
    {
      sub: "analyst-1",
      email: "operator@disha.defense",
      roles: ["admin", "analyst"],
      sessionId: "s-1",
      typ: "access",
      jti: "jti-1",
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    authSigningSecret()
  );

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

describe("Model Catalog & Benchmark API", () => {
  it("returns discovered model catalog with capabilities and privacy mode", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/runtime/models/catalog", {
      headers: createTestAuthHeaders(),
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as { catalog: Array<{ id: string; name: string }>; total: number; localOnlyMode: boolean };
    expect(json.total).toBeGreaterThanOrEqual(10);
    expect(Array.isArray(json.catalog)).toBe(true);

    const qwen = json.catalog.find((m) => m.id === "qwen2.5-coder-7b");
    expect(qwen).toBeDefined();
  });

  it("toggles local-only privacy mode dynamically", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/runtime/models/catalog", {
      method: "POST",
      body: JSON.stringify({ localOnlyMode: true }),
      headers: createTestAuthHeaders(),
    });

    const res = await toggleMode(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as { success: boolean; localOnlyMode: boolean };
    expect(json.success).toBe(true);
    expect(json.localOnlyMode).toBe(true);
  });

  it("runs capability benchmark test against specified model", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/runtime/models/test", {
      method: "POST",
      body: JSON.stringify({ modelTag: "qwen2.5-coder:7b" }),
      headers: createTestAuthHeaders(),
    });

    const res = await runTest(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as { modelTag: string; capabilities: Record<string, boolean> };
    expect(json.modelTag).toBe("qwen2.5-coder:7b");
    expect(json.capabilities).toHaveProperty("chat");
    expect(json.capabilities).toHaveProperty("reasoning");
    expect(json.capabilities).toHaveProperty("tool_calling");
  });
});
