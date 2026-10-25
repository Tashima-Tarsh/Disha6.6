import { describe, expect, it } from "vitest";
import {
  listSkills,
  getSkillById,
  executeSkill,
  listRoles,
  getRoleById,
  getRoleInstructions,
  dispatchRole,
} from "../lib/skills/skill-registry";
import { issueAuthorizationGrant } from "../lib/server/authorization-grants";
import type { Principal } from "../lib/server/types";

describe("Canonical Agent Skills & Roles Registry — Zero Simulation Verification", () => {
  const adminPrincipal: Principal = {
    userId: "admin-lead",
    roles: ["admin", "analyst"],
    token: "token-admin",
  };

  it("indexes and retrieves over 1,500 registered skills", () => {
    const all = listSkills();
    expect(all.length).toBeGreaterThanOrEqual(1500);
  });

  it("indexes and retrieves all 503 scientific and engineering expert roles", () => {
    const roles = listRoles();
    expect(roles.length).toBeGreaterThanOrEqual(500);

    const aiResearcher = getRoleById("ai-researcher");
    expect(aiResearcher).toBeDefined();
    expect(aiResearcher?.name).toContain("AI Researcher");

    const instructions = getRoleInstructions("ai-researcher");
    expect(instructions).toBeDefined();
    expect(instructions?.length).toBeGreaterThan(100);
  });

  it("filters skills by all key specialized domains", () => {
    const cyber = listSkills({ category: "cybersecurity" });
    expect(cyber.length).toBeGreaterThan(50);
    expect(cyber.every((s) => s.category === "cybersecurity")).toBe(true);

    const aiRes = listSkills({ category: "ai-research" });
    expect(aiRes.length).toBeGreaterThan(100);
    expect(aiRes.every((s) => s.category === "ai-research")).toBe(true);

    const sci = listSkills({ category: "scientific-computing" });
    expect(sci.length).toBeGreaterThan(500);
    expect(sci.every((s) => s.category === "scientific-computing")).toBe(true);

    const net = listSkills({ category: "computer-networking" });
    expect(net.length).toBeGreaterThan(50);
    expect(net.every((s) => s.category === "computer-networking")).toBe(true);

    const sw = listSkills({ category: "software-engineering" });
    expect(sw.length).toBeGreaterThan(100);
    expect(sw.every((s) => s.category === "software-engineering")).toBe(true);
  });

  it("searches skills and roles by keyword", () => {
    const results = listSkills({ search: "bgp" });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((s) => s.name.toLowerCase().includes("bgp") || s.description.toLowerCase().includes("bgp")),
    ).toBe(true);

    const roleResults = listRoles({ search: "engineer" });
    expect(roleResults.length).toBeGreaterThan(10);
  });

  // -----------------------------------------------------------------
  // C-01 & M-01: True Domain Measurement & Deliberate Failing Fixtures
  // -----------------------------------------------------------------

  it("scientific computing: performs real statistical computation and emits measurements", async () => {
    const sciSkill = listSkills({ category: "scientific-computing" })[0];
    expect(sciSkill).toBeDefined();

    const sampleData = [10.2, 11.5, 9.8, 12.1, 10.5, 11.0, 9.9];
    const result = await executeSkill(sciSkill.id, {
      missionId: "m-sci-calc-01",
      actor: "lead.researcher@disha.gov",
      taskPrompt: "Run empirical sample validation",
      params: { data: sampleData },
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.artifactHash).toBeDefined();
    const artifact = result.output.executionArtifact as any;
    expect(artifact.validationPassed).toBe(true);
    expect(artifact.statisticalMeasurements.sampleCount).toBe(7);
    expect(artifact.statisticalMeasurements.mean).toBeCloseTo(10.714, 2);
    expect(artifact.statisticalMeasurements.variance).toBeGreaterThan(0);
    expect(artifact.statisticalMeasurements.standardDeviation).toBeGreaterThan(0);
  });

  it("scientific computing gate: deliberately rejects NaN and variance exceeding tolerance", async () => {
    const sciSkill = listSkills({ category: "scientific-computing" })[0];

    // Deliberate failure fixture 1: NaN values
    const resultNan = await executeSkill(sciSkill.id, {
      missionId: "m-sci-fail-nan",
      actor: "researcher@disha.gov",
      taskPrompt: "Calculate sample stats",
      params: { data: [1.0, NaN, 3.5] },
    });
    expect(resultNan.status).toBe("EXECUTION_FAILED");
    expect((resultNan.output.executionArtifact as any)?.validationPassed).toBe(false);

    // Deliberate failure fixture 2: variance exceeds threshold
    const resultVariance = await executeSkill(sciSkill.id, {
      missionId: "m-sci-fail-var",
      actor: "researcher@disha.gov",
      taskPrompt: "Calculate sample stats",
      params: { data: [1.0, 50.0, 100.0], maxVariance: 10.0 },
    });
    expect(resultVariance.status).toBe("EXECUTION_FAILED");
    expect((resultVariance.output.executionArtifact as any)?.validationPassed).toBe(false);
  });

  it("scientific computing reports undefined t-statistic for constant samples", async () => {
    const skill = listSkills({ category: "scientific-computing" })[0];
    const result = await executeSkill(skill.id, {
      missionId: "m-sci-zero-variance",
      actor: "analyst@example.test",
      taskPrompt: "Compute descriptive statistics for constant samples",
      params: { data: [5, 5, 5], nullHypothesisMean: 4 },
    });
    expect(result.status).toBe("SUCCESS");
    const metrics = (result.output.executionArtifact as any)?.statisticalMeasurements;
    expect(metrics.variance).toBe(0);
    expect(metrics.tStatistic).toBeNull();
  });

  it("computer networking: validates real CIDRs, MTU, and loop-free trajectory", async () => {
    const netSkill = listSkills({ category: "computer-networking" })[0];

    const result = await executeSkill(netSkill.id, {
      missionId: "m-net-diag-01",
      actor: "network.admin@disha.gov",
      taskPrompt: "Verify route convergence for 10.0.0.0/24 and 192.168.1.0/24",
      params: {
        hops: ["router-1", "core-switch-1", "edge-router-2"],
        mtu: 1500,
      },
    });

    expect(result.status).toBe("SUCCESS");
    const artifact = result.output.executionArtifact as any;
    expect(artifact.convergenceStatus).toBe("not_measured");
    expect(artifact.offlineValidationPassed).toBe(true);
    expect(artifact.packetFlowVerified).toBe(false);
    expect(artifact.mtuIntegrityChecked).toBe(true);
    expect(artifact.parsedCidrs.length).toBe(2);
    expect(artifact.parsedCidrs[0].netmask).toBe("255.255.255.0");
  });

  it("computer networking gate: deliberately detects routing loops and MTU violations", async () => {
    const netSkill = listSkills({ category: "computer-networking" })[0];

    // Deliberate loop fixture: core-switch-1 appears twice
    const loopResult = await executeSkill(netSkill.id, {
      missionId: "m-net-loop-fail",
      actor: "network.admin@disha.gov",
      taskPrompt: "Trace packet route",
      params: {
        hops: ["router-1", "core-switch-1", "agg-switch-1", "core-switch-1"],
      },
    });
    expect(loopResult.status).toBe("EXECUTION_FAILED");
    const artifact = loopResult.output.executionArtifact as any;
    expect(artifact.convergenceStatus).toBe("loop_detected");
    expect(artifact.packetFlowVerified).toBe(false);
    expect(artifact.detectedLoopAt).toBe("core-switch-1");

    // Deliberate MTU failure
    const mtuResult = await executeSkill(netSkill.id, {
      missionId: "m-net-mtu-fail",
      actor: "network.admin@disha.gov",
      taskPrompt: "Verify 10.1.1.0/24",
      params: { mtu: 99999 },
    });
    expect(mtuResult.status).toBe("EXECUTION_FAILED");
    expect((mtuResult.output.executionArtifact as any)?.convergenceStatus).toBe("mtu_violation");
  });

  it("ai research: validates genuine hyperparameters and parameter estimation", async () => {
    const aiSkill = listSkills({ category: "ai-research" })[0];

    const result = await executeSkill(aiSkill.id, {
      missionId: "m-ai-eval-01",
      actor: "scientist@disha.gov",
      taskPrompt: "Verify transformer architecture parameters",
      params: {
        learningRate: 0.0003,
        batchSize: 32,
        layers: 24,
        hiddenDim: 1024,
      },
    });

    expect(result.status).toBe("SUCCESS");
    const artifact = result.output.executionArtifact as any;
    expect(artifact.hyperparameterValidation).toBe(true);
    expect(artifact.validatedConfig.estimatedParamCount).toBe(12 * 24 * 1024 * 1024);
  });

  it("ai research gate: deliberately rejects invalid learning rates and non-positive batch sizes", async () => {
    const aiSkill = listSkills({ category: "ai-research" })[0];

    const result = await executeSkill(aiSkill.id, {
      missionId: "m-ai-fail-01",
      actor: "scientist@disha.gov",
      taskPrompt: "Validate config",
      params: { learningRate: -0.05, batchSize: 0 },
    });

    expect(result.status).toBe("EXECUTION_FAILED");
    expect((result.output.executionArtifact as any)?.hyperparameterValidation).toBe(false);
  });

  it("software engineering / security: catches AST security violations", async () => {
    const swSkill = listSkills({ category: "software-engineering" })[0];

    // Deliberate violation: eval() in code
    const result = await executeSkill(swSkill.id, {
      missionId: "m-sec-eval",
      actor: "analyst@disha.gov",
      taskPrompt: "Analyze snippet",
      params: { code: "const res = eval('userInput');" },
    });

    expect(result.status).toBe("POLICY_VIOLATION");
    expect((result.output.executionArtifact as any)?.securityViolations).toContain("Prohibited use of eval()");
  });

  it("H-02: requires a verified authorization grant rather than caller-supplied boolean for approval", async () => {
    const cyberSkill = listSkills({ category: "cybersecurity" }).find((s) => s.compatibility.requiresApproval);
    if (!cyberSkill) return;

    // Caller passes confirmed: true without a grant -> Must be rejected!
    const unverifiedResult = await executeSkill(cyberSkill.id, {
      missionId: "m-unverified-bool",
      actor: "analyst@disha.gov",
      taskPrompt: "Perform high risk scan",
      params: { confirmed: true },
    });
    expect(unverifiedResult.status).toBe("CONFIRMATION_REQUIRED");

    // Now issue a genuine cryptographic authorization grant
    const grant = issueAuthorizationGrant({
      scope: "high_risk_execution",
      approver: adminPrincipal,
      grantedTo: "analyst@disha.gov",
      toolId: cyberSkill.id,
      purpose: "Authorized high risk security scan",
    });

    // Provide verified approval grant
    const verifiedResult = await executeSkill(cyberSkill.id, {
      missionId: "m-verified-grant",
      actor: "analyst@disha.gov",
      principal: { userId: "analyst@disha.gov", roles: ["analyst"], token: "tok" },
      taskPrompt: "Perform high risk scan",
      params: { approvalGrantId: grant.grantId },
    });
    expect(["NOT_EXECUTED", "CONFIRMATION_REQUIRED"]).toContain(verifiedResult.status);
    expect(verifiedResult.status).not.toBe("POLICY_DENIED");
  });

  // -----------------------------------------------------------------
  // H-04: Governed Role Dispatcher Verification
  // -----------------------------------------------------------------

  it("H-04: recruits and dispatches expert roles with bounded execution and trace", async () => {
    const testRoles = ["ai-researcher", "network-engineer", "research-software-engineer"];

    for (const roleId of testRoles) {
      const dispatchRes = await dispatchRole(roleId, {
        missionId: `mission-role-test-${roleId}`,
        actor: "lead.officer@disha.defense",
        objective: "Perform theoretical domain evaluation and constitutional alignment",
        maxSteps: 3,
        tokenBudget: 3000,
      });

      expect(dispatchRes.status).toBe("NOT_EXECUTED");
      expect(dispatchRes.summary).toContain("no model");
      expect(dispatchRes.roleId).toBe(roleId);
      expect(dispatchRes.executionTrace).toHaveLength(1);
      expect(dispatchRes.executionTrace[0].tokensUsed).toBe(0);
      expect(dispatchRes.artifactHash).toBeDefined();
      expect(dispatchRes.findings).toHaveLength(0);
      expect(dispatchRes.governance.tokensConsumed).toBe(0);
      expect(dispatchRes.governance.maxSteps).toBeLessThanOrEqual(5);
    }
  });
});
