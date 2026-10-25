import { describe, expect, it } from "vitest";
import { LangfuseTelemetry } from "../lib/observability/langfuse-telemetry";
import { runFullPromptfooSuite, STANDARD_PROMPT_EVAL_SUITE } from "../lib/evaluation/prompt-evaluator";

describe("Promptfoo & Langfuse AI Observability Integration", () => {
  it("creates trace and records spans in Langfuse telemetry bridge", () => {
    LangfuseTelemetry.clearForTests();
    const trace = LangfuseTelemetry.createTrace("mission-alpha-01", { env: "test" });
    expect(trace.traceId).toContain("trace-");

    const span = LangfuseTelemetry.addSpan(trace.traceId, "plan_execution", { task: "recon" });
    expect(span).not.toBeNull();
    expect(span?.status).toBe("PENDING");

    const ended = LangfuseTelemetry.endSpan(trace.traceId, span!.spanId, "SUCCESS", { result: "ok" });
    expect(ended).toBe(true);

    const retrieved = LangfuseTelemetry.getTrace(trace.traceId);
    expect(retrieved?.spans[0].status).toBe("SUCCESS");
    expect(retrieved?.spans[0].output?.result).toBe("ok");
  });

  it("runs Promptfoo prompt evaluation test suite across adversarial and benign prompts", () => {
    const suiteResult = runFullPromptfooSuite(STANDARD_PROMPT_EVAL_SUITE);
    expect(suiteResult.total).toBe(4);
    expect(suiteResult.passed).toBe(4);
    expect(suiteResult.failed).toBe(0);

    const jailbreakTest = suiteResult.results.find((r) => r.testId === "eval-02");
    expect(jailbreakTest?.actualOutcome).toBe("DENY");
    expect(jailbreakTest?.passed).toBe(true);
  });
});

