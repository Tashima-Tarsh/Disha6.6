import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatefulInvestigationGraph } from "../lib/server/agent/langchain-pipeline";
import { UniversalModelGateway } from "../lib/unified/model-gateway";

describe("StatefulInvestigationGraph", () => {
  beforeEach(() => {
    vi.spyOn(UniversalModelGateway, "execute").mockResolvedValue({
      message: "Analysis complete",
      model: "qwen2.5:7b",
      provider: "ollama.local",
      isLocal: true,
      confidence: 0.95,
      reasoning: "Verified identity consistency confirmed across authoritative registers.",
      durationMs: 120,
      capabilitiesUsed: ["reasoning"],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("progresses through Perceive, Attend, and Reason stages and halts at Human Approval Gate", async () => {
    let state = StatefulInvestigationGraph.initialize("Nitish Kumar", "person_name");
    expect(state.stage).toBe("perceive");
    expect(state.requiresHumanApproval).toBe(false);

    state = await StatefulInvestigationGraph.perceive(state);
    expect(state.stage).toBe("attend");

    state = await StatefulInvestigationGraph.attend(state, [
      { source: "Wikidata", claim: "Indian politician, Chief Minister of Bihar", verified: true },
      { source: "GDELT", claim: "Global news coverage 2024-2026", verified: true },
    ]);
    expect(state.stage).toBe("reason");
    expect(state.evidenceFindings.length).toBe(2);
    expect(state.evidenceFindings[0].hash).toBeDefined();

    state = await StatefulInvestigationGraph.reason(state);
    expect(state.stage).toBe("approval_gate");
    expect(state.requiresHumanApproval).toBe(true);
    expect(state.humanApprovalGranted).toBe(false);

    // Attempting Act before approval must fail
    await expect(StatefulInvestigationGraph.act(state)).rejects.toThrow(/Human approval gate/);

    // Operator grants human approval
    state = StatefulInvestigationGraph.approve(state, "lead.analyst@disha.defense");
    expect(state.stage).toBe("act");
    expect(state.humanApprovalGranted).toBe(true);

    // Finalize Act
    state = await StatefulInvestigationGraph.act(state);
    expect(state.stage).toBe("completed");
    expect(state.courtBrief).toContain("Section 63 BSA Investigation Dossier");
    expect(state.courtBrief).toContain("SHA-256");
  }, 20000);
});
