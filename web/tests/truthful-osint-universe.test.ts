import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const loginScene = path.resolve(__dirname, "../components/visual/SovereignCyberMatrix3D.tsx");
const postLoginGlobe = path.resolve(__dirname, "../components/visual/GodsEyeHologramGlobe.tsx");
const surveillanceClient = path.resolve(__dirname, "../app/surveillance/surveillance-client.tsx");
const workspaceRoute = path.resolve(__dirname, "../app/api/v1/intelligence/workspace/route.ts");
const spatialQuery = path.resolve(__dirname, "../lib/geospatial/spatial-query.ts");

describe("truthful OSINT universe boundaries", () => {
  it("keeps the pre-auth Three.js scene explicitly capability-only", () => {
    const source = fs.readFileSync(loginScene, "utf8");

    expect(source).toContain("Capability Preview Nodes (Pre-Auth)");
    expect(source).toContain("PRE-AUTH CAPABILITY MODEL");
    expect(source).toContain("No live connector, incident, infrastructure, or intelligence status is asserted before login.");
    expect(source).not.toContain("MUMBAI INGRESS");
    expect(source).not.toContain("HYDERABAD CTI");
    expect(source).not.toContain("CERT-In National CSIRT");
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

  it("requires the post-login globe to receive admitted runtime nodes instead of built-in fictional topology", () => {
    const globe = fs.readFileSync(postLoginGlobe, "utf8");
    const client = fs.readFileSync(surveillanceClient, "utf8");

    expect(globe).toContain("nodes?: StrategicNode[]");
    expect(globe).toContain("orbits?: SatelliteOrbit[]");
    expect(globe).toContain("Relationship arcs are intentionally omitted unless backed by authenticated evidence.");
    expect(globe).not.toContain("STRATEGIC_GLOBAL_NODES");
    expect(globe).not.toContain("SATELLITE_ORBITS");
    expect(globe).not.toContain("Delhi Supreme Cyber Command");
    expect(globe).not.toContain("GS-01 Sovereignty SAR");

    expect(client).toContain("initialGeo.features.flatMap");
    expect(client).toContain("nodes={globeNodes}");
    expect(client).toContain("Built-in fictional satellites are disabled.");
  });
});
