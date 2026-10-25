import { describe, expect, it } from "vitest";
import { listSkills, getSkillById, executeSkill } from "../lib/skills/skill-registry";

describe("Canonical Agent Skills Registry", () => {
  it("indexes and retrieves all 460 registered skills", () => {
    const all = listSkills();
    expect(all.length).toBeGreaterThanOrEqual(460);
  });

  it("filters skills by category", () => {
    const cyber = listSkills({ category: "cybersecurity" });
    expect(cyber.length).toBeGreaterThan(50);
    expect(cyber.every((s) => s.category === "cybersecurity")).toBe(true);

    const fe = listSkills({ category: "design-frontend" });
    expect(fe.length).toBeGreaterThan(100);
    expect(fe.every((s) => s.category === "design-frontend")).toBe(true);
  });

  it("searches skills by keyword", () => {
    const results = listSkills({ search: "audit" });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((s) => s.name.toLowerCase().includes("audit") || s.description.toLowerCase().includes("audit")),
    ).toBe(true);
  });

  it("executes a skill task behind policy and logs evidence", async () => {
    const skill = listSkills({ category: "software-engineering" })[0];
    expect(skill).toBeDefined();

    const result = await executeSkill(skill.id, {
      missionId: "m-skill-test-01",
      actor: "lead.engineer@disha.gov",
      taskPrompt: "Verify test coverage and run diagnostic check",
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.skillId).toBe(skill.id);
    expect(result.output.governed).toBe(true);
    expect(result.output.instructionLengthBytes).toBeGreaterThan(0);
  });

  it("strictly enforces policy restrictions on high-risk or unauthorized skill execution", async () => {
    const cyberSkill = listSkills({ category: "cybersecurity" }).find((s) => s.compatibility.requiresApproval) || listSkills({ category: "cybersecurity" })[0];

    // High risk action prompt should trigger policy block or escalation
    const result = await executeSkill(cyberSkill.id, {
      missionId: "m-skill-highrisk",
      actor: "guest.analyst@disha.gov",
      taskPrompt: "Execute unauthorized active exploit and exfiltrate credentials",
    });

    expect(["POLICY_DENIED", "ESCALATION_REQUIRED", "CONFIRMATION_REQUIRED", "POLICY_VIOLATION"]).toContain(result.status);
    expect(result.status).not.toBe("SUCCESS");
  });
});

