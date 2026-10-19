import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UniversalModelGateway, KNOWN_MODEL_PROFILES } from "../lib/unified/model-gateway";
import { resetEnvForTests } from "../lib/server/env";

describe("UniversalModelGateway", () => {
  beforeEach(() => {
    UniversalModelGateway.setLocalOnlyMode(false);
    resetEnvForTests();
  });

  afterEach(() => {
    UniversalModelGateway.setLocalOnlyMode(false);
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetEnvForTests();
  });

  it("lists all known model profiles with capabilities and license metadata", async () => {
    const catalog = await UniversalModelGateway.discoverInstalledModels();
    expect(catalog.length).toBeGreaterThanOrEqual(10);

    const qwen = catalog.find((m) => m.id === "qwen2.5-coder-7b");
    expect(qwen).toBeDefined();
    expect(qwen?.license).toContain("Apache-2.0");
    expect(qwen?.capabilities.tool_calling).toBe(true);

    const deepseek = catalog.find((m) => m.id === "deepseek-r1-8b");
    expect(deepseek).toBeDefined();
    expect(deepseek?.license).toContain("MIT");
    expect(deepseek?.capabilities.reasoning).toBe(true);
  });

  it("validates requested capabilities accurately", () => {
    const deepseek = KNOWN_MODEL_PROFILES.find((m) => m.id === "deepseek-r1-8b")!;
    const check1 = UniversalModelGateway.validateCapabilities(deepseek, ["reasoning", "chat"]);
    expect(check1.valid).toBe(true);
    expect(check1.missing).toEqual([]);

    const check2 = UniversalModelGateway.validateCapabilities(deepseek, ["vision"]);
    expect(check2.valid).toBe(false);
    expect(check2.missing).toContain("vision");
  });

  it("strictly enforces local-only privacy mode and blocks cloud providers", async () => {
    UniversalModelGateway.setLocalOnlyMode(true);

    await expect(
      UniversalModelGateway.execute({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Analyze sensitive case target." }],
      })
    ).rejects.toThrow(/PRIVACY GATE/);
  });

  it("permits local models when local-only mode is active", async () => {
    UniversalModelGateway.setLocalOnlyMode(true);

    // Mock fetch to simulate local Ollama responding
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/api/chat")) {
          return new Response(
            JSON.stringify({
              message: {
                content: "<think>Verifying evidence ledger</think>Target analysis complete.",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify({ models: [] }), { status: 200 });
      })
    );

    const response = await UniversalModelGateway.execute({
      model: "deepseek-r1-8b",
      messages: [{ role: "user", content: "Synthesize target indicators." }],
      activeContext: {
        investigationTarget: "Test Target",
        targetType: "person_name",
        evidenceCount: 15,
      },
    });

    expect(response.isLocal).toBe(true);
    expect(response.message).toContain("Target analysis complete");
    expect(response.reasoning).toBe("Verifying evidence ledger");
  });

  it("reports unavailable local model routes without fabricating intelligence", async () => {
    UniversalModelGateway.setLocalOnlyMode(true);

    // Simulate network error to Ollama
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED 127.0.0.1:11434");
      })
    );

    const response = await (
      UniversalModelGateway.execute({
        model: "qwen2.5-coder-7b",
        messages: [{ role: "user", content: "Perform vulnerability inspection." }],
        activeContext: {
          investigationTarget: "203.0.113.5",
          targetType: "ip",
          evidenceCount: 7,
        },
      })
    );
    expect(response.provider).toBe("disha.sovereign.fallback");
    expect(response.isLocal).toBe(true);
    expect(response.confidence).toBe(0);
    expect(response.capabilitiesUsed).toEqual([]);
    expect(response.message).toContain("route is unavailable");
    expect(response.message).toContain("no evidence claim was generated");
    expect(response.message).toContain("[VERIFY REQUIRED]");
    expect(response.reasoning).toContain("Deterministic fallback only");
  });
});
