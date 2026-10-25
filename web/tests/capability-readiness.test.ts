import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { signJson } from "../lib/server/crypto";
import { authSigningSecret } from "../lib/server/auth";
import { listSkills } from "../lib/skills/skill-registry";
import { getCapabilityReadiness } from "../lib/skills/capability-readiness";
import { GET } from "../app/api/v1/skills/readiness/route";

const base = "http://localhost:3000/api/v1/skills/readiness";

function signedHeaders() {
  const token = signJson(
    {
      sub: "capability-reader",
      email: "reader@example.test",
      roles: ["viewer"],
      sessionId: "read-1",
      typ: "access",
      jti: "read-jti",
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    authSigningSecret(),
  );
  return { authorization: `Bearer ${token}` };
}

describe("capability maturity catalog", () => {
  it("exposes the entire registry without equating skill prompts with independent tools", () => {
    const result = getCapabilityReadiness({ limit: 200 });
    expect(result.catalogued).toBe(listSkills().length);
    expect(result.catalogued).toBeGreaterThanOrEqual(1800);
    expect(result.independentlyCertifiedExecutors).toBe(0);
    expect(result.offlineValidatorMappings + result.instructionOnlyMappings).toBe(result.catalogued);
    expect(result.entries.length).toBe(200);
  });

  it("classifies OSINT and frontend instructions as not independently executable", () => {
    for (const category of ["intelligence-osint", "design-frontend", "general"]) {
      const result = getCapabilityReadiness({ category, limit: 10 });
      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.entries.every((cap) => cap.mode === "INSTRUCTIONS_ONLY")).toBe(true);
      expect(result.entries.every((cap) => !cap.canInvokeSkillApi)).toBe(true);
    }
  });

  it("documents the limitations of bounded offline validation", () => {
    const result = getCapabilityReadiness({ category: "computer-networking", limit: 10 });
    expect(result.entries.every((cap) => cap.mode === "OFFLINE_LIMITED")).toBe(true);
    expect(result.entries.every((cap) => cap.limitation.includes("No packet capture"))).toBe(true);
  });

  it("requires user authentication and validates pagination", async () => {
    const denied = await GET(new NextRequest(base));
    expect(denied.status).toBe(401);

    const ok = await GET(new NextRequest(base + "?limit=3&offset=2", { headers: signedHeaders() }));
    expect(ok.status).toBe(200);
    const data = await ok.json();
    expect(data.limit).toBe(3);
    expect(data.offset).toBe(2);
    expect(data.entries).toHaveLength(3);

    const invalid = await GET(new NextRequest(base + "?offset=../secret", { headers: signedHeaders() }));
    expect(invalid.status).toBe(400);
  });
});
