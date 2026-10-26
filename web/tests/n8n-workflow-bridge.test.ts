import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../app/api/v1/workflows/n8n/webhook/route";
import { GET } from "../app/api/v1/workflows/n8n/schemas/route";
import { signJson } from "../lib/server/crypto";
import { authSigningSecret } from "../lib/server/auth";
import { UniversalModelGateway } from "../lib/unified/model-gateway";

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

describe("n8n Workflow Bridge API", () => {
  beforeEach(() => {
    vi.spyOn(UniversalModelGateway, "execute").mockResolvedValue({
      message: "Perceived target entities",
      model: "qwen2.5:7b",
      provider: "ollama.local",
      isLocal: true,
      confidence: 0.9,
      durationMs: 50,
      capabilitiesUsed: ["reasoning"],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports valid n8n workflow template JSON", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/workflows/n8n/schemas", {
      headers: createTestAuthHeaders(),
    });
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as { format: string; workflow: { nodes: unknown[] }; governedSkillWorkflow: { nodes: unknown[] }; governedSkillEndpoint: string };
    expect(json.format).toBe("n8n-workflow-v1");
    expect(json.workflow.nodes.length).toBeGreaterThanOrEqual(2);
    expect(json.governedSkillWorkflow.nodes.length).toBe(2);
    expect(json.governedSkillEndpoint).toBe("/api/v1/workflows/n8n/skills");
  });

  it("handles valid incoming n8n investigation triggers", async () => {
    const payload = {
      eventType: "TRIGGER_INVESTIGATION",
      target: "203.0.113.1",
      targetType: "ip",
      source: "n8n-network-monitor",
    };

    const req = new NextRequest("http://localhost:3000/api/v1/workflows/n8n/webhook", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: createTestAuthHeaders(),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as { success: boolean; result: { status: string; missionId: string } };
    expect(json.success).toBe(true);
    expect(json.result.status).toBe("investigation_started");
    expect(json.result.missionId).toContain("n8n-");
  }, 20000);

  it("rejects malformed payloads with 400 validation error", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/workflows/n8n/webhook", {
      method: "POST",
      body: JSON.stringify({ eventType: "INVALID_EVENT" }),
      headers: createTestAuthHeaders(),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
