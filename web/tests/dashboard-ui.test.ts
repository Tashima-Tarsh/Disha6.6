import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dashboardClient = path.resolve(__dirname, "../app/dashboard/dashboard-client.tsx");
const dashboardPage = path.resolve(__dirname, "../app/dashboard/page.tsx");
const mapComponent = path.resolve(__dirname, "../components/geospatial/GeospatialCommandMap.tsx");
const graphComponent = path.resolve(__dirname, "../components/intelligence/IntelligenceGraph.tsx");
const workspaceRoute = path.resolve(__dirname, "../app/api/v1/intelligence/workspace/route.ts");
const systemPage = path.resolve(__dirname, "../app/system/page.tsx");
const basemapContract = path.resolve(__dirname, "../lib/geospatial/basemap-contract.ts");
const legacyRoute = path.resolve(__dirname, "../app/dashboard/route.ts");
const legacyHtml = path.resolve(__dirname, "../app/dashboard/disha66-command-centre-v3.html");

describe("DISHA analyst workspace", () => {
  it("keeps the dashboard authenticated and removes legacy static dashboard delivery", () => {
    const page = fs.readFileSync(dashboardPage, "utf8");
    expect(page).toContain("principalFromAccessToken");
    expect(page).toContain("returnUrl=%2Fdashboard");
    expect(fs.existsSync(legacyRoute)).toBe(false);
    expect(fs.existsSync(legacyHtml)).toBe(false);
  });

  it("makes the authenticated dashboard map-first instead of backend-readiness-first", () => {
    const source = fs.readFileSync(dashboardClient, "utf8");
    expect(source).toContain("/api/v1/intelligence/workspace");
    expect(source).toContain("India operational map");
    expect(source).toContain("Context inspector");
    expect(source).toContain("Entity / evidence graph");
    expect(source).toContain("Evidence timeline");
    expect(source).toContain('href="/system"');
    expect(source).toContain("CommandPalette");
    expect(source).not.toContain("Constitutional Evidence Command Centre");
    expect(source).not.toContain("Rules of Engagement");
    expect(source).not.toContain('d="M43 8 L55 10');
  });

  it("ships a real MapLibre runtime with contextual attribution and persisted overlays only", () => {
    const source = fs.readFileSync(mapComponent, "utf8");
    const basemap = fs.readFileSync(basemapContract, "utf8");
    expect(source).toContain('from "react-map-gl/maplibre"');
    expect(source).toContain("maplibregl.setWorkerUrl");
    expect(source).toContain("DeckGL");
    expect(source).toContain("HeatmapLayer");
    expect(source).toContain("ScatterplotLayer");
    expect(source).toContain("No authoritative disha6.6 geometry is admitted yet");
    expect(basemap).toContain("https://tiles.openfreemap.org/styles/liberty");
    expect(basemap).toContain("OpenStreetMap contributors");
    expect(basemap).toContain('role: "context_only"');
  });

  it("uses persisted entity edges and a DB-backed workspace feed", () => {
    const graph = fs.readFileSync(graphComponent, "utf8");
    const route = fs.readFileSync(workspaceRoute, "utf8");
    expect(graph).toContain('from "cytoscape"');
    expect(graph).toContain("edges.filter");
    expect(route).toContain("intelligence_entities");
    expect(route).toContain("intelligence_edges");
    expect(route).toContain("intelligence_change_events");
    expect(route).toContain("evidence_events");
    expect(route).toContain("evidence_lineage_nodes");
    expect(route).toContain("listOperationalGeoFeatures");
  });

  it("moves infrastructure detail to a dedicated protected system console", () => {
    const source = fs.readFileSync(systemPage, "utf8");
    expect(source).toContain("principalFromAccessToken");
    expect(source).toContain("returnUrl=%2Fsystem");
    expect(source).toContain("SystemClient");
  });
});
