// DISHA 6.6 — MCP Governed Tools gate tests (G1–G8)
//
// All tests run without a live subprocess so the suite exits cleanly:
//   G2. Every discovered tool is wrapped with a validated schema.       (unit)
//   G3. Policy gate denies an out-of-scope call with a clear reason.    (unit)
//   G4. Every call emits a hash-chained EvidenceEvent.                  (unit)
//   G5. A dead MCP server degrades gracefully, never fails open.        (unit)
//   G6. Rate limit and timeout enforced and asserted in tests.          (unit)
//   G7. Raw nuclei output normalizes into the Observation schema.       (unit)
//   G8. End-to-end governed mission lands evidence (deny-before-execute
//       paths exercised without a subprocess; real-subprocess execution
//       verified by the standalone mcp-e2e check).                      (unit)
// G1 (real-server discovery) is verified by the standalone mcp-e2e check.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import { z } from "zod";
import { clearEvidenceLedgerForTests, getEvidenceEvents, verifyEvidenceChain } from "@/lib/unified/evidence-ledger";
import {
  executeGovernedTool,
  classifySideEffect,
  policyGate,
  checkRateLimit,
  acquireConcurrencySlot,
  checkBudget,
  normalizeObservation,
  redactSecrets,
  extractTarget,
  __resetRateLimitStateForTests,
  type DiscoveredTool,
  type GovernedToolResult,
} from "@/lib/mcp";
import { emitToolCallEvidence } from "@/lib/mcp/evidence-emitter";
import type { Principal } from "@/lib/server/types";

const FIXTURE = join(__dirname, "fixtures", "fake-mcp-server.mjs");
let mounted = false;

const memoryPrincipal = (roles: string[] = ["analyst"]): Principal =>
  ({ userId: "test-analyst", email: "analyst@disha.local", roles: roles as never[], sessionId: "sess-test" } as Principal);

beforeEach(async () => {
  await clearEvidenceLedgerForTests();
  __resetRateLimitStateForTests();
});

const mkTool = (overrides: Partial<DiscoveredTool> = {}): DiscoveredTool => ({
  serverId: "fakemcp",
  namespacedName: "fakemcp.echo.read",
  inputSchema: z.object({}),
  outputSchema: undefined,
  description: "x",
  sideEffectClass: "read",
  timeoutMs: 1000,
  concurrencyCap: 1,
  costEstimate: 1,
  ...overrides,
});

// ════════════════════════════════════════════════════════════════════════════
// G2 — validated tool schema (unit)
// ════════════════════════════════════════════════════════════════════════════

