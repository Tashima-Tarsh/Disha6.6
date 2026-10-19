import { describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "../lib/server/env";
import { applyTokenEconomy, estimateInputTokens } from "../lib/server/agent/tokenEconomy";

describe("token economy", () => {
  it("estimates tokens deterministically", () => {
    expect(estimateInputTokens({ messages: [{ role: "user", content: "abcd" }] })).toBeGreaterThan(0);
  });

  it("does not compact when messages are under budget", () => {
    vi.stubEnv("DISHA_AGENT_MODE", "balanced");
    vi.stubEnv("DISHA_AGENT_INPUT_BUDGET_TOKENS", "10000");
    resetEnvForTests();
    const { decision, body } = applyTokenEconomy({
      messages: [
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi" },
      ],
    });
    expect(decision.compacted).toBe(false);
    expect(Array.isArray(body.messages)).toBe(true);
  });

  it("compacts large conversations by inserting a system summary", () => {
    vi.stubEnv("DISHA_AGENT_MODE", "eco");
    vi.stubEnv("DISHA_AGENT_INPUT_BUDGET_TOKENS", "500");
    resetEnvForTests();
    const many = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: "x".repeat(200) }));
    const { decision, body } = applyTokenEconomy({ messages: many });
    expect(decision.compacted).toBe(true);
    expect(Array.isArray(body.messages)).toBe(true);
    const first = (body.messages as unknown[])[0] as { role?: unknown; content?: unknown };
    expect(first.role).toBe("system");
    expect(typeof first.content).toBe("string");
  });
});
