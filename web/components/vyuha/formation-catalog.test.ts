import { describe, expect, it } from "vitest";
import { getVyuhaFormation, VYUHA_FORMATIONS } from "./formation-catalog";

describe("VYUHA cinematic catalog contract", () => {
  it("visualizes every formation from the standalone backend catalog", () => {
    expect(VYUHA_FORMATIONS.map((item) => item.id)).toEqual([
      "chakra_vyuha",
      "padma_vyuha",
      "garuda_vyuha",
      "suryavyuha",
      "nakshatra_mandala",
      "sarvatobhadra",
      "nyaya_audit",
      "setu_varuna",
    ]);
  });

  it("provides valid display metadata for each unique formation", () => {
    expect(new Set(VYUHA_FORMATIONS.map((item) => item.id)).size).toBe(VYUHA_FORMATIONS.length);
    for (const formation of VYUHA_FORMATIONS) {
      expect(formation.name.length).toBeGreaterThan(4);
      expect(formation.purpose.length).toBeGreaterThan(15);
      expect(formation.narration.length).toBeGreaterThan(20);
      expect(formation.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(getVyuhaFormation(formation.id)).toBe(formation);
    }
  });

  it("resolves untrusted or missing identifiers to an inert visual fallback", () => {
    expect(getVyuhaFormation("unknown")).toBe(VYUHA_FORMATIONS[0]);
    expect(getVyuhaFormation("__proto__")).toBe(VYUHA_FORMATIONS[0]);
    expect(getVyuhaFormation("")).toBe(VYUHA_FORMATIONS[0]);
  });
});
