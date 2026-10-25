import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { signJson } from "../lib/server/crypto";
import { authSigningSecret } from "../lib/server/auth";
import { listSkills } from "../lib/skills/skill-registry";
import { getEvidenceEvents, verifyEvidenceChain } from "../lib/unified/evidence-ledger";
import { POST, validateWorkflowSteps } from "../app/api/v1/workflows/n8n/skills/route";

const route = "http://localhost:3000/api/v1/workflows/n8n/skills";

function authHeaders(): Record<string, string> {
  const token = signJson(
    {
      sub: "n8n-operator",
      email: "n8n@example.test",
      roles: ["analyst"],
      sessionId: "n8n-session",
      typ: "access",
      jti: "n8n-test",
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    authSigningSecret(),
  );
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function request(body: unknown, authenticated = true): NextRequest {
  return new NextRequest(route, {
    method: "POST",
    headers: authenticated ? authHeaders() : { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const aiSkill = listSkills({ category: "ai-research" }).find((skill) => !skill.compatibility.requiresApproval)!;
const scienceSkill = listSkills({ category: "scientific-computing" })[0];

describe("governed n8n skill workflows", () => {
  it("runs two real offline validators sequentially, with correlated ledger evidence", async () => {
    const response = await POST(request({
      correlationId: "n8n-job-test-1",
      steps: [
        {
          id: "model",
          skillId: aiSkill.id,
          taskPrompt: "Validate hyperparameters",
          params: { learningRate: 0.0003, batchSize: 32, layers: 4, hiddenDim: 256 },
        },
        {
          id: "statistics",
          skillId: scienceSkill.id,
          taskPrompt: "Compute sample statistics",
          params: { data: [1, 2, 3, 4] },
          dependsOn: ["model"],
        },
      ],
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.workflowStatus).toBe("COMPLETED");
    expect(body.results.map((result: { status: string }) => result.status)).toEqual(["SUCCESS", "SUCCESS"]);
    expect(body.results.every((result: { evidenceId: string }) => !!result.evidenceId)).toBe(true);
    expect(body.workflowEvidenceId).toBeTruthy();
    expect(body.missionId).toMatch(/^n8n-skills-/);
    const events = await getEvidenceEvents(body.missionId);
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(verifyEvidenceChain(events).ok).toBe(true);
  });

  it("stops and does not execute downstream steps when a validator fails", async () => {
    const response = await POST(request({
      steps: [
        {
          id: "bad",
          skillId: scienceSkill.id,
          taskPrompt: "Validate sample variance",
          params: { data: [1, 50, 100], maxVariance: 0.1 },
        },
        {
          id: "after",
          skillId: aiSkill.id,
          taskPrompt: "Validate configuration",
          params: { batchSize: 8 },
          dependsOn: ["bad"],
        },
      ],
    }));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.workflowStatus).toBe("STOPPED");
    expect(body.results[0].status).toBe("EXECUTION_FAILED");
    expect(body.results[1].status).toBe("SKIPPED_DEPENDENCY");
    expect(body.workflowEvidenceId).toBeTruthy();
  });

  it("rejects spoofed identity parameters and unregistered skills", async () => {
    const spoofed = await POST(request({
      principal: { userId: "admin", roles: ["admin"] },
      steps: [{ id: "a", skillId: aiSkill.id, taskPrompt: "Validate config" }],
    }));
    expect(spoofed.status).toBe(400);
    const missing = await POST(request({
      steps: [{ id: "a", skillId: "definitely-unregistered", taskPrompt: "test" }],
    }));
    expect(missing.status).toBe(404);
  });

  it("requires authentication and enforces dependency ordering", async () => {
    const forbidden = await POST(request({
      steps: [{ id: "a", skillId: aiSkill.id, taskPrompt: "Validate config" }],
    }, false));
    expect(forbidden.status).toBe(401);
    expect(validateWorkflowSteps([
      { id: "second", skillId: aiSkill.id, taskPrompt: "Go", dependsOn: ["first"] },
    ])).toContain("dependency_must_precede_step");
  });

  it("enforces the maximum workflow size", async () => {
    const tooMany = await POST(request({
      steps: Array.from({ length: 9 }, (_, n) => ({
        id: `step${n}`, skillId: aiSkill.id, taskPrompt: "Validate config",
      })),
    }));
    expect(tooMany.status).toBe(400);
  });
});
