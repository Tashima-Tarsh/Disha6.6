// DISHA 6.6 — Evidence Emitter for governed MCP tool calls
//
// Every tool call, denial, failure, and timeout is written to the existing
// hash-chained Evidence Ledger (evidence-ledger.ts). This is DISHA's identity:
// HexStrike runs 150 tools and forgets; DISHA mounts the same tools and keeps
// a tamper-evident chain of what happened.
//
// R6: Every call is evidence-logged, including denials and failures.
// R8: Every outcome is evidence — including failures and denials.

import type { GovernedToolResult, NormalizedObservation } from "./governed-tool";
import type { DiscoveredTool } from "./host";
import { appendEvidenceEvent } from "../unified/evidence-ledger";
import type { EvidenceEvent, PolicyDecision } from "../unified/contracts";
import type { Principal } from "../server/types";

export interface ToolCallEvidenceInput {
  missionId: string;
  principal: Principal;
  tool: DiscoveredTool;
  namespacedTool: string;
  args: unknown;                // redacted input
  target: string | null;
  decision: GovernedToolResult["decision"];
  denialReason?: string;
  observation?: NormalizedObservation;
  inferred: boolean;
  durationMs: number;
  error?: string;
}

export async function emitToolCallEvidence(input: ToolCallEvidenceInput): Promise<EvidenceEvent> {
  const action = input.decision === "DENY" ? "mcp.tool.denied" : input.error ? "mcp.tool.failed" : "mcp.tool.called";

  const policyDecision = {
    decision: (input.decision === "DENY" || input.decision === "ESCALATE" ? "DENY" : "ALLOW") as PolicyDecision["decision"],
    reasons: input.denialReason ? [input.denialReason] : [],
    riskScore: input.observation?.riskScore ?? 0,
    requiredApprovals: input.decision === "ESCALATE" || input.decision === "ASK_CONFIRMATION" ? ["human_review"] : [],
    evidenceEventId: undefined,
    safeFallback: input.decision === "DENY" ? "tool_not_executed" : "execute",
  };

  const ledgerInput = {
    missionId: input.missionId,
    actor: input.principal.userId,
    action,
    input: {
      tool: input.namespacedTool,
      server: input.tool.serverId,
      args: input.args,
      target: input.target,
      mayMutate: undefined, // not stored in args; kept out of evidence to avoid logging flags
    },
    output: input.error
      ? { error: input.error, inferred: input.inferred }
      : {
          observation: input.observation,
          inferred: input.inferred,
          decision: input.decision,
        },
    policyDecision,
    lensResults: input.inferred ? ["inferred_agent_output"] : undefined,
  };

  const event = await appendEvidenceEvent(ledgerInput);
  return event;
}

export function buildGovernedResult({
  decision,
  denialReason,
  observation,
  inferred,
  durationMs,
  serverId,
  toolName,
  ok,
  error,
}: {
  decision: GovernedToolResult["decision"];
  denialReason?: string;
  observation?: NormalizedObservation;
  inferred: boolean;
  durationMs: number;
  serverId: string;
  toolName: string;
  ok: boolean;
  error?: string;
}): GovernedToolResult {
  return {
    ok,
    decision,
    denialReason,
    observation,
    inferred,
    error,
    evidenceEventId: "", // filled by caller after ledger append
    durationMs,
    serverId,
    toolName,
  };
}
