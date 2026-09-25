import { describe, expect, it } from "vitest";

import { getSurveillanceTool, surveillanceTools } from "../lib/surveillance/tool-registry";

describe("surveillance intelligence registry", () => {
  it("exposes a unique, governed tool catalog", () => {
    expect(surveillanceTools.length).toBeGreaterThanOrEqual(8);
    expect(new Set(surveillanceTools.map((tool) => tool.id)).size).toBe(surveillanceTools.length);

    for (const tool of surveillanceTools) {
      expect(tool.name.length).toBeGreaterThan(0);
      expect(tool.upstream).toContain("/");
      expect(tool.purpose.length).toBeGreaterThan(0);
      expect(tool.safetyBoundary.length).toBeGreaterThan(0);
    }
  });

  it("resolves the core integration targets", () => {
    expect(getSurveillanceTool("mobsf")?.integrationMode).toBe("api_adapter");
    expect(getSurveillanceTool("mvt")?.integrationMode).toBe("external_runtime");
    expect(getSurveillanceTool("gods-eye-view")?.category).toBe("geospatial_osint");
  });
});
