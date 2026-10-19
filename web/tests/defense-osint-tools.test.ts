import { describe, expect, it } from "vitest";
import {
  createOpenSkyFlightAdapter,
  createProjectEyesOnAdapter,
  createDefenseOsintMatrixAdapter,
} from "../lib/unified/defense-osint-adapters";
import { createDefaultOsintBus } from "../lib/unified/osint-default-bus";
import { buildUniversalOsintPlan, runUniversalOsintSearch } from "../lib/unified/universal-osint-search";
import { osintSourceUniverse } from "../lib/unified/osint-source-universe";
import { osintToolCatalog } from "../lib/unified/osint-tool-catalog";

describe("2026 Defense OSINT Tools & Project Eyes On Integration", () => {
  it("registers all 11 defense tools in osintSourceUniverse", () => {
    const requiredSourceIds = [
      "adsb-exchange",
      "marinetraffic",
      "global-fishing-watch",
      "sentinel-hub",
      "liveuamap",
      "polyglobe",
      "opensky-network",
      "flightradar24",
      "google-earth-pro",
      "acled",
      "project-eyes-on",
    ];

    for (const sourceId of requiredSourceIds) {
      const entry = osintSourceUniverse.find((s) => s.id === sourceId);
      expect(entry, `Source '${sourceId}' must exist in osintSourceUniverse`).toBeDefined();
      expect(entry?.capabilities.length).toBeGreaterThan(0);
      expect(entry?.homeUrl).toMatch(/^https?:\/\//);
    }
  });

  it("registers Project Eyes On and OpenSky in osintToolCatalog as builtin", () => {
    const eyesOn = osintToolCatalog.find((t) => t.id === "project-eyes-on");
    expect(eyesOn).toBeDefined();
    expect(eyesOn?.mode).toBe("builtin");
    expect(eyesOn?.capabilities).toContain("Mass open IP camera scanning");

    const openSky = osintToolCatalog.find((t) => t.id === "opensky-api");
    expect(openSky).toBeDefined();
    expect(openSky?.mode).toBe("builtin");
  });

  it("executes OpenSky Flight Adapter with mock responses", async () => {
    const mockFetcher = async () =>
      new Response(
        JSON.stringify({
          time: 1718000000,
          states: [
            [
              "4b1812",
              "SVR123  ",
              "Switzerland",
              1718000000,
              1718000000,
              8.54,
              47.45,
              3000,
              false,
              220,
              180,
              0,
              null,
              3100,
              "7000",
            ],
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    const adapter = createOpenSkyFlightAdapter(mockFetcher as any);
    const result = await adapter.execute(
      { icao24: "4b1812" },
      {
        missionId: "test-mission",
        userId: "analyst-1",
        purpose: "Aviation surveillance verification",
      }
    );

    expect(result.data.totalFlights).toBe(1);
    expect(result.data.flights[0].callsign).toBe("SVR123");
    expect(result.evidence.length).toBe(1);
  });

  it("executes Project Eyes On Adapter", async () => {
    const adapter = createProjectEyesOnAdapter();
    const result = await adapter.execute(
      { country: "US", mode: "STREAM" },
      {
        missionId: "test-mission",
        userId: "analyst-1",
        purpose: "Camera surveillance verification",
      }
    );

    expect(result.data.totalDiscovered).toBeGreaterThan(0);
    expect(result.data.cameras[0].streamUrl).toContain("insecam.org");
    expect(result.evidence[0].summary).toContain("Project Eyes On");
  });

  it("executes Defense OSINT Matrix triangulation adapter", async () => {
    const adapter = createDefenseOsintMatrixAdapter();
    const result = await adapter.execute(
      { domain: "all", theatreOrRegion: "Baltic & Black Sea" },
      {
        missionId: "test-mission",
        userId: "analyst-1",
        purpose: "Tri-service defense analysis",
      }
    );

    expect(result.data.activeTools.length).toBe(11);
    expect(result.data.triangulationWorkflow).toContain("ADS-B Exchange");
    expect(result.data.triangulationWorkflow).toContain("Sentinel Hub");
  });

  it("runs Universal OSINT Search routing for flight, surveillance, and defense queries", () => {
    const planDefense = buildUniversalOsintPlan("military conflict frontline");
    expect(planDefense.kind).toBe("defense_conflict");
    expect(planDefense.runs.map((r) => r.adapterId)).toContain("defense-osint-matrix");

    const planCamera = buildUniversalOsintPlan("insecam open camera surveillance");
    expect(planCamera.kind).toBe("surveillance_camera");
    expect(planCamera.runs.map((r) => r.adapterId)).toContain("astra6-project-eyes-on");

    const planFlight = buildUniversalOsintPlan("flight radar aircraft adsb transponder");
    expect(planFlight.kind).toBe("flight_radar");
    expect(planFlight.runs.map((r) => r.adapterId)).toContain("public-opensky-flight-radar");
  });
});
