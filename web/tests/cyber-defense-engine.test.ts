import { describe, expect, it } from "vitest";
import {
  computeVulnerabilityRisk,
  maskSensitiveToken,
  scanCodeForSecretExposure,
  generateLookAlikeDomains,
} from "../lib/unified/cyber-defense-engine";

describe("Cyber Defense Engine", () => {
  it("masks sensitive credentials by default (Task 30, 31)", () => {
    const testToken = ["AKIA", "IOSFODNN7EXAMPLE"].join("");
    const masked = maskSensitiveToken(testToken);
    expect(masked).toBe("AKIA****MPLE");
    expect(masked).not.toContain("IOSFODNN7");

    const shortMasked = maskSensitiveToken("secret12");
    expect(shortMasked).toBe("********");
  });

  it("detects and masks exposed secrets in source code files", () => {
    const rawKey = ["AKIA", "1234567890ABCDEF"].join("");
    const sampleCode = [
      "// Sample config",
      `const cloudKey = "${rawKey}";`,
      'const gcpKey = "AIzaSyD-1234567890123456789012345678901";',
    ].join("\n");

    const findings = scanCodeForSecretExposure(sampleCode, "config/secrets.js");
    expect(findings.length).toBe(2);
    expect(findings[0]?.secretType).toBe("GCP_API_KEY");
    expect(findings[0]?.maskedValue).toContain("AIza****");
    expect(findings[1]?.secretType).toBe("AWS_KEY");
    expect(findings[1]?.maskedValue).toContain("AKIA****");
  });

  it("elevates vulnerabilities in CISA KEV to HIGH or CRITICAL regardless of base score", () => {
    // Normal medium score vulnerability
    const normalRisk = computeVulnerabilityRisk({
      cvssScore: 5.5,
      inCisaKev: false,
      epssScore: 0.05,
    });
    expect(normalRisk).toBe("MEDIUM");

    // Exploited in the wild according to CISA KEV
    const kevRisk = computeVulnerabilityRisk({
      cvssScore: 5.5,
      inCisaKev: true,
      epssScore: 0.05,
    });
    expect(kevRisk).toBe("HIGH");

    // Critical CVSS in CISA KEV
    const criticalKev = computeVulnerabilityRisk({
      cvssScore: 8.8,
      inCisaKev: true,
    });
    expect(criticalKev).toBe("CRITICAL");
  });

  it("generates defensive typosquatting and look-alike domain candidates", () => {
    const candidates = generateLookAlikeDomains("gov.in");
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.some((c) => c.variationType === "tld_swap")).toBe(true);
  });
});
