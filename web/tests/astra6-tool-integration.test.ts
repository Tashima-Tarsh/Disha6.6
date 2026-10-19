import { describe, expect, it } from "vitest";

import {
  astra6ToolManifests,
  getAstra6ToolManifest,
  getAstra6Summary,
  listAstra6ToolManifests,
  validateCommandTarget,
  type DishaToolManifest,
} from "../lib/unified/astra6-tool-manifest";

import {
  parsePhoneInfogaOutput,
  parseSherlockOutput,
  parseTheHarvesterOutput,
  parseSpiderfootOutput,
  parseAmassOutput,
  parseSubfinderOutput,
  parseReconNgOutput,
  parsePhotonOutput,
} from "../lib/unified/astra6-output-parsers";

import {
  classifyAstra6Target,
  selectAstra6Tools,
} from "../lib/unified/astra6-tool-selector";

describe("ASTRA 6 tool manifest", () => {
  it("declares the governed production tool set", () => {
    expect(astra6ToolManifests).toHaveLength(17);
    const ids = astra6ToolManifests.map((m) => m.toolId).sort();
    expect(ids).toEqual([
      "holehe",
      "instaloader",
      "maigret",
      "mrholmes",
      "onionsearch",
      "owasp-amass",
      "phoneinfoga",
      "photon",
      "recon-ng",
      "sherlock",
      "spiderfoot",
      "subfinder",
      "telegram-public",
      "theharvester",
      "toutatis",
      "user-scanner",
      "xurlfind3r",
    ]);
  });

  it("every manifest has a valid hash and timestamp", () => {
    for (const manifest of astra6ToolManifests) {
      expect(manifest.manifestHash).toMatch(/^[a-f0-9]{64}$/);
      expect(manifest.registeredAt).toBeTruthy();
      expect(new Date(manifest.registeredAt).getTime()).toBeGreaterThan(0);
    }
  });

  it("enforces command injection guard on all manifests", () => {
    for (const manifest of astra6ToolManifests) {
      for (const dangerous of ["; rm -rf /", "| cat /etc/passwd", "$(whoami)", "`id`", "&& echo pwned"]) {
        expect(() => validateCommandTarget(dangerous, manifest.commandInjectionGuard)).toThrow("target_command_injection_blocked");
      }
    }
  });

  it("validates safe targets pass the guard", () => {
    for (const manifest of astra6ToolManifests) {
      expect(validateCommandTarget("example.com", manifest.commandInjectionGuard)).toBe("example.com");
      expect(validateCommandTarget("testuser123", manifest.commandInjectionGuard)).toBe("testuser123");
    }
  });

  it("rejects empty and overlength targets", () => {
    const guard = astra6ToolManifests[0].commandInjectionGuard;
    expect(() => validateCommandTarget("", guard)).toThrow("target_invalid_length");
    expect(() => validateCommandTarget("a".repeat(513), guard)).toThrow("target_invalid_length");
  });

  it("retrieves individual manifests by toolId", () => {
    expect(getAstra6ToolManifest("sherlock")?.name).toBe("Sherlock");
    expect(getAstra6ToolManifest("nonexistent")).toBeUndefined();
  });

  it("returns defensive copies from listAstra6ToolManifests", () => {
    const first = listAstra6ToolManifests();
    const second = listAstra6ToolManifests();
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
  });

  it("produces a correct summary", () => {
    const summary = getAstra6Summary();
    expect(summary.total).toBe(17);
    expect(summary.byRuntime.python).toBeGreaterThan(0);
    expect(summary.byRuntime.go).toBeGreaterThan(0);
    expect(summary.targetTypes).toContain("domain");
    expect(summary.targetTypes).toContain("username");
  });

  it("assigns correct worker runtimes", () => {
    expect(getAstra6ToolManifest("phoneinfoga")?.workerRuntime).toBe("go");
    expect(getAstra6ToolManifest("sherlock")?.workerRuntime).toBe("python");
    expect(getAstra6ToolManifest("maigret")?.workerRuntime).toBe("python");
    expect(getAstra6ToolManifest("holehe")?.workerRuntime).toBe("python");
    expect(getAstra6ToolManifest("instaloader")?.workerRuntime).toBe("python");
    expect(getAstra6ToolManifest("telegram-public")?.workerRuntime).toBe("python");
    expect(getAstra6ToolManifest("theharvester")?.workerRuntime).toBe("python");
    expect(getAstra6ToolManifest("spiderfoot")?.workerRuntime).toBe("python");
    expect(getAstra6ToolManifest("owasp-amass")?.workerRuntime).toBe("go");
    expect(getAstra6ToolManifest("subfinder")?.workerRuntime).toBe("go");
    expect(getAstra6ToolManifest("recon-ng")?.workerRuntime).toBe("python");
    expect(getAstra6ToolManifest("photon")?.workerRuntime).toBe("python");
  });

  it("declares theHarvester passive module allowlist", () => {
    const manifest = getAstra6ToolManifest("theharvester");
    expect(manifest?.passiveModuleAllowlist).toContain("crtsh");
    expect(manifest?.passiveModuleAllowlist).toContain("dnsdumpster");
    expect(manifest?.blockedModules).toContain("shodan");
  });

  it("declares SpiderFoot passive module allowlist", () => {
    const manifest = getAstra6ToolManifest("spiderfoot");
    expect(manifest?.passiveModuleAllowlist).toContain("sfp_crt");
    expect(manifest?.blockedModules).toContain("sfp_portscan_tcp");
  });
});

