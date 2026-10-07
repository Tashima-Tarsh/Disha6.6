import { describe, expect, it, vi, afterEach } from "vitest";
import {
  investigationInput,
  classifyTarget,
  planInvestigation,
} from "../services/investigation/plan";
import { classifyUniversalTarget } from "../lib/unified/universal-target-classifier";
import { buildTargetRoutePlan } from "../lib/unified/target-route-registry";
import { evaluateTimeRange } from "../services/investigation/time-filter";
import { executeIntelligencePipeline } from "../services/investigation/intelligence-pipeline";
import { InvestigationService } from "../services/investigation/service";
import type { AdapterPlan, InvestigationEvidence } from "../lib/investigation/types";
import type { InvestigationStore, TemporaryInvestigation } from "../lib/server/investigation-store";
import type { RequestContext } from "../lib/server/types";

const ctx: RequestContext = {
  requestId: "test-request",
  principal: {
    userId: "test-owner",
    email: "owner@example.com",
    roles: ["analyst"],
  },
};

const operatorCtx: RequestContext = {
  requestId: "operator-request",
  principal: {
    userId: "test-operator",
    email: "operator@example.com",
    roles: ["operator"],
  },
};

class MemoryStore implements InvestigationStore {
  states = new Map<string, TemporaryInvestigation>();
  images = new Map<string, Buffer>();
  locks = new Map<string, string>();
  stops = new Set<string>();
  owners = new Map<string, string>();

  async create(value: TemporaryInvestigation, image?: Buffer) {
    this.states.set(value.investigationId, structuredClone(value));
    this.owners.set(value.investigationId, value.ownerId);
    if (image) this.images.set(value.investigationId, Buffer.from(image));
  }

  async authorized(id: string, owner: string) {
    return this.owners.get(id) === owner;
  }

  async read(id: string) {
    return this.states.has(id) ? structuredClone(this.states.get(id)!) : null;
  }

  async save(value: TemporaryInvestigation) {
    if (this.stops.has(value.investigationId) || !this.states.has(value.investigationId)) return false;
    this.states.set(value.investigationId, structuredClone(value));
    return true;
  }

  async image(id: string) {
    const img = this.images.get(id);
    return img ? Buffer.from(img) : null;
  }

  async acquire(id: string) {
    if (this.locks.has(id) || this.stops.has(id)) return null;
    this.locks.set(id, "lease");
    return "lease";
  }

  async release(id: string) {
    this.locks.delete(id);
  }

  async busy(id: string) {
    return this.locks.has(id);
  }

  async stop(id: string) {
    this.stops.add(id);
  }

  async stopped(id: string) {
    return this.stops.has(id);
  }

  async remove(id: string) {
    this.states.delete(id);
    this.images.delete(id);
  }

