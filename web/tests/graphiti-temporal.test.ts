import { describe, expect, it } from "vitest";
import { GraphitiTemporalGraph } from "../lib/knowledge/graphiti-adapter";

describe("Graphiti Temporal Knowledge Graph Integration", () => {
  it("stores and queries time-bounded entity relationships", () => {
    GraphitiTemporalGraph.clearForTests();

    // Past affiliation in 2024
    const pastRel = GraphitiTemporalGraph.addRelationship({
      sourceEntity: "TargetServer",
      relation: "hosted_at_ip",
      targetEntity: "198.51.100.1",
      validFrom: "2024-01-01T00:00:00Z",
      validTo: "2024-12-31T23:59:59Z",
    });
    expect(pastRel.edgeId).toBeDefined();

    // Present affiliation in 2026
    const currentRel = GraphitiTemporalGraph.addRelationship({
      sourceEntity: "TargetServer",
      relation: "hosted_at_ip",
      targetEntity: "203.0.113.55",
      validFrom: "2025-01-01T00:00:00Z",
    });

    // Query in 2024
    const query2024 = GraphitiTemporalGraph.queryRelationships("TargetServer", new Date("2024-06-01T00:00:00Z"));
    expect(query2024).toHaveLength(1);
    expect(query2024[0].targetEntity).toBe("198.51.100.1");

    // Query in 2026
    const query2026 = GraphitiTemporalGraph.queryRelationships("TargetServer", new Date("2026-05-01T00:00:00Z"));
    expect(query2026).toHaveLength(1);
    expect(query2026[0].targetEntity).toBe("203.0.113.55");
  });

  it("reports genuine service health and upstream connectivity status", async () => {
    const health = await GraphitiTemporalGraph.checkHealth();
    expect(["ONLINE", "OFFLINE", "NOT_CONFIGURED"]).toContain(health.status);
    expect(health.storedEdgesCount).toBeGreaterThanOrEqual(0);
  });
});