describe("ASTRA 6 output parsers", () => {
  it("parses PhoneInfoga JSON output", () => {
    const raw = `{"number":"+1234567890","valid":true,"carrier":"T-Mobile","lineType":"mobile","country":"US","countryCode":"1"}
{"source":"numverify","score":0.8,"details":"Valid mobile number"}`;
    const { data, evidence } = parsePhoneInfogaOutput(raw, "+1234567890");
    expect(data.valid).toBe(true);
    expect(data.carrier).toBe("T-Mobile");
    expect(data.country).toBe("US");
    expect(data.reputation).toHaveLength(1);
    expect(data.reputation?.[0]?.source).toBe("numverify");
    expect(evidence).toHaveLength(1);
    expect(evidence[0].provenanceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("parses Sherlock JSON output", () => {
    const raw = `{"site":"GitHub","status":"Claimed","url_user":"https://github.com/testuser","http_status":200}
{"site":"Twitter","status":"Available"}
{"site":"Instagram","status":"Error"}`;
    const { data, evidence } = parseSherlockOutput(raw, "testuser");
    expect(data.username).toBe("testuser");
    expect(data.found).toHaveLength(1);
    expect(data.found[0].site).toBe("GitHub");
    expect(data.found[0].url).toBe("https://github.com/testuser");
    expect(data.notFound).toHaveLength(1);
    expect(data.errors).toHaveLength(1);
    expect(evidence).toHaveLength(1);
  });

  it("parses theHarvester JSON output", () => {
    const raw = JSON.stringify({
      emails: ["admin@example.com", "info@example.com"],
      hosts: ["mail.example.com:93.184.216.34"],
      ips: ["93.184.216.34"],
      subdomains: [],
      urls: [],
      sources: ["crtsh", "dnsdumpster"],
    });
    const { data, evidence } = parseTheHarvesterOutput(raw, "example.com");
    expect(data.domain).toBe("example.com");
    expect(data.emails).toHaveLength(2);
    expect(data.hosts).toHaveLength(1);
    expect(data.sources).toContain("crtsh");
    expect(evidence).toHaveLength(1);
  });

  it("parses SpiderFoot NDJSON output", () => {
    const raw = `{"module":"sfp_crt","event_type":"INTERNET_NAME","data":"sub.example.com","confidence":0.9}
{"module":"sfp_hackertarget","event_type":"IP_ADDRESS","data":"93.184.216.34"}`;
    const { data, evidence } = parseSpiderfootOutput(raw, "example.com", "domain");
    expect(data.target).toBe("example.com");
    expect(data.events).toHaveLength(2);
    expect(data.modules).toContain("sfp_crt");
    expect(data.modules).toContain("sfp_hackertarget");
    expect(evidence).toHaveLength(1);
  });

  it("parses SpiderFoot JSON-array output from upstream sf.py", () => {
    const raw = JSON.stringify([
      { module: "sfp_crt", event_type: "INTERNET_NAME", data: "api.example.com" },
      { module: "sfp_ripe", event_type: "IP_ADDRESS", data: "1.2.3.4" },
    ]);
    const { data } = parseSpiderfootOutput(raw, "example.com", "domain");
    expect(data.events).toHaveLength(2);
    expect(data.modules).toContain("sfp_crt");
  });

  it("parses Recon-ng worker output", () => {
    const { data } = parseReconNgOutput(JSON.stringify({ hosts: [{ host: "api.example.com" }] }), "example.com");
    expect(data.hosts).toHaveLength(1);
  });

  it("normalizes Photon exported URL data without key/intel fields", () => {
    const { data } = parsePhotonOutput(JSON.stringify({
      internal: ["https://example.com/a"],
      external: ["https://cdn.example.net/x.js"],
      keys: ["SECRET"],
      intel: ["email@example.com"],
    }), "example.com");
    expect(data.records).toHaveLength(2);
    expect(JSON.stringify(data)).not.toContain("SECRET");
  });

  it("parses Amass JSON output with deduplication", () => {
    const raw = `{"name":"sub1.example.com","sources":["CertSpotter"],"addresses":[{"ip":"1.2.3.4","asn":13335}]}
{"name":"sub2.example.com","sources":["HackerTarget"]}
{"name":"sub1.example.com","sources":["ViewDNS"]}`;
    const { data, evidence } = parseAmassOutput(raw, "example.com");
    expect(data.domain).toBe("example.com");
    expect(data.subdomains).toHaveLength(2);
    expect(data.subdomains[0].name).toBe("sub1.example.com");
    expect(data.subdomains[0].addresses?.[0]?.asn).toBe(13335);
    expect(evidence).toHaveLength(1);
  });

  it("parses Subfinder JSON output with deduplication", () => {
    const raw = `{"host":"api.example.com","source":"crtsh"}
{"host":"www.example.com","source":"hackertarget"}
{"host":"api.example.com","source":"certspotter"}`;
    const { data, evidence } = parseSubfinderOutput(raw, "example.com");
    expect(data.domain).toBe("example.com");
    expect(data.subdomains).toHaveLength(2);
    expect(evidence).toHaveLength(1);
  });

  it("handles Subfinder plain text output fallback", () => {
    const raw = `api.example.com
www.example.com
mail.example.com`;
    const { data } = parseSubfinderOutput(raw, "example.com");
    expect(data.subdomains).toHaveLength(3);
  });

  it("handles empty parser outputs gracefully", () => {
    expect(parsePhoneInfogaOutput("", "+1234").data.valid).toBe(false);
    expect(parseSherlockOutput("", "user").data.found).toHaveLength(0);
    expect(parseTheHarvesterOutput("", "example.com").data.emails).toHaveLength(0);
    expect(parseSpiderfootOutput("", "target", "domain").data.events).toHaveLength(0);
    expect(parseAmassOutput("", "example.com").data.subdomains).toHaveLength(0);
    expect(parseSubfinderOutput("", "example.com").data.subdomains).toHaveLength(0);
  });
});

describe("ASTRA 6 tool selector", () => {
  it("classifies domain targets", () => {
    expect(classifyAstra6Target("example.com")).toBe("domain");
    expect(classifyAstra6Target("https://example.com/path")).toBe("domain");
    expect(classifyAstra6Target("sub.example.org")).toBe("domain");
  });

  it("classifies IP targets", () => {
    expect(classifyAstra6Target("8.8.8.8")).toBe("ip");
    expect(classifyAstra6Target("192.168.1.1")).toBe("ip");
  });

  it("classifies email targets", () => {
    expect(classifyAstra6Target("user@example.com")).toBe("email");
  });

  it("classifies phone number targets", () => {
    expect(classifyAstra6Target("+1 234 567 8901")).toBe("phone_number");
    expect(classifyAstra6Target("+91-98765-43210")).toBe("phone_number");
  });

  it("classifies username targets", () => {
    expect(classifyAstra6Target("@someuser")).toBe("username");
    expect(classifyAstra6Target("john_doe")).toBe("username");
  });

  it("selects domain tools for domain targets", () => {
    const plan = selectAstra6Tools("example.com", "domain");
    const ids = plan.selectedTools.map((t) => t.toolId).sort();
    expect(ids).toContain("theharvester");
    expect(ids).toContain("owasp-amass");
    expect(ids).toContain("subfinder");
    expect(ids).toContain("spiderfoot");
    expect(ids).toContain("recon-ng");
    expect(plan.blockedTools.some((tool) => tool.toolId === "photon")).toBe(true);
  });

  it("blocks identity tools without policy approval", () => {
    const plan = selectAstra6Tools("testuser", "username", { identityApproved: false });
    expect(plan.blockedTools.some((t) => t.toolId === "sherlock")).toBe(true);
    expect(plan.blockedTools.some((t) => t.toolId === "maigret")).toBe(true);
    expect(plan.selectedTools.every((t) => !["sherlock", "maigret"].includes(t.toolId))).toBe(true);
  });

  it("allows identity tools with policy approval", () => {
    const plan = selectAstra6Tools("testuser", "username", { identityApproved: true });
    expect(plan.selectedTools.some((t) => t.toolId === "sherlock")).toBe(true);
    expect(plan.selectedTools.some((t) => t.toolId === "maigret")).toBe(true);
    expect(plan.blockedTools.every((t) => !["sherlock", "maigret"].includes(t.toolId))).toBe(true);
  });

  it("auto-selects target type when not provided", () => {
    const plan = selectAstra6Tools("example.com");
    expect(plan.targetType).toBe("domain");
    expect(plan.autoSelected).toBe(true);
  });

  it("blocks PhoneInfoga without identity approval", () => {
    const plan = selectAstra6Tools("+1234567890", "phone_number", { identityApproved: false });
    expect(plan.blockedTools.some((t) => t.toolId === "phoneinfoga")).toBe(true);
  });
});
