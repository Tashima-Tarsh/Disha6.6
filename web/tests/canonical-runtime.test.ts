import { describe, expect, it } from "vitest";
import { CANONICAL_SPECIALISTS, planMission } from "../lib/agents/canonical-runtime";
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
      missionId: "m-multiagent-01",
      intent: "investigation",
      confidence: 1.0,
      context: { sensitivity: "unclassified", role: "lead", purpose: "audit" },
      input: { rawText: "Investigate critical domain cyber vulnerability and breach indicators" },
      riskContext: { userRole: "analyst", actionRisk: 0.1, dataSensitivityRisk: 0.1, deviceTrust: 1.0 },
    };

    const plan = await planMission(signal);
    expect(plan.missionId).toBe("m-multiagent-01");
    expect(plan.selectedAgents).toContain("mission-commander");
    expect(plan.selectedAgents).toContain("research-osint");
    expect(plan.selectedAgents).toContain("cyber-analyst");
    expect(plan.selectedAgents).toContain("evidence-verification");
    expect(plan.policyDecision.decision).toBe("ALLOW");
    expect(plan.state).toBe("PLANNED");
  });

  it("escalates high-risk or offensive actions through human-review-coordinator", async () => {
    const offensiveSignal: DishaSignal = {
      missionId: "m-offensive-01",
      intent: "retaliation",
      confidence: 1.0,
      context: { sensitivity: "unclassified", role: "lead", purpose: "attack" },
      input: { rawText: "Launch ddos attack against competitor server" },
      riskContext: { userRole: "analyst", actionRisk: 0.9, dataSensitivityRisk: 0.5, deviceTrust: 1.0 },
    };

    const plan = await planMission(offensiveSignal);
    expect(plan.policyDecision.decision).toBe("DENY");
    expect(plan.state).toBe("BLOCKED");
    expect(plan.selectedAgents).toContain("human-review-coordinator");
  });
});

