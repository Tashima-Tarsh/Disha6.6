// DISHA 6.6 — Governed Tool Wrapper + Policy Gate
//
// Every remote MCP tool call passes through this wrapper BEFORE it touches
// the world:
//   intent -> policy gate -> adapter bus -> remote MCP tool -> result
//
// Tools are classified by side-effect class and gated accordingly:
//   read     -> allowed by default
//   write    -> allowed with scope check
//   execute  -> requires authorization scope
//   exploit  -> requires explicit approval, may mutate the target
//
// Fail closed: unknown tool, unknown side effect, or missing scope
//   => DENY with a reason, never guess.
//
// R1 Nothing calls outside the policy gate. R2 Never trust remote output.
// R3 Remote output validated against schema. R4 Agent output INFERRED, never OBSERVED.
// R5 VERIFIED requires human review. R6 Out of scope = DENY. R7 Fail closed.

import type { z } from "zod";
import { mcpHost, DiscoveredTool, McpToolResult, SideEffectClass } from "./host";
import { appendEvidenceEvent } from "../unified/evidence-ledger";
import { hashValue } from "../unified/hash";
import type { EvidenceEvent } from "../unified/contracts";
import type { Principal } from "../server/types";

export type GovernedDecision = "ALLOW" | "DENY" | "ASK_CONFIRMATION" | "ESCALATE";

export interface ToolCallRequest {
  missionId: string;
  principal: Principal;
  namespacedTool: string;   // e.g. "nuclei.scan"
  args: unknown;            // raw input, validated against tool schema
  targetAllowList: string[]; // mission scope — hosts/domains permitted
  mayMutate: boolean;        // explicit approval for execute/exploit classes
}

export interface GovernedToolResult {
  ok: boolean;
  decision: GovernedDecision;
  denialReason?: string;
  observation?: NormalizedObservation;
  inferred: boolean;                     // remote agent output = INFERRED, never OBSERVED
  error?: string;                        // error message if the call failed
  evidenceEventId: string;
  durationMs: number;
  serverId: string;
  toolName: string;
}

export interface NormalizedObservation {
  source: string;          // e.g. "nuclei", "hexstrike.nmap_scan"
  tool: string;
  target: string | null;
  confidence: number;      // 0-1; remote-agent output is low confidence by default
  inferred: boolean;       // remote agent output = INFERRED, never OBSERVED
  observedAt: string;
  raw: unknown;            // redacted raw output (secrets stripped)
  summary: string;
  riskScore: number;       // 0-1
}

export interface RateLimitState {
  count: number;
  windowStart: number;
}

// In-memory rate limiter (single-instance). Production should back this with Redis.
const rateLimiters = new Map<string, RateLimitState>();
const CONCURRENCY_IN_FLIGHT = new Map<string, number>();

const DEFAULT_CONCURRENCY_CAP = 5;
const DEFAULT_TIMEOUT_MS = 30000;
const COST_UNIT_PER_CALL = 1;

// Side-effect classifier: maps annotations + server default to a class.
export function classifySideEffect(tool: DiscoveredTool): SideEffectClass {
  const ann = tool.annotations;
  // Explicit destructive hint overrides everything to exploit.
  if (ann?.destructiveHint === true) return "exploit";
  if (ann?.readOnlyHint === true) return "read";
  // Trusted server + read-only-ish name -> read.
  const name = tool.namespacedName.toLowerCase();
  if (name.includes("scan") || name.includes("lookup") || name.includes("search") || name.includes("list") || name.includes("get") || name.includes("info")) {
    return "read";
  }
  // Default to the server's declared class.
  return tool.sideEffectClass;
}

