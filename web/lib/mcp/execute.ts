// DISHA 6.6 — MCP Governed Execution Entry Point
//
// Single egress for every mounted-tool call:
//   intent -> policy gate -> adapter bus -> remote MCP tool -> result
// Every call is hash-chained into the Evidence Ledger.
//
// R1 Nothing calls outside the policy gate. R5 Fail closed, always.
// R7 No tool gets unbounded concurrency or unbounded time. R8 Every outcome is evidence.

import { z } from "zod";
import { mcpHost, DiscoveredTool, McpToolResult } from "./host";
import {
  ToolCallRequest,
  GovernedToolResult,
  NormalizedObservation,
  classifySideEffect,
  policyGate,
  checkRateLimit,
  acquireConcurrencySlot,
  checkBudget,
  redactSecrets,
  normalizeObservation,
  extractTarget,
  __resetRateLimitStateForTests,
} from "./governed-tool";
import { emitToolCallEvidence, buildGovernedResult } from "./evidence-emitter";
import type { Principal } from "../server/types";

const DEFAULT_CONCURRENCY_CAP = 5;
const DEFAULT_TIMEOUT_MS = 30000;

export interface ExecuteGovernedToolInput extends Omit<ToolCallRequest, "principal"> {
  principal: Principal;
}

export interface ExecuteGovernedToolOutput extends GovernedToolResult {}

const DEFAULT_BUDGET = 1000; // cost units per mission

