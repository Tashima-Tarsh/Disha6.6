import { describe, expect, it } from "vitest";

import {
  buildEvidenceChain,
  evaluatePolicy,
  executeLens,
  fuseLensResults,
  normalizeMission,
  recommendLenses,
} from "./fixtures/agentic-workbench-engine";

describe("agentic workbench demo engine", () => {
  it("normalizes a mission into a source-aware DISHA signal", () => {
    const signal = normalizeMission(
      "Review Article 12 accountability, CAG audit observations, district procurement, and citizen complaints.",
      "Public finance",
      ["Article 12", "CAG", "District"],
      new Date("2026-07-10T00:00:00.000Z"),
    );

    expect(signal.intent).toBe("public-finance evidence review");
    expect(signal.entities).toEqual(expect.arrayContaining(["Article 12", "CAG audit", "Administrative geography"]));
    expect(signal.missionId).toMatch(/^mission-/);
  });

  it("routes cyber and geospatial lenses when mission language requires them", () => {
    const signal = normalizeMission(
      "Assess digital arrest harm across districts with flood preparedness and infrastructure context.",
      "Cyber harm",
      ["Cyber", "District"],
    );

    const lenses = recommendLenses(signal).map((lens) => lens.id);

    expect(lenses).toEqual(expect.arrayContaining(["governance", "strategy", "cyber", "geospatial"]));
  });

  it("builds an ordered demo evidence chain with linked previous hashes", () => {
    const signal = normalizeMission("Assess CAG audit and district infrastructure claims.", "Public finance", ["CAG"]);
    const routed = recommendLenses(signal);
    const executed = routed.slice(0, 2).map((lens) => executeLens(signal, lens));
    const fusion = fuseLensResults(executed);
    const policy = evaluatePolicy(signal, executed);
    const chain = buildEvidenceChain(signal, executed, policy);

    expect(fusion.synthesis.length).toBeGreaterThan(0);
    expect(chain).toHaveLength(6);
    expect(chain[0]?.previousHash).toBe("GENESIS");
    expect(chain[1]?.previousHash).toBe(chain[0]?.hash);
    expect(chain.at(-1)?.action).toBe("Report prepared");
  });
});