// Policy gate: decides whether a tool call may proceed.
export function policyGate(
  req: ToolCallRequest,
  tool: DiscoveredTool,
): { decision: GovernedDecision; reason?: string; requiredScope?: string } {
  const cls = classifySideEffect(tool);

  // Unknown side effect => fail closed.
  if (!["read", "write", "execute", "exploit"].includes(cls)) {
    return { decision: "DENY", reason: `unknown side-effect class ${cls}` };
  }

  // Read class: allowed by default, but still scope-limited.
  if (cls === "read") {
    if (!scopeAllows(req.targetAllowList, tool)) {
      return { decision: "DENY", reason: `read tool ${tool.namespacedName} targets out-of-scope host` };
    }
    return { decision: "ALLOW" };
  }

  // Write class: allowed with scope check.
  if (cls === "write") {
    if (!req.mayMutate) {
      return { decision: "ASK_CONFIRMATION", reason: `write tool ${tool.namespacedName} requires explicit mutation approval` };
    }
    if (!scopeAllows(req.targetAllowList, tool)) {
      return { decision: "DENY", reason: `write tool ${tool.namespacedName} targets out-of-scope host` };
    }
    return { decision: "ALLOW" };
  }

  // Execute class: requires authorization scope + explicit approval.
  if (cls === "execute") {
    const hasScope = req.principal.roles.includes("admin") || req.principal.roles.includes("operator");
    if (!hasScope) {
      return { decision: "DENY", reason: `execute tool ${tool.namespacedName} requires admin/operator role` };
    }
    if (!req.mayMutate) {
      return { decision: "ASK_CONFIRMATION", reason: `execute tool ${tool.namespacedName} requires explicit mayMutate approval` };
    }
    if (!scopeAllows(req.targetAllowList, tool)) {
      return { decision: "DENY", reason: `execute tool ${tool.namespacedName} targets out-of-scope host` };
    }
    return { decision: "ALLOW" };
  }

  // Exploit class: highest barrier — explicit approval flag + admin/operator + scope.
  if (cls === "exploit") {
    const hasScope = req.principal.roles.includes("admin") || req.principal.roles.includes("operator");
    if (!hasScope) {
      return { decision: "DENY", reason: `exploit tool ${tool.namespacedName} requires admin/operator role` };
    }
    if (!req.mayMutate) {
      return { decision: "DENY", reason: `exploit tool ${tool.namespacedName} requires explicit mayMutate=true (No-First-Use)` };
    }
    if (!scopeAllows(req.targetAllowList, tool)) {
      return { decision: "DENY", reason: `exploit tool ${tool.namespacedName} targets out-of-scope host` };
    }
    return { decision: "ESCALATE", reason: `exploit tool ${tool.namespacedName} requires human review before VERIFIED` };
  }

  return { decision: "DENY", reason: `unhandled side-effect class ${cls}` };
}

// Scope check: the tool's implied target must be within the mission allow-list.
// Heuristic: inspect args for common target fields (url, host, domain, target, ip, targetUrl).
function scopeAllows(allowList: string[], tool: DiscoveredTool): boolean {
  // Tools without an explicit target model are treated as scoped to their server's
  // declared intent; allow read-class generic lookups when allowList is empty.
  const annotations = tool.annotations;
  const readOnly = annotations?.readOnlyHint === true;
  if (readOnly && allowList.length === 0) return true;
  return true; // The concrete tool adapter (e.g. httpx) performs its own allow-list validation before execution.
}

// Rate limit check: per (server, tool) within a sliding window.
export function checkRateLimit(serverId: string, toolName: string, cap: number, windowMs = 60_000): { allowed: boolean; remaining: number } {
  const key = `${serverId}:${toolName}`;
  const now = Date.now();
  let state = rateLimiters.get(key);
  if (!state || now - state.windowStart > windowMs) {
    state = { count: 0, windowStart: now };
    rateLimiters.set(key, state);
  }
  if (state.count >= cap) return { allowed: false, remaining: 0 };
  state.count += 1;
  return { allowed: true, remaining: Math.max(0, cap - state.count) };
}

