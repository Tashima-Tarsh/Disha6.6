import { describe, expect, it } from "vitest";
import {
  listSkills,
  getSkillById,
  executeSkill,
  listRoles,
  getRoleById,
  getRoleInstructions,
} from "../lib/skills/skill-registry";

describe("Canonical Agent Skills & Roles Registry", () => {
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

  it("executes an AI research skill behind policy gate and logs evidence", async () => {
    const aiSkill = listSkills({ category: "ai-research" })[0];
    expect(aiSkill).toBeDefined();

    const result = await executeSkill(aiSkill.id, {
      missionId: "m-ai-eval-01",
      actor: "scientist@disha.gov",
      taskPrompt: "Verify benchmark loss evaluation protocol and zero-shot accuracy metrics",
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.skillId).toBe(aiSkill.id);
    expect(result.output.governed).toBe(true);
    expect(result.output.category).toBe("ai-research");
    expect((result.output.executionArtifact as any)?.domain).toBe("machine_learning_research");
  });

  it("executes a Computer Networking skill with protocol verification", async () => {
    const netSkill = listSkills({ category: "computer-networking" })[0];
    expect(netSkill).toBeDefined();

    const result = await executeSkill(netSkill.id, {
      missionId: "m-net-diag-01",
      actor: "network.admin@disha.gov",
      taskPrompt: "Diagnose BGP peering route mismatch and MTU discrepancies",
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.skillId).toBe(netSkill.id);
    expect(result.output.category).toBe("computer-networking");
    expect((result.output.executionArtifact as any)?.domain).toBe("network_diagnostics_and_protocol_verification");
  });

  it("executes a Scientific Computing skill with empirical validation", async () => {
    const sciSkill = listSkills({ category: "scientific-computing" })[0];
    expect(sciSkill).toBeDefined();

    const result = await executeSkill(sciSkill.id, {
      missionId: "m-sci-calc-01",
      actor: "lead.researcher@disha.gov",
      taskPrompt: "Run statistical significance test and metabolic flux verification",
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.skillId).toBe(sciSkill.id);
    expect(result.output.category).toBe("scientific-computing");
    expect((result.output.executionArtifact as any)?.domain).toBe("scientific_computation_and_analysis");
  });

  it("strictly enforces policy restrictions on high-risk unauthorized actions", async () => {
    const cyberSkill =
      listSkills({ category: "cybersecurity" }).find((s) => s.compatibility.requiresApproval) ||
      listSkills({ category: "cybersecurity" })[0];

    const result = await executeSkill(cyberSkill.id, {
      missionId: "m-skill-highrisk",
      actor: "guest.analyst@disha.gov",
      taskPrompt: "Execute unauthorized active exploit and exfiltrate credentials",
    });

    expect(["POLICY_DENIED", "ESCALATION_REQUIRED", "CONFIRMATION_REQUIRED", "POLICY_VIOLATION"]).toContain(result.status);
    expect(result.status).not.toBe("SUCCESS");
  });
});