// Execute a namespaced MCP tool through the full governed spine.
export async function executeGovernedTool(input: ExecuteGovernedToolInput): Promise<ExecuteGovernedToolOutput> {
  const start = Date.now();
  const { missionId, principal, namespacedTool, args, targetAllowList = [], mayMutate = false } = input;

  // ── 1. Resolve the tool (fail closed on unknown tool) ─────────────────
  const tool = mcpHost.getTool(namespacedTool);
  if (!tool) {
    const result = buildGovernedResult({
      decision: "DENY", denialReason: `unknown tool ${namespacedTool}`,
      observation: undefined, inferred: false, durationMs: Date.now() - start,
      serverId: "", toolName: namespacedTool, ok: false, error: "unknown_tool",
    });
    const event = await emitToolCallEvidence({
      missionId, principal, tool: { serverId: "", namespacedName: namespacedTool, inputSchema: z.any(), outputSchema: undefined, description: "", sideEffectClass: "read", timeoutMs: 0, concurrencyCap: 1, costEstimate: 1, annotations: {} },
      namespacedTool, args: {}, target: null, decision: "DENY", denialReason: result.denialReason, observation: undefined, inferred: false, durationMs: result.durationMs, error: "unknown_tool",
    });
    return { ...result, evidenceEventId: event.eventId };
  }

  const serverId = tool.serverId;
  const entry = mcpHost.getServer(serverId);

  // ── 2. Rate limit + concurrency cap (R7) ─────────────────────────────
  const cap = tool.concurrencyCap ?? DEFAULT_CONCURRENCY_CAP;
  const rate = checkRateLimit(serverId, tool.namespacedName, cap);
  if (!rate.allowed) {
    const result = buildGovernedResult({
      decision: "DENY", denialReason: `rate limit exceeded for ${tool.namespacedName}`,
      observation: undefined, inferred: false, durationMs: Date.now() - start,
      serverId, toolName: tool.namespacedName, ok: false, error: "rate_limited",
    });
    const event = await emitToolCallEvidence({
      missionId, principal, tool, namespacedTool, args: redactSecrets(args), target: extractTarget(args),
      decision: "DENY", denialReason: result.denialReason, observation: undefined, inferred: false, durationMs: result.durationMs, error: "rate_limited",
    });
    return { ...result, evidenceEventId: event.eventId };
  }
  const slot = acquireConcurrencySlot(serverId, tool.namespacedName, cap);

  // ── 3. Budget check ──────────────────────────────────────────────────
  const budgetOk = checkBudget(missionId, tool.costEstimate ?? 1, entry?.budgetPerMission ?? DEFAULT_BUDGET);
  if (!budgetOk.allowed) {
    slot.release();
    const result = buildGovernedResult({
      decision: "DENY", denialReason: budgetOk.reason ?? "budget exhausted",
      observation: undefined, inferred: false, durationMs: Date.now() - start,
      serverId, toolName: tool.namespacedName, ok: false, error: "budget_exhausted",
    });
    const event = await emitToolCallEvidence({
      missionId, principal, tool, namespacedTool, args: redactSecrets(args), target: extractTarget(args),
      decision: "DENY", denialReason: result.denialReason, observation: undefined, inferred: false, durationMs: result.durationMs, error: "budget_exhausted",
    });
    return { ...result, evidenceEventId: event.eventId };
  }

  // ── 4. Policy gate (R1, R5, R6) ─────────────────────────────────────
  const gate = policyGate({ missionId, principal, namespacedTool, args, targetAllowList, mayMutate }, tool);
  const target = extractTarget(args);

  // Deny / ask-confirmation / escalate do not execute the remote tool.
  const isDenied = gate.decision !== "ALLOW";
  if (isDenied) {
    slot.release();
    const result = buildGovernedResult({
      decision: gate.decision, denialReason: gate.reason,
      observation: undefined, inferred: false, durationMs: Date.now() - start,
      serverId, toolName: tool.namespacedName, ok: false, error: isDenied ? gate.reason : undefined,
    });
    const event = await emitToolCallEvidence({
      missionId, principal, tool, namespacedTool, args: redactSecrets(args), target,
      decision: gate.decision, denialReason: gate.reason, observation: undefined, inferred: false, durationMs: result.durationMs, error: isDenied ? gate.reason : undefined,
    });
    return { ...result, evidenceEventId: event.eventId };
  }

  // ── 5. Execute the remote MCP tool with timeout (R7) ─────────────────
  let result: McpToolResult;
  let error: string | undefined;
  try {
    const serverEntry = mcpHost.getServer(serverId);
    if (!serverEntry) throw new Error(`MCP server ${serverId} not mounted`);
    const timeoutMs = tool.timeoutMs ?? serverEntry.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const exec = (): Promise<McpToolResult> => {
      switch (serverEntry.transport) {
        case "stdio":
          return mcpHost.callStdioTool(serverId, tool.namespacedName.split(".").slice(1).join("."), args);
        case "sse":
        case "streamable-http":
          return mcpHost.callHttpTool(serverEntry, tool.namespacedName.split(".").slice(1).join("."), args);
        default:
          throw new Error(`unsupported transport ${serverEntry.transport}`);
      }
    };

    result = await Promise.race([
      exec(),
      new Promise<McpToolResult>((_, rej) =>
        setTimeout(() => rej(new Error(`tool call timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]) as McpToolResult;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    result = { ok: false, error };
  } finally {
    slot.release();
  }

  const durationMs = Date.now() - start;

  // ── 6. Normalize output (R3, R4) ─────────────────────────────────────
  const observation = normalizeObservation(serverId, tool, result, target);

  // ── 7. Emit evidence to hash-chained ledger (R6, R8) ─────────────────
  const decision: GovernedToolResult["decision"] = result.ok && !error ? "ALLOW" : "DENY";
  const govResult = buildGovernedResult({
    decision, denialReason: error,
    observation, inferred: observation.inferred, durationMs,
    serverId, toolName: tool.namespacedName, ok: result.ok && !error, error,
  });
  const event = await emitToolCallEvidence({
    missionId, principal, tool, namespacedTool, args: redactSecrets(args), target,
    decision, denialReason: error, observation, inferred: observation.inferred, durationMs, error,
  });

  return { ...govResult, evidenceEventId: event.eventId };
}

export { mcpHost, classifySideEffect, policyGate, checkRateLimit, acquireConcurrencySlot, checkBudget, __resetRateLimitStateForTests, normalizeObservation, extractTarget, redactSecrets };
export type { DiscoveredTool, GovernedToolResult, NormalizedObservation, ToolCallRequest };