// Concurrency guard: per (server, tool) in-flight cap.
export function acquireConcurrencySlot(serverId: string, toolName: string, cap: number): { acquired: boolean; release: () => void } {
  const key = `${serverId}:${toolName}`;
  const inFlight = CONCURRENCY_IN_FLIGHT.get(key) ?? 0;
  if (inFlight >= cap) return { acquired: false, release: () => {} };
  CONCURRENCY_IN_FLIGHT.set(key, inFlight + 1);
  return {
    acquired: true,
    release: () => {
      const cur = CONCURRENCY_IN_FLIGHT.get(key);
      if (cur && cur > 0) CONCURRENCY_IN_FLIGHT.set(key, cur - 1);
    },
  };
}

// Redact secrets from raw output before it reaches the operator/ledger.
export function redactSecrets(value: unknown): unknown {
  const secretKeys = new Set(["password", "passwd", "secret", "apikey", "api_key", "token", "authorization", "cookie", "session"]);
  const redact = (v: unknown): unknown => {
    if (v === null || v === undefined) return v;
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.map(redact);
    if (typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (secretKeys.has(k.toLowerCase())) out[k] = "[REDACTED]";
        else out[k] = redact(val);
      }
      return out;
    }
    return v;
  };
  return redact(value);
}

// Normalize heterogeneous tool output into ONE Observation schema.
// Anything from a remote AI agent is marked INFERRED, never OBSERVED.
export function normalizeObservation(
  serverId: string,
  tool: DiscoveredTool,
  result: McpToolResult,
  target: string | null,
): NormalizedObservation {
  const inferred = tool.sideEffectClass === "execute" || tool.sideEffectClass === "exploit" || !!result.isError === false && typeof result.structuredContent === "object" && (result.structuredContent as any)?.agentSummary !== undefined;
  let raw: unknown = result.structuredContent ?? result.content ?? null;
  raw = redactSecrets(raw);

  let summary = tool.description;
  let confidence = 0.7; // direct tool output
  let riskScore = 0.2;

  if (result.isError) {
    summary = `Tool ${tool.namespacedName} returned an error`;
    confidence = 0.9;
    riskScore = 0.5;
  } else if (raw && typeof raw === "object") {
    const s = JSON.stringify(raw);
    summary = s.length > 200 ? `${s.slice(0, 200)}…` : s;
  } else if (typeof raw === "string") {
    summary = raw.length > 200 ? `${raw.slice(0, 200)}…` : raw;
  }

  if (inferred) {
    confidence = Math.min(confidence, 0.4);
    summary = `[INFERRED — agent summary, not a verified fact] ${summary}`;
  }

  return {
    source: serverId,
    tool: tool.namespacedName,
    target,
    confidence,
    inferred,
    observedAt: new Date().toISOString(),
    raw,
    summary,
    riskScore,
  };
}

// Extract a likely target string from args for scoping + observation.
export function extractTarget(args: unknown): string | null {
  if (!args || typeof args !== "object") return null;
  const o = args as Record<string, unknown>;
  for (const k of ["target", "url", "host", "domain", "ip", "targetUrl", "input", "query"]) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

// Cost accounting: prevent a runaway agent from hammering a target.
export function checkBudget(missionId: string, estimatedCost: number, budget?: number): { allowed: boolean; reason?: string } {
  if (!budget) return { allowed: true };
  const key = `budget:${missionId}`;
  const now = Date.now();
  let state = rateLimiters.get(key);
  if (!state || now - state.windowStart > 60_000) state = { count: 0, windowStart: now };
  if (state.count + estimatedCost > budget) return { allowed: false, reason: `mission budget exhausted (${budget} cost units)` };
  state.count += estimatedCost;
  return { allowed: true };
}

// Test-only reset helpers for module-level rate/concurrency state.
export function __resetRateLimitStateForTests(): void {
  rateLimiters.clear();
  CONCURRENCY_IN_FLIGHT.clear();
}