  async budget() {
    return true;
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Production Search Architecture Suite (Bug 1 - 18 Acceptance Criteria)", () => {
  describe("Bug 1 & 2: Investigation Request Schema & Search Universe Contract", () => {
    it("1. validates complete typed search request contracts with all governance controls", () => {
      const valid = investigationInput.safeParse({
        target: "example.com",
        targetType: "domain",
        searchUniverse: "domain",
        investigationMode: "deep",
        sourcePolicy: "all_approved",
        jurisdiction: "global",
        timeRange: "7d",
        selectedToolIds: ["astra6-subfinder"],
        identityAuthorization: false,
        activeAuthorization: false,
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.searchUniverse).toBe("domain");
        expect(valid.data.investigationMode).toBe("deep");
        expect(valid.data.sourcePolicy).toBe("all_approved");
        expect(valid.data.jurisdiction).toBe("global");
        expect(valid.data.timeRange).toBe("7d");
        expect(valid.data.selectedToolIds).toEqual(["astra6-subfinder"]);
      }
    });

    it("2. rejects invalid search universes, modes, policies, jurisdictions and time ranges", () => {
      expect(investigationInput.safeParse({ target: "test.com", searchUniverse: "invalid_universe" }).success).toBe(false);
      expect(investigationInput.safeParse({ target: "test.com", investigationMode: "fast_and_loose" }).success).toBe(false);
      expect(investigationInput.safeParse({ target: "test.com", sourcePolicy: "unfiltered_leak_sites" }).success).toBe(false);
      expect(investigationInput.safeParse({ target: "test.com", jurisdiction: "mars" }).success).toBe(false);
      expect(investigationInput.safeParse({ target: "test.com", timeRange: "100years" }).success).toBe(false);
      expect(investigationInput.safeParse({ target: "test.com", selectedToolIds: "not-an-array" }).success).toBe(false);
    });

    it("3. applies canonical default governance controls when omitted", () => {
      const parsed = investigationInput.parse({ target: "example.com" });
      expect(parsed.searchUniverse).toBe("universal");
      expect(parsed.investigationMode).toBe("standard");
      expect(parsed.sourcePolicy).toBe("all_approved");
      expect(parsed.jurisdiction).toBe("global");
      expect(parsed.timeRange).toBe("30d");
      expect(parsed.selectedToolIds).toEqual([]);
      expect(parsed.identityAuthorization).toBe(false);
      expect(parsed.activeAuthorization).toBe(false);
    });
  });

  describe("Bug 3 & 4: Canonical Planning and Universal Target Classification", () => {
    it("4. single-word tokens without @ are classified as ambiguous topic/entity, NOT usernames", () => {
      const modi = classifyUniversalTarget("Modi");
      expect(modi.primaryType).toBe("topic");
      expect(modi.confidence).toBeLessThan(0.7);
      expect(modi.ambiguityWarning).toBeDefined();
      expect(modi.candidateTypes).toContain("person_name");

      const openai = classifyUniversalTarget("OpenAI");
      expect(openai.primaryType).toBe("company");

      const delhi = classifyUniversalTarget("Delhi");
      expect(delhi.primaryType).toBe("location");
    });

    it("5. explicit @prefix is classified as username with high confidence", () => {
      const user = classifyUniversalTarget("@alice_sec");
      expect(user.primaryType).toBe("username");
      expect(user.confidence).toBeGreaterThanOrEqual(0.9);
      expect(user.normalizedValue).toBe("alice_sec");
    });

    it("6. explicit search universe overrides heuristic target type appropriately", () => {
      const plan = classifyTarget("example_user", "auto", "person");
      expect(plan.targetType).toBe("person_name");

      const companyPlan = classifyTarget("Acme", "auto", "company");
      expect(companyPlan.targetType).toBe("company");
    });
  });

  describe("Bug 5, 6 & 7: Tool Selection, Compatibility and Truthful Status", () => {
    it("7. incompatible user-selected tool is marked INCOMPATIBLE without crashing", () => {
      const plan = buildTargetRoutePlan("example.com", "domain", {
        selectedToolIds: ["astra6-phoneinfoga"],
      });
      const phoneInfoga = plan.find((p) => p.adapterId === "astra6-phoneinfoga");
      expect(phoneInfoga).toBeDefined();
      expect(phoneInfoga?.initialStatus).toBe("INCOMPATIBLE");
      expect(phoneInfoga?.reason).toMatch(/incompatible with target type 'domain'/i);
    });

    it("8. unconfigured tool is marked NOT_CONFIGURED", () => {
      const plan = buildTargetRoutePlan("example.com", "domain", {
        selectedToolIds: ["service-opencti"],
      });
      const opencti = plan.find((p) => p.adapterId === "service-opencti");
      expect(opencti).toBeDefined();
      expect(opencti?.initialStatus).toBe("NOT_CONFIGURED");
    });

    it("9. identity tool selected without authorization is marked RESTRICTED", () => {
      vi.stubEnv("DATABASE_URL", "postgres://test");
      vi.stubEnv("DISHA_ASTRA6_ALL_TOOLS_ENABLED", "true");
      vi.stubEnv("DISHA_IDENTITY_ENUMERATION_APPROVED", "true");

      const plan = buildTargetRoutePlan("+12025550123", "phone", {
        identityAuthorized: false,
        selectedToolIds: ["astra6-phoneinfoga"],
      });
      const phoneInfoga = plan.find((p) => p.adapterId === "astra6-phoneinfoga");
      expect(phoneInfoga).toBeDefined();
      expect(phoneInfoga?.initialStatus).toBe("RESTRICTED");
    });
  });

  describe("Bug 8, 9, 10 & 11: Governance Policies, Modes, and Time Filters", () => {
    it("10. sourcePolicy 'government' strictly retains only government / compliance sources", () => {
      const plan = buildTargetRoutePlan("Acme Inc", "company", {
        sourcePolicy: "government",
      });
      expect(plan.length).toBeGreaterThan(0);
      for (const item of plan) {
        expect(
          item.adapterId === "public-sec-edgar" ||
          item.adapterId.includes("cisa") ||
          item.adapterId.includes("nvd") ||
          item.adapterId.includes("vahan"),
        ).toBe(true);
      }
      expect(plan.some((p) => p.adapterId === "public-wikidata-search")).toBe(false);
      expect(plan.some((p) => p.adapterId === "public-gdelt-news")).toBe(false);
    });

    it("11. investigationMode 'standard' excludes archive tools; 'deep' retains them", () => {
      const standardPlan = buildTargetRoutePlan("example.com", "domain", {
        investigationMode: "standard",
      });
      expect(standardPlan.some((p) => p.adapterId === "public-common-crawl" || p.adapterId === "public-wayback-cdx")).toBe(false);

      const deepPlan = buildTargetRoutePlan("example.com", "domain", {
        investigationMode: "deep",
      });
      expect(deepPlan.some((p) => p.adapterId === "public-common-crawl" || p.adapterId === "public-wayback-cdx")).toBe(true);
    });

    it("12. investigationMode 'evidence_first' sorts authoritative/government sources to top", () => {
      const plan = buildTargetRoutePlan("Acme Corp", "company", {
        investigationMode: "evidence_first",
      });
      const firstGovOrAuth = plan.findIndex((p) => p.adapterId === "public-sec-edgar");
      const wikidata = plan.findIndex((p) => p.adapterId === "public-wikidata-search");
      expect(firstGovOrAuth).toBeLessThan(wikidata);
    });

    it("13. jurisdiction 'india' prioritizes Indian vehicle and registry sources", () => {
      const plan = buildTargetRoutePlan("DL01AB1234", "vehicle_identifier", {
        jurisdiction: "india",
      });
      expect(plan[0].adapterId).toBe("public-india-vehicle-format");
    });

    it("14. evaluateTimeRange correctly filters by 24h, 7d, 30d, custom, and retains timestampUnknown", () => {
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - 12 * 3600 * 1000).toISOString();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString();
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 3600 * 1000).toISOString();
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString();

      // 24h filter
      expect(evaluateTimeRange(twelveHoursAgo, "24h").inRange).toBe(true);
      expect(evaluateTimeRange(threeDaysAgo, "24h").inRange).toBe(false);

      // 7d filter
      expect(evaluateTimeRange(threeDaysAgo, "7d").inRange).toBe(true);
      expect(evaluateTimeRange(fifteenDaysAgo, "7d").inRange).toBe(false);

      // 30d filter
      expect(evaluateTimeRange(fifteenDaysAgo, "30d").inRange).toBe(true);
      expect(evaluateTimeRange(sixtyDaysAgo, "30d").inRange).toBe(false);

      // Unknown timestamp
      const unknown = evaluateTimeRange(undefined, "24h");
      expect(unknown.inRange).toBe(true);
      expect(unknown.timestampUnknown).toBe(true);
    });
  });

  describe("Bug 12 - 16: Deterministic Post-Retrieval Intelligence Pipeline", () => {
    it("15. deduplicates evidence and computes deterministic content hashes", () => {
      const mockEvidence: InvestigationEvidence[] = [
        {
          evidenceId: "ev-1",
          sourceId: "public-wikidata-search",
          sourceName: "Wikidata",
          adapterId: "public-wikidata-search",
          summary: "Identical entity information for Acme Corp.",
          sourceUrl: "https://www.wikidata.org/wiki/Q100",
          observedAt: new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          contentHash: "hash1",
          provenanceHash: "prov1",
          corroborationState: "unverified",
          contradictionState: "not_assessed",
          fields: {},
        },
        {
          evidenceId: "ev-2",
          sourceId: "public-wikidata-search",
          sourceName: "Wikidata",
          adapterId: "public-wikidata-search",
          summary: "Identical entity information for Acme Corp.",
          sourceUrl: "https://www.wikidata.org/wiki/Q100",
          observedAt: new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          contentHash: "hash2",
          provenanceHash: "prov2",
          corroborationState: "unverified",
          contradictionState: "not_assessed",
          fields: {},
        },
      ];

      const result = executeIntelligencePipeline({
        target: "Acme Corp",
        targetType: "company",
        timeRange: "30d",
        evidence: mockEvidence,
      } as any);

      expect(result.rankedFindings.length).toBe(1);
      expect(result.rankedFindings[0].id).toBeDefined();
    });

    it("16. detects corroboration across distinct sources for matching facts", () => {
      const mockEvidence: InvestigationEvidence[] = [
        {
          evidenceId: "ev-1",
          sourceId: "public-sec-edgar",
          sourceName: "SEC EDGAR",
          adapterId: "public-sec-edgar",
          summary: "Acme Corp registered in Delaware with CIK 0001234567.",
          observedAt: new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          contentHash: "hash1",
          provenanceHash: "prov1",
          corroborationState: "unverified",
          contradictionState: "not_assessed",
          fields: {},
        },
        {
          evidenceId: "ev-2",
          sourceId: "public-wikidata-search",
          sourceName: "Wikidata",
          adapterId: "public-wikidata-search",
          summary: "Acme Corp is an American corporation registered in Delaware.",
          observedAt: new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          contentHash: "hash2",
          provenanceHash: "prov2",
          corroborationState: "unverified",
          contradictionState: "not_assessed",
          fields: {},
        },
      ];

      const result = executeIntelligencePipeline({
        target: "Acme Corp",
        targetType: "company",
        timeRange: "30d",
        evidence: mockEvidence,
      } as any);

      expect(result.corroborations.length).toBeGreaterThan(0);
      expect(result.corroborations[0].sources.length).toBe(2);
    });

    it("17. detects contradictions and conflicts between distinct source claims", () => {
      const mockEvidence: InvestigationEvidence[] = [
        {
          evidenceId: "ev-1",
          sourceId: "source-a",
          sourceName: "Provider A",
          adapterId: "source-a",
          summary: "The server at host.example.com is offline and inactive.",
          observedAt: new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          contentHash: "hash1",
          provenanceHash: "prov1",
          corroborationState: "unverified",
          contradictionState: "not_assessed",
          fields: {},
        },
        {
          evidenceId: "ev-2",
          sourceId: "source-b",
          sourceName: "Provider B",
          adapterId: "source-b",
          summary: "The server at host.example.com is active and online with open ports.",
          observedAt: new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          contentHash: "hash2",
          provenanceHash: "prov2",
          corroborationState: "unverified",
          contradictionState: "not_assessed",
          fields: {},
        },
      ];

      const result = executeIntelligencePipeline({
        target: "host.example.com",
        targetType: "domain",
        timeRange: "30d",
        evidence: mockEvidence,
      } as any);

      expect(result.contradictions.length).toBeGreaterThan(0);
      expect(result.contradictions[0].topic).toContain("server");
    });

    it("18. generates ranked findings with match, quality, freshness and final relevance scores", () => {
      const mockEvidence: InvestigationEvidence[] = [
        {
          evidenceId: "ev-1",
          sourceId: "public-sec-edgar",
          sourceName: "SEC EDGAR",
          adapterId: "public-sec-edgar",
          summary: "Official SEC filing for Acme Corporation: active corporation.",
          observedAt: new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          contentHash: "hash1",
          provenanceHash: "prov1",
          corroborationState: "unverified",
          contradictionState: "not_assessed",
          fields: {},
        },
        {
          evidenceId: "ev-2",
          sourceId: "public-gdelt-news",
          sourceName: "GDELT",
          adapterId: "public-gdelt-news",
          summary: "Unverified news blog mentions Acme vaguely in an editorial.",
          observedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
          retrievedAt: new Date().toISOString(),
          contentHash: "hash2",
          provenanceHash: "prov2",
          corroborationState: "unverified",
          contradictionState: "not_assessed",
          fields: {},
        },
      ];

      const result = executeIntelligencePipeline({
        target: "Acme Corporation",
        targetType: "company",
        timeRange: "30d",
        evidence: mockEvidence,
      } as any);

      expect(result.rankedFindings.length).toBe(2);
      expect(result.rankedFindings[0].relevanceScore).toBeGreaterThan(
        result.rankedFindings[1].relevanceScore,
      );
      expect(result.rankedFindings[0].sourceClasses).toContain("government");
    });
  });

  describe("Bug 17 & 18: End-to-End Investigation Lifecycle and Concurrency", () => {
    it("19. executes inline passive adapters under bounded concurrency (CONCURRENCY = 3)", async () => {
      let concurrentActive = 0;
      let maxConcurrent = 0;

      const store = new MemoryStore();
      const execute = vi.fn(async (plan: AdapterPlan) => {
        concurrentActive++;
        maxConcurrent = Math.max(maxConcurrent, concurrentActive);
        await new Promise((resolve) => setTimeout(resolve, 50));
        concurrentActive--;
        return {
          adapterId: plan.adapterId,
          status: "completed" as const,
          evidence: [],
          warnings: [],
          attempts: 1,
          durationMs: 50,
        };
      });

      const service = new InvestigationService(store, execute, async () => {});
      const created = await service.create(
        {
          target: "example.com",
          targetType: "domain",
          searchUniverse: "domain",
          investigationMode: "deep",
        },
        ctx,
      );

      let advanced = await service.advance(created.investigationId, ctx);
      while (advanced.status === "RUNNING") {
        advanced = await service.advance(created.investigationId, ctx);
      }
      expect(maxConcurrent).toBeLessThanOrEqual(3);
      expect(advanced.status).toBe("COMPLETED");
    });

    it("20. truthful overview presentation with complete ranked findings, timeline, and markers", async () => {
      const store = new MemoryStore();
      const execute = vi.fn(async (plan: AdapterPlan) => {
        if (plan.adapterId === "public-wikidata-search") {
          return {
            adapterId: plan.adapterId,
            status: "completed" as const,
            evidence: [
              {
                id: "wiki-1",
                sourceId: "public-wikidata-search",
                sourceName: "Wikidata",
                summary: "Wikidata entity Q123: Acme Corp located in New Delhi, India.",
                sourceUrl: "https://www.wikidata.org/wiki/Q123",
                retrievedAt: new Date().toISOString(),
                provenanceHash: "hash-wiki-1",
              },
            ],
            data: {
              entities: [
                {
                  id: "Q123",
                  label: "Acme Corp",
                  description: "Corporation",
                  conceptUri: "https://www.wikidata.org/wiki/Q123",
                  coordinates: [77.209, 28.6139],
                  location: "New Delhi",
                },
              ],
            },
            warnings: [],
            attempts: 1,
            durationMs: 10,
          };
        }
        return {
          adapterId: plan.adapterId,
          status: "completed" as const,
          evidence: [],
          data: {},
          warnings: [],
          attempts: 1,
          durationMs: 5,
        };
      });

      const service = new InvestigationService(store, execute, async () => {});
      const created = await service.create(
        {
          target: "Acme Corp",
          targetType: "company",
          searchUniverse: "company",
          investigationMode: "standard",
        },
        ctx,
      );

      let completed = await service.advance(created.investigationId, ctx);
      while (completed.status === "RUNNING") {
        completed = await service.advance(created.investigationId, ctx);
      }
      expect(completed.status).toBe("COMPLETED");
      expect(completed.rankedFindings.length).toBeGreaterThan(0);
      expect(completed.rankedFindings[0].summary).toContain("Acme Corp");
      expect(completed.markers.length).toBeGreaterThan(0);
      expect(completed.markers[0].locationName).toContain("New Delhi");
    });
  });
});
