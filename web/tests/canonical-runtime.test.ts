import { describe, expect, it } from "vitest";
import { CANONICAL_SPECIALISTS, planMission, executeMission } from "../lib/agents/canonical-runtime";
import type { DishaSignal } from "../lib/unified/contracts";

describe("Canonical Multi-Agent Runtime (Deep Agents & LangGraph)", () => {
  it("defines the complete set of 12 canonical specialists", () => {
    const roles = Object.keys(CANONICAL_SPECIALISTS);
    expect(roles).toHaveLength(12);
    expect(roles).toEqual(
      expect.arrayContaining([
        "mission-commander",
        "research-osint",
        "cognitive-analyst",
        "cyber-analyst",
        "security-testing",
        "adversarial-reviewer",
        "memory-curator",
        "code-repair",
        "evidence-verification",
        "frontend-uiux",
        "runtime-supervisor",
        "human-review-coordinator",
      ]),
    );
  });

  it("plans a mission and delegates to appropriate specialists based on signal", async () => {
    const signal: DishaSignal = {
      id: "sig-test-01",
      timestamp: new Date().toISOString(),
      userId: "analyst-01",
      missionId: "m-multiagent-01",
      input: {
        rawText: "Investigate critical domain cyber vulnerability and breach indicators",
        files: [],
        locations: [],
        indicators: [{ type: "domain", value: "example.gov.in" }],
      },
      context: {
        intent: "investigation",
        entities: [],
        memoryRefs: [],
        dataSources: [],
        sensitivity: "public",
      },
      riskContext: {
        userRole: "analyst",
        actionRisk: 0.1,
        dataSensitivityRisk: 0.1,
        deviceTrust: 1.0,
      },
    };

    const plan = await planMission(signal);
    expect(plan.missionId).toBe("m-multiagent-01");
    expect(plan.intent).toBe("investigation");
    expect(plan.selectedAgents).toContain("mission-commander");
    expect(plan.selectedAgents).toContain("research-osint");
    expect(plan.selectedAgents).toContain("cyber-analyst");
    expect(plan.selectedAgents).toContain("evidence-verification");
    expect(plan.policyDecision.decision).toBe("ALLOW");
    expect(plan.state).toBe("PLANNED");

    // Test executeMission genuinely runs the selected specialist agents
    const executedPlan = await executeMission(plan, signal);
    expect(executedPlan.state).toBe("COMPLETED");
    expect(executedPlan.steps.length).toBeGreaterThan(0);
    for (const step of executedPlan.steps) {
      expect(["COMPLETED", "POLICY_BLOCKED", "ESCALATED"]).toContain(step.status);
      expect(step.output).toBeDefined();
    }
  });

  it("escalates high-risk or offensive actions through human-review-coordinator", async () => {
    const offensiveSignal: DishaSignal = {
      id: "sig-test-02",
      timestamp: new Date().toISOString(),
      userId: "analyst-01",
      missionId: "m-offensive-01",
      input: {
        rawText: "Launch ddos attack against competitor server",
        files: [],
        locations: [],
        indicators: [],
      },
      context: {
        intent: "retaliation",
        entities: [],
        memoryRefs: [],
        dataSources: [],
        sensitivity: "controlled",
      },
      riskContext: {
        userRole: "analyst",
        actionRisk: 0.9,
        dataSensitivityRisk: 0.5,
        deviceTrust: 1.0,
      },
    };

    const plan = await planMission(offensiveSignal);
    expect(plan.policyDecision.decision).toBe("DENY");
    expect(plan.state).toBe("BLOCKED");
    expect(plan.selectedAgents).toContain("human-review-coordinator");

    const executed = await executeMission(plan, offensiveSignal);
    expect(executed.state).toBe("BLOCKED");
    expect(executed.executionSummary).toContain("blocked");
  });
});

