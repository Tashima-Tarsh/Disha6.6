import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (route: string) => fs.readFileSync(path.resolve(__dirname, route), "utf8");

describe("OSINT proxy governance regression guards", () => {
  it("requires a mission owner and executes through the governed adapter bus", () => {
    const text = source("../app/api/v1/osint/run/route.ts");
    expect(text).toContain("getMission(body.missionId)");
    expect(text).toContain("canReadMission(mission, ctx.principal)");
    expect(text).toContain("await bus.run(body.adapterId, input,");
    expect(text).not.toContain("fetch(`${BACKEND}/scan`");
    expect(text).not.toContain("policyApprovalRequired: false");
  });

  it("protects every legacy OSINT proxy mutation by authentication and an opt-in admin gate", () => {
    for (const route of [
      "../app/api/osint/scan/route.ts",
      "../app/api/osint/vyuh/activate/route.ts",
      "../app/api/osint/data/load/route.ts",
      "../app/api/osint/resolve/route.ts",
    ]) {
      const text = source(route);
      expect(text, route).toContain('withContext(req, "agent:run"');
      expect(text, route).toContain('DISHA_LEGACY_OSINT_PROXY_ENABLED !== "true"');
      expect(text, route).toContain('ctx.principal.roles.includes("admin")');
    }
  });

  it("requires authorization before reading proxied backend metadata", () => {
    for (const route of [
      "../app/api/osint/tools/route.ts",
      "../app/api/osint/health/route.ts",
      "../app/api/osint/graph/stats/route.ts",
      "../app/api/osint/vyuh/formations/route.ts",
    ]) {
      expect(source(route), route).toContain('withContext(req, "agent:read"');
    }
  });

  it("does not mark backend collector advertisements as proven healthy or runnable", () => {
    const tools = source("../app/api/v1/osint/tools/route.ts");
    const health = source("../app/api/v1/osint/tools/health/route.ts");
    const search = source("../app/api/v1/osint/search/route.ts");
    expect(tools).not.toContain("HEALTHY (backend live)");
    expect(tools).toContain('status: "ADVERTISED_UNVERIFIED"');
    expect(tools).toContain("verifiedExecution && isRunnable");
    expect(health).toContain("Tool operational status requires observed successful runtime evidence");
    expect(search).toContain('status: "advertised_unverified"');
  });
});
