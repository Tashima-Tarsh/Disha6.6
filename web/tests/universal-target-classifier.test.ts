import { describe, expect, it } from "vitest";
import { classifyUniversalTarget } from "../lib/unified/universal-target-classifier";

describe("Universal Target Classifier", () => {
  it("classifies CVE identifiers with 100% confidence", () => {
    const res = classifyUniversalTarget("CVE-2026-4412");
    expect(res.primaryType).toBe("cve");
    expect(res.confidence).toBe(1.0);
    expect(res.normalizedValue).toBe("CVE-2026-4412");
    expect(res.metadata.standard).toBe("MITRE CVE");
  });

  it("classifies Autonomous System Numbers (ASN)", () => {
    const res = classifyUniversalTarget("AS13335");
    expect(res.primaryType).toBe("asn");
    expect(res.confidence).toBe(1.0);
    expect(res.metadata.asnNumber).toBe(13335);
  });

  it("classifies IPv4 and IPv6 addresses", () => {
    const ipv4 = classifyUniversalTarget("192.168.1.1");
    expect(ipv4.primaryType).toBe("ip");
    expect(ipv4.metadata.ipVersion).toBe(4);

    const ipv6 = classifyUniversalTarget("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    expect(ipv6.primaryType).toBe("ip");
    expect(ipv6.metadata.ipVersion).toBe(6);
  });

  it("classifies cryptographic hashes by bit length", () => {
    const sha256 = classifyUniversalTarget("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256.primaryType).toBe("file_hash");
    expect(sha256.metadata.algorithm).toBe("SHA-256");

    const md5 = classifyUniversalTarget("d41d8cd98f00b204e9800998ecf8427e");
    expect(md5.primaryType).toBe("file_hash");
    expect(md5.metadata.algorithm).toBe("MD5");
  });

  it("classifies repository URLs", () => {
    const repo = classifyUniversalTarget("https://github.com/Tashima-Tarsh/Disha6.6");
    expect(repo.primaryType).toBe("repository");
    expect(repo.metadata.scmPlatform).toBe("github");
  });

  it("classifies email addresses and extracts domain", () => {
    const email = classifyUniversalTarget("officer.cag@gov.in");
    expect(email.primaryType).toBe("email");
    expect(email.metadata.emailDomain).toBe("gov.in");
  });

  it("classifies phone numbers into E.164 normalized format", () => {
    const phone = classifyUniversalTarget("+91 98765 43210");
    expect(phone.primaryType).toBe("phone");
    expect(phone.normalizedValue).toBe("+919876543210");
  });

  it("classifies vehicle registration identifiers (VAHAN format)", () => {
    const vehicle = classifyUniversalTarget("DL-01-AB-1234");
    expect(vehicle.primaryType).toBe("vehicle_identifier");
    expect(vehicle.metadata.statePrefix).toBe("DL");
  });

  it("classifies domains and handles subdomains", () => {
    const dom = classifyUniversalTarget("subdomain.cert-in.org.in");
    expect(dom.primaryType).toBe("domain");
    expect(dom.metadata.isSubdomain).toBe(true);
  });

  it("classifies username handles and warns about ambiguity", () => {
    const user = classifyUniversalTarget("@cyber_sentinel");
    expect(user.primaryType).toBe("username");
    expect(user.ambiguityWarning).toBeDefined();
  });

  describe("Bug 4 Regression: Natural-language tokens must not be classified as high-confidence usernames", () => {
    it("does not classify 'Modi' as a username", () => {
      const res = classifyUniversalTarget("Modi");
      expect(res.primaryType).not.toBe("username");
      expect(res.primaryType).toBe("topic");
      expect(res.confidence).toBeLessThan(0.7);
    });

    it("does not classify 'Delhi' as a username", () => {
      const res = classifyUniversalTarget("Delhi");
      expect(res.primaryType).not.toBe("username");
      expect(res.primaryType).toBe("location");
    });

    it("does not classify 'OpenAI' as a username", () => {
      const res = classifyUniversalTarget("OpenAI");
      expect(res.primaryType).not.toBe("username");
      expect(res.primaryType).toBe("company");
    });

    it("does not classify 'Microsoft' as a username", () => {
      const res = classifyUniversalTarget("Microsoft");
      expect(res.primaryType).not.toBe("username");
      expect(res.primaryType).toBe("company");
    });

    it("classifies 'Nitish Kumar' as person_name rather than username", () => {
      const res = classifyUniversalTarget("Nitish Kumar");
      expect(res.primaryType).toBe("person_name");
      expect(res.primaryType).not.toBe("username");
    });

    it("classifies '@example_user' as username with high confidence", () => {
      const res = classifyUniversalTarget("@example_user");
      expect(res.primaryType).toBe("username");
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.normalizedValue).toBe("example_user");
    });

    it("classifies 'example_user' without '@' as ambiguous topic rather than high-confidence username", () => {
      const res = classifyUniversalTarget("example_user");
      expect(res.primaryType).toBe("topic");
      expect(res.confidence).toBeLessThan(0.7);
      expect(res.ambiguityWarning).toBeDefined();
    });

    it("classifies 'example.com' as domain", () => {
      const res = classifyUniversalTarget("example.com");
      expect(res.primaryType).toBe("domain");
      expect(res.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it("classifies 'DL01AB1234' as vehicle_identifier", () => {
      const res = classifyUniversalTarget("DL01AB1234");
      expect(res.primaryType).toBe("vehicle_identifier");
    });

    it("classifies an email address", () => {
      const res = classifyUniversalTarget("investigator@agency.gov.in");
      expect(res.primaryType).toBe("email");
    });

    it("classifies an international phone number", () => {
      const res = classifyUniversalTarget("+919876543210");
      expect(res.primaryType).toBe("phone");
    });
  });
});
