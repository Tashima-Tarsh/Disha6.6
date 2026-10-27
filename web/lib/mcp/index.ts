// DISHA 6.6 — MCP governed tool module barrel export
// Mount, govern, remember — upstream tools stay in their own processes.

export { mcpHost, McpHostClient, type McpServerEntry, type DiscoveredTool, type McpToolResult, type SideEffectClass } from "./host";
export {
  executeGovernedTool,
  type ExecuteGovernedToolInput,
  type ExecuteGovernedToolOutput,
  type GovernedToolResult,
  type NormalizedObservation,
  type ToolCallRequest,
  classifySideEffect,
  policyGate,
  checkRateLimit,
  acquireConcurrencySlot,
  checkBudget,
  redactSecrets,
  normalizeObservation,
  extractTarget,
  __resetRateLimitStateForTests,
} from "./execute";
export { emitToolCallEvidence, type ToolCallEvidenceInput } from "./evidence-emitter";
