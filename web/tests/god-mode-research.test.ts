import { describe, expect, it, vi } from "vitest";
import {
  GodModeResearchEngine,
  type GodModeResearchRequest,
} from "../lib/intelligence/god-mode-research";

describe("GodModeResearchEngine", () => {
  it("enforces research budget bounds and produces an explainable execution trace", async () => {
    const engine = new GodModeResearchEngine();

    // Mock bus run to return controlled responses
    const runSpy = vi.spyOn((engine as any).bus, "run").mockImplementation(async (adapterId: string, input: any) => {
      if (adapterId === "public-dns-google") {
        return {
          adapterId,
          status: "completed",
          durationMs: 15,
          attempts: 1,
          warnings: [],
          evidence: [
            {
              id: "ev-dns-1",
              sourceId: "google-dns",
              sourceName: "Google Public DNS",
              provenanceHash: "a1b2c3d4e5f67890",
              retrievedAt: new Date().toISOString(),
              summary: "A record resolution for example.com",
            },
          ],
          data: {
            Answer: [{ data: "93.184.216.34" }],
          },
        };
      }
      if (adapterId === "public-rdap") {
        return {
          adapterId,
          status: "completed",
          durationMs: 25,
          attempts: 1,
          warnings: [],
          evidence: [
            {
              id: "ev-rdap-1",
              sourceId: "iana-rdap",
              sourceName: "RDAP Service",
              provenanceHash: "b2c3d4e5f6a1b2c3",
              retrievedAt: new Date().toISOString(),
              summary: "RDAP entity record for example.com",
            },
          ],
          data: {
            handle: "IANA-REG",
            entities: [
              {
                vcardArray: [
                  "vcard",
                  [["fn", {}, "text", "Internet Assigned Numbers Authority"]],
                ],
              },
            ],
            events: [
              {
                eventAction: "registration",
                eventDate: "1995-08-14T04:00:00Z",
              },
            ],
          },
        };
      }
      if (adapterId === "public-certificate-transparency") {
        return {
          adapterId,
          status: "completed",
          durationMs: 20,
          attempts: 1,
          warnings: [],
          evidence: [
            {
              id: "ev-ct-1",
              sourceId: "crt-sh",
              sourceName: "crt.sh",
              provenanceHash: "c3d4e5f6a1b2c3d4",
              retrievedAt: new Date().toISOString(),
              summary: "Certificate Transparency entry",
            },
          ],
          data: [
            {
              id: 12345,
              common_name: "api.example.com",
              issuer_name: "DigiCert",
              entry_timestamp: "2024-01-01T00:00:00Z",
            },
          ],
        };
      }
      return {
        adapterId,
        status: "completed",
        durationMs: 10,
        attempts: 1,
        warnings: [],
        evidence: [],
        data: {},
      };
    });

    const request: GodModeResearchRequest = {
      objective: "Map external infrastructure and ownership for example.com",
      seed: {
        entityType: "domain",
        value: "example.com",
      },
      budget: {
        maxDepth: 2,
        maxTools: 4,
        maxExecutionTimeMs: 10000,
        maxApiCalls: 6,
      },
    };

    const dossier = await engine.executeResearch(request);

    // Assertions on Dossier Structure
    expect(dossier.dossierId).toMatch(/^dossier-[a-f0-9]+/);
    expect(dossier.provenanceHash).toBeDefined();
    expect(dossier.objective).toBe(request.objective);
    expect(dossier.seed.value).toBe("example.com");

    // Budget enforcement
    expect(dossier.budgetConsumed.toolsExecuted).toBeLessThanOrEqual(4);
    expect(dossier.budgetConsumed.apiCalls).toBeLessThanOrEqual(6);
    expect(dossier.budgetConsumed.depthReached).toBeLessThanOrEqual(2);

    // Entity discovery and multi-hop
    expect(dossier.entities.length).toBeGreaterThanOrEqual(2);
    const entityTypes = dossier.entities.map((e) => e.entityType);
    expect(entityTypes).toContain("domain");
    expect(entityTypes).toContain("ip");
    expect(entityTypes).toContain("organization");

    // Graph nodes and edges
    expect(dossier.graph.nodes.length).toBeGreaterThanOrEqual(3);
    expect(dossier.graph.edges.length).toBeGreaterThanOrEqual(2);

    // Timeline and Evidence
    expect(dossier.timeline.length).toBeGreaterThanOrEqual(1);
    expect(dossier.evidenceIndex.length).toBeGreaterThanOrEqual(2);
    for (const ev of dossier.evidenceIndex) {
      expect(ev.sha256).toBeDefined();
      expect(ev.source).toBeDefined();
    }

    // Execution trace is explainable
    expect(dossier.executionTrace.length).toBeGreaterThan(0);
    for (const step of dossier.executionTrace) {
      expect(step.action).toBeDefined();
      expect(step.reason).toBeDefined();
      expect(step.toolOrAdapterId).toBeDefined();
      expect(step.durationMs).toBeGreaterThanOrEqual(0);
    }

    // Corroboration and summary
    expect(dossier.corroboration.length).toBeGreaterThan(0);
    expect(dossier.executiveSummary).toContain("Autonomous investigative research");

    // Multi-Agent team and replayability
    expect(dossier.multiAgentTeam.length).toBeGreaterThanOrEqual(4);
    expect(dossier.multiAgentTeam.some((a) => a.role === "network_recon")).toBe(true);
    expect(dossier.replayLog.length).toBeGreaterThan(0);
    const replayResult = engine.replayInvestigation(dossier);
    expect(replayResult.verified).toBe(true);
    expect(replayResult.matchedSteps).toBe(dossier.replayLog.length);

    runSpy.mockRestore();
  });

  it("detects contradictions when sources provide conflicting claims", async () => {
    const engine = new GodModeResearchEngine();

    const runSpy = vi.spyOn((engine as any).bus, "run").mockImplementation(async (adapterId: string, input: any) => {
      if (adapterId === "public-rdap") {
        return {
          adapterId,
          status: "completed",
          durationMs: 15,
          attempts: 1,
          warnings: [],
          evidence: [],
          data: {
            handle: "REG-A",
            entities: [
              {
                vcardArray: ["vcard", [["fn", {}, "text", "Registrar Alpha"]]],
              },
            ],
          },
        };
      }
      if (adapterId === "public-dns-google") {
        return {
          adapterId,
          status: "completed",
          durationMs: 10,
          attempts: 1,
          warnings: [],
          evidence: [],
          data: {
            Answer: [{ data: "192.0.2.1" }],
          },
        };
      }
      return {
        adapterId,
        status: "completed",
        durationMs: 10,
        attempts: 1,
        warnings: [],
        evidence: [],
        data: {},
      };
    });

    const request: GodModeResearchRequest = {
      objective: "Check registrar integrity",
      seed: {
        entityType: "domain",
        value: "conflict-test.org",
      },
      budget: {
        maxDepth: 1,
        maxTools: 4,
        maxExecutionTimeMs: 5000,
        maxApiCalls: 4,
      },
    };

    const dossier = await engine.executeResearch(request);
    expect(dossier.dossierId).toBeDefined();
    expect(dossier.entities.length).toBeGreaterThan(0);
    expect(dossier.corroboration.some((c) => c.subject === "conflict-test.org")).toBe(true);
    expect(dossier.corroboration.some((c) => c.predicate === "registrar")).toBe(true);

    // Multi-Agent team and replayability
    expect(dossier.multiAgentTeam.length).toBeGreaterThanOrEqual(4);
    expect(dossier.multiAgentTeam.some((a) => a.role === "network_recon")).toBe(true);
    expect(dossier.replayLog.length).toBeGreaterThan(0);
    const replayResult = engine.replayInvestigation(dossier);
    expect(replayResult.verified).toBe(true);
    expect(replayResult.matchedSteps).toBe(dossier.replayLog.length);

    runSpy.mockRestore();
  });
});
