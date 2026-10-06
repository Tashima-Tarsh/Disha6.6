import { describe, expect, it } from "vitest";

import {
  getOsintSourceUniverseSummary,
  listOsintSourceUniverse,
  searchOsintSourceUniverse,
} from "../lib/unified/osint-source-universe";

describe("OSINT CTI SPACEINT source universe", () => {
  it("contains the requested broad source universe", () => {
    const entries = listOsintSourceUniverse();
    expect(entries.length).toBeGreaterThanOrEqual(120);

    for (const id of [
      "osint-framework",
      "bellingcat-toolkit",
      "inteltechniques",
      "wayback",
      "gdelt",
      "acled",
      "opensanctions",
      "shodan",
      "virustotal",
      "nvd",
      "mitre-attack",
      "opencti",
      "space-track",
      "celestrak",
      "satnogs",
      "copernicus-browser",
      "nasa-firms",
      "planet",
      "unoosa-register",
      "noaa-swpc",
      "vahan-national-transport",
      "parivahan-echallan",
    ]) {
      expect(entries.some((entry) => entry.id === id), id).toBe(true);
    }
  });

  it("marks existing governed adapters as built in", () => {
    const entries = listOsintSourceUniverse();
    expect(entries.find((entry) => entry.id === "wayback")?.adapterId).toBe("public-wayback-cdx");
    expect(entries.find((entry) => entry.id === "gdelt")?.adapterId).toBe("public-gdelt-news");
    expect(entries.find((entry) => entry.id === "sec-edgar")?.adapterId).toBe("public-sec-edgar");
    expect(entries.find((entry) => entry.id === "crtsh")?.adapterId).toBe("public-certificate-transparency");
    expect(entries.find((entry) => entry.id === "cisa-kev")?.adapterId).toBe("public-cisa-kev");
    expect(entries.find((entry) => entry.id === "nvd")?.adapterId).toBe("public-nvd-cve");
    expect(entries.find((entry) => entry.id === "epss")?.adapterId).toBe("public-epss");
    expect(entries.find((entry) => entry.id === "ripe-stat")?.adapterId).toBe("public-ripestat-whois");
    expect(entries.find((entry) => entry.id === "celestrak")?.adapterId).toBe("public-celestrak-gp");
    expect(entries.find((entry) => entry.id === "noaa-swpc")?.adapterId).toBe("public-noaa-space-weather");
    expect(entries.find((entry) => entry.id === "reliefweb")?.adapterId).toBe("public-reliefweb");\n    expect(entries.find((entry) => entry.id === "threatfox")?.adapterId).toBe("public-threatfox");\n    expect(entries.find((entry) => entry.id === "malwarebazaar")?.adapterId).toBe("public-malwarebazaar");\n    expect(entries.find((entry) => entry.id === "opensanctions")?.adapterId).toBe("public-opensanctions");\n    expect(entries.find((entry) => entry.id === "opencorporates")?.adapterId).toBe("public-opencorporates");
  });

  it("does not normalize sensitive leak and breach sources into ordinary executable connectors", () => {
    const entries = listOsintSourceUniverse();
    for (const id of ["ddosecrets", "wikileaks", "intelligence-x", "dehashed"]) {
      const entry = entries.find((item) => item.id === id);
      expect(entry?.risk).toBe("restricted");
      expect(entry?.mode).toBe("blocked_by_default");
    }
  });

  it("tracks credentialed providers separately from live adapters", () => {
    const entries = listOsintSourceUniverse();
    for (const id of ["opensanctions", "opencorporates", "shodan", "space-track", "nasa-firms", "opencti", "reliefweb", "threatfox", "malwarebazaar", "urlhaus"]) {
      expect(entries.find((entry) => entry.id === id)?.mode).toBe("requires_configuration");
    }
  });

  it("supports category and text search for operator discovery", () => {
    const space = searchOsintSourceUniverse("", "orbital_tracking");
    expect(space.some((entry) => entry.id === "celestrak")).toBe(true);
    expect(space.every((entry) => entry.category === "orbital_tracking")).toBe(true);

    const sanctions = searchOsintSourceUniverse("sanctions");
    expect(sanctions.some((entry) => entry.id === "opensanctions")).toBe(true);
    expect(sanctions.some((entry) => entry.id === "ofac-sanctions")).toBe(true);
  });

  it("publishes useful coverage totals", () => {
    const summary = getOsintSourceUniverseSummary();
    expect(summary.total).toBeGreaterThanOrEqual(120);
    expect(summary.builtin).toBeGreaterThanOrEqual(10);
    expect(summary.connectorReady).toBeGreaterThan(0);
    expect(summary.requiresConfiguration).toBeGreaterThan(0);
    expect(summary.blockedByDefault).toBeGreaterThan(0);
    expect(summary.byCategory.space_weather).toBeGreaterThan(0);
    expect(summary.byCategory.malware_ioc).toBeGreaterThan(0);
    expect(summary.byCategory.corporate_financial).toBeGreaterThan(0);\n    expect(summary.byCategory.vehicle_registry).toBeGreaterThan(0);
  });
});
