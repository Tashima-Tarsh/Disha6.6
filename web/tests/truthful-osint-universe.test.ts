import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const consolePage = path.resolve(__dirname, "../app/page.tsx");
const loginPage = path.resolve(__dirname, "../app/login/login-client.tsx");
const workspaceRoute = path.resolve(__dirname, "../app/api/v1/intelligence/workspace/route.ts");
const spatialQuery = path.resolve(__dirname, "../lib/geospatial/spatial-query.ts");

describe("truthful OSINT universe boundaries", () => {
  it("enforces fail-closed zero-trust and real-time backend interrogation", () => {
    const source = fs.readFileSync(consolePage, "utf8");

    expect(source).toContain("/api/osint/scan");
    expect(source).toContain("ALL_43_COLLECTORS");
    expect(source).not.toContain("Math.random() * 1000");
    expect(source).not.toContain("fakeNodes");
  });

  it("ensures the dedicated login gateway contains zero unauthenticated intelligence leakage", () => {
    const source = fs.readFileSync(loginPage, "utf8");

    expect(source).toContain("autoComplete=\"username\"");
    expect(source).toContain("autoComplete=\"current-password\"");
    expect(source).not.toContain("satelliteOrbit");
    expect(source).not.toContain("interceptedPackets");
  });

  it("does not synthesize workspace or geospatial intelligence when persistence is unavailable", () => {
    const workspace = fs.readFileSync(workspaceRoute, "utf8");
    const geo = fs.readFileSync(spatialQuery, "utf8");

    expect(workspace).toContain('database: "unconfigured"');
    expect(workspace).not.toContain("fallbackMissions");
    expect(workspace).not.toContain("Vyuha Chakra Formation Engaged");
    expect(geo).not.toContain("fallbackOperationalFeatures");
    expect(geo).not.toContain("CERT-In National Cyber Defense Core");
  });
});
