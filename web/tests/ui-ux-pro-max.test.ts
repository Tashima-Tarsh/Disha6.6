import { describe, expect, it } from "vitest";
import { DESIGN_TOKENS, auditColorAccessibility, getContrastRatio } from "../lib/ui/design-tokens";

describe("UI UX Pro Max & Design System Verification", () => {
  it("declares structured cyber workstation design tokens", () => {
    expect(DESIGN_TOKENS.colors.background.primary).toBe("#060911");
    expect(DESIGN_TOKENS.colors.text.primary).toBe("#f8fafc");
    expect(DESIGN_TOKENS.colors.brand.cyan).toBe("#00f0ff");
  });

  it("verifies primary text against primary background satisfies WCAG AAA contrast (> 7:1)", () => {
    const audit = auditColorAccessibility(
      DESIGN_TOKENS.colors.text.primary,
      DESIGN_TOKENS.colors.background.primary,
    );
    expect(audit.ratio).toBeGreaterThan(10);
    expect(audit.passesAA).toBe(true);
    expect(audit.passesAAA).toBe(true);
  });

  it("verifies cyan accent on dark background provides strong legibility", () => {
    const ratio = getContrastRatio(
      DESIGN_TOKENS.colors.brand.cyan,
      DESIGN_TOKENS.colors.background.primary,
    );
    expect(ratio).toBeGreaterThan(4.5);
  });
});

