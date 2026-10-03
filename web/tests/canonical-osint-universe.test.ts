import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  OSINT_SYSTEM_CONFIGS,
  calculate3DPosition,
  mapCategoryToSystem,
  type OsintSystemId,
} from "../lib/unified/canonical-source-registry";
import { osintSourceUniverse } from "../lib/unified/osint-source-universe";
import { classifyUniversalTarget } from "../lib/unified/universal-target-classifier";

const universeRoute = path.resolve(__dirname, "../app/api/v1/osint/universe/route.ts");
const investigationsRoute = path.resolve(__dirname, "../app/api/v1/osint/investigations/route.ts");
const universeComponent = path.resolve(__dirname, "../components/visual/OsintUniverse3D.tsx");

describe("Canonical 3D OSINT Universe & Investigation Engine", () => {
  it("maps all 125 cataloged sources cleanly into the 10 spatial OSINT systems", () => {
    expect(osintSourceUniverse.length).toBeGreaterThanOrEqual(120);

    const validSystems: OsintSystemId[] = [
      "identity",
      "social",
      "corporate",
      "news",
      "cyber",
      "infrastructure",
      "geospatial",
      "archives",
      "space",
      "evidence",
    ];

    const observedSystems = new Set<OsintSystemId>();

    for (const source of osintSourceUniverse) {
      const system = mapCategoryToSystem(source.category);
      expect(validSystems).toContain(system);
      observedSystems.add(system);

      const config = OSINT_SYSTEM_CONFIGS[system];
      expect(config).toBeDefined();
      expect(config.orbitalRadius).toBeGreaterThan(0);
      expect(config.altitude).toBeDefined();

      const coords = calculate3DPosition(config, 0, 10);
      expect(Number.isFinite(coords.x)).toBe(true);
      expect(Number.isFinite(coords.y)).toBe(true);
      expect(Number.isFinite(coords.z)).toBe(true);
    }

    // Verify system distribution
    expect(observedSystems.size).toBe(10);
  });

  it("enforces authentication and governed access on the universe route", () => {
    const route = fs.readFileSync(universeRoute, "utf8");
    expect(route).toContain("withContext");
    expect(route).toContain("agent:read");
    expect(route).toContain("buildCanonicalUniverseRuntime");
    expect(route).not.toContain("fallbackUniverse");
    expect(route).not.toContain("mockSources");
  });

  it("correctly routes investigative queries and clusters candidate identities without false merges", () => {
    const route = fs.readFileSync(investigationsRoute, "utf8");
    expect(route).toContain("withContext");
    expect(route).toContain("agent:run");
    expect(route).toContain("candidateClusters");
    expect(route).toContain("provenanceHash");
    expect(route).toContain("contentHash");

    // Test target classification on various investigation targets
    expect(classifyUniversalTarget("example.com").primaryType).toBe("domain");
    expect(classifyUniversalTarget("198.51.100.1").primaryType).toBe("ip");
    expect(classifyUniversalTarget("analyst@example.com").primaryType).toBe("email");
    expect(classifyUniversalTarget("+919876543210").primaryType).toBe("phone");
    expect(classifyUniversalTarget("Nitish Kumar").primaryType).toBe("person");
  });

  it("delivers full 3D interactive universe component with depth, camera controls, and raycasting", () => {
    const comp = fs.readFileSync(universeComponent, "utf8");
    expect(comp).toContain("THREE.WebGLRenderer");
    expect(comp).toContain("THREE.PerspectiveCamera");
    expect(comp).toContain("THREE.Raycaster");
    expect(comp).toContain("CatmullRomCurve3");
    expect(comp).toContain("HEALTH_COLORS");
    expect(comp).toContain("DISHA_CORE");
    expect(comp).toContain("UNIVERSE");
    expect(comp).toContain("activeInvestigation");
    expect(comp).not.toContain("Math.random() * 1000");
  });
});