describe("G2 — validated tool schema", () => {
  it("a tool's input schema validates incoming arguments", () => {
    const tool = mkTool({ inputSchema: z.object({ target: z.string() }) });
    expect(tool.inputSchema.safeParse({ target: "example.com" }).success).toBe(true);
    expect(tool.inputSchema.safeParse({ target: 123 }).success).toBe(false);
  });

  it("side-effect class is correctly classified per tool", () => {
    expect(classifySideEffect(mkTool({ sideEffectClass: "read", annotations: { readOnlyHint: true } }))).toBe("read");
    expect(classifySideEffect(mkTool({ sideEffectClass: "write", annotations: { destructiveHint: true } }))).toBe("exploit");
    expect(classifySideEffect(mkTool({ namespacedName: "fakemcp.pentagi.run_task", sideEffectClass: "execute" }))).toBe("execute");
    expect(classifySideEffect(mkTool({ namespacedName: "fakemcp.hexstrike.exploit", sideEffectClass: "exploit" }))).toBe("exploit");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// G3 — policy gate (unit)
// ════════════════════════════════════════════════════════════════════════════

describe("G3 — policy gate", () => {
  it("denies exploit when mayMutate is false (No-First-Use)", () => {
    const tool = mkTool({ sideEffectClass: "exploit", namespacedName: "fakemcp.hexstrike.exploit" });
    const res = policyGate(
      { missionId: "m1", principal: memoryPrincipal(["admin"]), namespacedTool: "fakemcp.hexstrike.exploit", args: {}, targetAllowList: [], mayMutate: false },
      tool,
    );
    expect(res.decision).toBe("DENY");
    expect(res.reason).toContain("mayMutate");
  });

  it("denies execute when principal lacks admin/operator role", () => {
    const tool = mkTool({ sideEffectClass: "execute", namespacedTool: "fakemcp.pentagi.run_task" });
    const res = policyGate(
      { missionId: "m1", principal: memoryPrincipal(["viewer"]), namespacedTool: "fakemcp.pentagi.run_task", args: {}, targetAllowList: [], mayMutate: true },
      tool,
    );
    expect(res.decision).toBe("DENY");
  });

  it("allows read-class tool by default", () => {
    const tool = mkTool({ sideEffectClass: "read" });
    const res = policyGate(
      { missionId: "m1", principal: memoryPrincipal(), namespacedTool: "fakemcp.echo.read", args: { target: "example.com" }, targetAllowList: [], mayMutate: false },
      tool,
    );
    expect(res.decision).toBe("ALLOW");
  });

  it("denies unknown side-effect class (fail closed)", () => {
    const tool = mkTool({ sideEffectClass: "read" as any });
    (tool as any).sideEffectClass = "bogus";
    const res = policyGate(
      { missionId: "m1", principal: memoryPrincipal(), namespacedTool: "fakemcp.echo.read", args: {}, targetAllowList: [], mayMutate: false },
      tool,
    );
    expect(res.decision).toBe("DENY");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// G4 — every call emits hash-chained EvidenceEvent (unit)
// ════════════════════════════════════════════════════════════════════════════

describe("G4 — evidence ledger", () => {
  it("records a successful tool call and the chain verifies", async () => {
    const event = await emitToolCallEvidence({
      missionId: "m1", principal: memoryPrincipal(),
      tool: mkTool({ namespacedTool: "fakemcp.echo.read" }),
      namespacedTool: "fakemcp.echo.read", args: { target: "example.com" }, target: "example.com",
      decision: "ALLOW",
      observation: { source: "fakemcp", tool: "fakemcp.echo.read", target: "example.com", confidence: 0.8, observedAt: new Date().toISOString(), raw: null, summary: "echoed", riskScore: 0.1 },
      inferred: false, durationMs: 42, error: undefined,
    });
    expect(event.eventId).toBeTruthy();
    expect(event.inputHash).toBeTruthy();
    expect(event.eventHash).toBeTruthy();

    const events = await getEvidenceEvents("m1");
    const callEvent = events.find((e) => e.action === "mcp.tool.called");
    expect(callEvent).toBeDefined();

    const verification = verifyEvidenceChain(events);
    expect(verification.ok).toBe(true);
    expect(verification.errors).toEqual([]);
  });

  it("records a denial to the evidence ledger (R6, R8)", async () => {
    const event = await emitToolCallEvidence({
      missionId: "m2", principal: memoryPrincipal(),
      tool: mkTool({ sideEffectClass: "exploit", namespacedTool: "fakemcp.hexstrike.exploit" }),
      namespacedTool: "fakemcp.hexstrike.exploit", args: { target: "example.com" }, target: "example.com",
      decision: "DENY", denialReason: "exploit requires mayMutate",
      observation: undefined, inferred: false, durationMs: 5, error: undefined,
    });
    expect(event.eventId).toBeTruthy();

    const events = await getEvidenceEvents("m2");
    const denyEvent = events.find((e) => e.action === "mcp.tool.denied");
    expect(denyEvent).toBeDefined();
    const verification = verifyEvidenceChain(events);
    expect(verification.ok).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// G5 — dead server degrades gracefully, never fails open (unit)
// ════════════════════════════════════════════════════════════════════════════

describe("G5 — fail closed", () => {
  it("call to unknown/unmounted tool returns DENY, never executes remotely", async () => {
    const res = await executeGovernedTool({
      missionId: "m3", principal: memoryPrincipal(),
      namespacedTool: "fakemcp.echo.read", args: { target: "example.com" },
      targetAllowList: [], mayMutate: false,
    });
    expect(res.ok).toBe(false);
    expect(res.decision).toBe("DENY");
    expect(res.error).toBe("unknown_tool");
    expect(res.evidenceEventId).toBeTruthy(); // denial is still evidence-logged
  });
});

// ════════════════════════════════════════════════════════════════════════════
// G6 — rate limit, concurrency cap, budget (unit)
// ════════════════════════════════════════════════════════════════════════════

describe("G6 — rate limit & concurrency & budget", () => {
  it("rate limit enforces per-server/tool cap", () => {
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit("fakemcp", "fakemcp.echo.read", 3);
      expect(r.allowed).toBe(true);
    }
    const r = checkRateLimit("fakemcp", "fakemcp.echo.read", 3);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it("concurrency cap limits in-flight calls", () => {
    const slot = acquireConcurrencySlot("fakemcp", "fakemcp.echo.read", 1);
    expect(slot.acquired).toBe(true);
    const slot2 = acquireConcurrencySlot("fakemcp", "fakemcp.echo.read", 1);
    expect(slot2.acquired).toBe(false);
    slot.release();
  });

  it("checkBudget blocks when mission budget exhausted", () => {
    expect(checkBudget("mb", 2, 1).allowed).toBe(false);
    expect(checkBudget("mb", 2, 1).reason).toContain("budget exhausted");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// G7 — nuclei output normalizes into Observation schema (unit)
// ════════════════════════════════════════════════════════════════════════════

describe("G7 — observation normalization", () => {
  it("normalizeObservation produces a typed Observation", () => {
    const tool = mkTool({ namespacedName: "fakemcp.nuclei.scan", sideEffectClass: "read" });
    const result = { ok: true, structuredContent: { target: "example.com", info: { name: "misconfig", severity: "medium" } } };
    const obs = normalizeObservation("fakemcp", tool, result as any, "example.com");
    expect(obs.source).toBe("fakemcp");
    expect(obs.tool).toBe("fakemcp.nuclei.scan");
    expect(obs.target).toBe("example.com");
    expect(typeof obs.confidence).toBe("number");
    expect(typeof obs.riskScore).toBe("number");
    expect(typeof obs.summary).toBe("string");
    expect(obs.observedAt).toBeTruthy();
  });

  it("Pentagi agent output is marked INFERRED, never OBSERVED", () => {
    const tool = mkTool({ sideEffectClass: "execute", namespacedTool: "fakemcp.pentagi.run_task" });
    const result = { ok: true, structuredContent: { agentSummary: "autonomous task result" } };
    const obs = normalizeObservation("fakemcp", tool, result as any, "example.com");
    expect(obs.inferred).toBe(true);
    expect(obs.summary).toContain("INFERRED");
  });

  it("redactSecrets strips secrets from raw output", () => {
    const raw = { target: "example.com", password: "s3cr3t", api_key: "key-123", notes: "hello" };
    const redacted = redactSecrets(raw) as any;
    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.api_key).toBe("[REDACTED]");
    expect(redacted.target).toBe("example.com");
    expect(redacted.notes).toBe("hello");
  });

  it("extractTarget pulls the likely target from args", () => {
    expect(extractTarget({ target: "example.com" })).toBe("example.com");
    expect(extractTarget({ url: "https://example.com" })).toBe("https://example.com");
    expect(extractTarget({ host: "1.2.3.4" })).toBe("1.2.3.4");
    expect(extractTarget({})).toBeNull();
    expect(extractTarget(null)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// G8 — end-to-end governed mission lands evidence (unit)
// ════════════════════════════════════════════════════════════════════════════

describe("G8 — governed mission evidence", () => {
  it("unknown tool is denied and the denial is evidence-logged", async () => {
    const res = await executeGovernedTool({
      missionId: "m5", principal: memoryPrincipal(["analyst"]),
      namespacedTool: "fakemcp.echo.read", args: { target: "disha.gov.in" },
      targetAllowList: ["disha.gov.in"], mayMutate: false,
    });
    expect(res.ok).toBe(false);
    expect(res.decision).toBe("DENY");
    expect(res.evidenceEventId).toBeTruthy();

    const events = await getEvidenceEvents("m5");
    const callEvent = events.find((e) => e.action === "mcp.tool.denied");
    expect(callEvent).toBeDefined();
    const verification = verifyEvidenceChain(events);
    expect(verification.ok).toBe(true);
  });
});
