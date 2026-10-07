import { describe, expect, it } from "vitest";

import { listOsintToolCatalog } from "../lib/unified/osint-tool-catalog";
import {
  buildUniversalOsintPlan,
  classifyUniversalOsintQuery,
} from "../lib/unified/universal-osint-search";

describe("universal OSINT search planner", () => {
  it("routes domains through passive infrastructure, archive, and reporting adapters", () => {
    const plan = buildUniversalOsintPlan("https://example.org/path?q=1");
    expect(plan.kind).toBe("domain");
    expect(plan.normalizedTarget).toBe("example.org");
    expect(plan.runs.map((run) => run.adapterId)).toEqual([
      "public-dns-google",
      "public-certificate-transparency",
      "public-rdap",
      "public-wayback-cdx",
      "public-common-crawl",
      "public-gdelt-news",
    ]);
  });

  it("recognizes GitHub repositories and routes to the public repository adapter", () => {
    const plan = buildUniversalOsintPlan("https://github.com/smicallef/spiderfoot");
    expect(plan.kind).toBe("github_repository");
    expect(plan.normalizedTarget).toBe("smicallef/spiderfoot");
    expect(plan.runs.some((run) => run.adapterId === "public-github-repository")).toBe(true);
  });

  it("recognizes CVEs and fans out across CISA, NVD and EPSS", () => {
    const plan = buildUniversalOsintPlan("cve-2026-12345");
    expect(plan.kind).toBe("cve");
    expect(plan.normalizedTarget).toBe("CVE-2026-12345");
    expect(plan.runs.map((run) => run.adapterId)).toEqual([
      "public-cisa-kev",
      "public-nvd-cve",
      "public-epss",
      "public-gdelt-news",
    ]);
  });

  it("routes humanitarian topics through ReliefWeb and public reporting", () => {
    const plan = buildUniversalOsintPlan("India flood response");
    expect(plan.kind).toBe("humanitarian_topic");
    expect(plan.runs.map((run) => run.adapterId)).toEqual(["public-reliefweb", "public-gdelt-news"]);
  });

  it("routes general entities through public graph and reporting sources", () => {
    const plan = buildUniversalOsintPlan("OpenAI");
    expect(plan.kind).toBe("entity");
    expect(plan.runs.map((run) => run.adapterId)).toEqual([
      "public-wikidata-search",
      "public-openalex",
      "public-gdelt-news",
    ]);
  });

  it("does not turn personal identifiers into cross-site enumeration", () => {
    for (const target of ["person@example.org", "+91 98765 43210", "@example_user"]) {
      const plan = buildUniversalOsintPlan(target);
      expect(plan.runs.map((run) => run.adapterId)).toEqual(["public-gdelt-news"]);
      expect(plan.blockedCapabilities.join(" ")).toContain("identity enumeration");
    }
  });

  it("classifies valid IPv4 input without accepting impossible octets", () => {
    expect(classifyUniversalOsintQuery("8.8.8.8").kind).toBe("ip");
    expect(buildUniversalOsintPlan("8.8.8.8").runs.some((run) => run.adapterId === "public-ripestat-whois")).toBe(true);
    expect(classifyUniversalOsintQuery("999.8.8.8").kind).not.toBe("ip");
  });

  it("routes ASNs into RIPEstat enrichment", () => {
    const plan = buildUniversalOsintPlan("AS13335");
    expect(plan.kind).toBe("asn");
    expect(plan.normalizedTarget).toBe("AS13335");
    expect(plan.runs[0].adapterId).toBe("public-ripestat-whois");
  });

  it("routes NORAD catalog identifiers into CelesTrak", () => {
    const plan = buildUniversalOsintPlan("NORAD 25544");
    expect(plan.kind).toBe("norad_id");
    expect(plan.normalizedTarget).toBe("25544");
    expect(plan.runs[0].adapterId).toBe("public-celestrak-gp");
  });

  it("routes explicit space-weather queries into NOAA SWPC", () => {
    const plan = buildUniversalOsintPlan("space weather");
    expect(plan.kind).toBe("space_weather");
    expect(plan.runs[0].adapterId).toBe("public-noaa-space-weather");
  });

  it("recognizes explicit SEC CIK searches", () => {
    const plan = buildUniversalOsintPlan("CIK 320193");
    expect(plan.kind).toBe("sec_cik");
    expect(plan.normalizedTarget).toBe("320193");
    expect(plan.runs[0]).toMatchObject({
      adapterId: "public-sec-edgar",
      input: { cik: "320193" },
    });
  });

  it("keeps catalog-only indexes separate from production-integrated CTI services", () => {
    const catalog = listOsintToolCatalog();
    expect(catalog.find((entry) => entry.id === "opensanctions")?.mode).toBe("catalog_only");
    expect(catalog.find((entry) => entry.id === "opencti")?.mode).toBe("builtin");
    expect(catalog.find((entry) => entry.id === "intelowl")?.mode).toBe("builtin");
  });
});
