/**
 * DISHA 6.6 Canonical Multi-Agent Runtime
 * Integrates Deep Agents & LangGraph state machine patterns.
 */
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { evaluatePolicy } from "@/lib/unified/policy-gate";
import type { DishaSignal, PolicyDecision } from "@/lib/unified/contracts";

export type AgentRole =
  | "mission-commander"
  | "research-osint"
  | "cognitive-analyst"
  | "cyber-analyst"
  | "security-testing"
  | "adversarial-reviewer"
  | "memory-curator"
  | "code-repair"
  | "evidence-verification"
  | "frontend-uiux"
  | "runtime-supervisor"
  | "human-review-coordinator";

export type SpecialistAgentDefinition = {
  id: AgentRole;
  name: string;
  purpose: string;
  modelRole: string;
  allowedTools: string[];
  skills: string[];
  permissionBoundary: string;
  timeoutMs: number;
  retryLimit: number;
  requiresHumanReview: boolean;
};

export const CANONICAL_SPECIALISTS: Record<AgentRole, SpecialistAgentDefinition> = {
  "mission-commander": {
    id: "mission-commander",
    name: "Mission Commander",
    purpose: "Decompose mission goals, coordinate specialist agent handoffs, synthesize evidence briefs.",
    modelRole: "orchestration",
    allowedTools: ["planner", "policy_evaluator", "evidence_logger"],
    skills: ["agent-workflow-designer", "agent-decision-receipts"],
    permissionBoundary: "Governed orchestration only; cannot execute shell commands or bypass policy.",
    timeoutMs: 30000,
    retryLimit: 2,
    requiresHumanReview: false,
  },
  "research-osint": {
    id: "research-osint",
    name: "Research and OSINT Agent",
    purpose: "Passive public reconnaissance, domain, IP, breach, and entity intelligence gathering.",
    modelRole: "analysis",
    allowedTools: ["osint_collector_bus", "crtsh", "dns_lookup", "wayback", "ip_lookup"],
    skills: ["deep-research", "osint-investigation"],
    permissionBoundary: "Passive public OSINT only; active offensive probing is strictly denied.",
    timeoutMs: 45000,
    retryLimit: 3,
    requiresHumanReview: false,
  },
  "cognitive-analyst": {
    id: "cognitive-analyst",
    name: "Cognitive Analyst",
    purpose: "Formulate hypotheses, identify contradictions, assess source credibility and uncertainty.",
    modelRole: "reasoning",
    allowedTools: ["contradiction_engine", "source_verifier", "graph_reasoner"],
    skills: ["contradiction-analysis", "hypothesis-testing"],
    permissionBoundary: "Advisory analysis only; cannot fabricate missing evidence.",
    timeoutMs: 30000,
    retryLimit: 1,
    requiresHumanReview: false,
  },
  "cyber-analyst": {
    id: "cyber-analyst",
    name: "Cybersecurity Analyst",
    purpose: "Defensive telemetry correlation, CVE mapping, MITRE ATT&CK alignment, and Vyuha posture.",
    modelRole: "cyber",
    allowedTools: ["cve_db", "threatfox", "vyuha_defensive_engine"],
    skills: ["threat-detection", "senior-security"],
    permissionBoundary: "No-First-Use defensive posture only; offensive retaliation denied.",
    timeoutMs: 30000,
    retryLimit: 2,
    requiresHumanReview: false,
  },
  "security-testing": {
    id: "security-testing",
    name: "Authorized Security Testing Agent",
    purpose: "Execute authorized vulnerability assessments against pre-approved owned infrastructure.",
    modelRole: "security_tester",
    allowedTools: ["nuclei_scanner", "semgrep_scanner", "trivy_scanner"],
    skills: ["security-pen-testing", "vulnerability-assessment"],
    permissionBoundary: "Target must be strictly in authorized testing scope (localhost/owned-lab only).",
    timeoutMs: 60000,
    retryLimit: 1,
    requiresHumanReview: true,
  },
  "adversarial-reviewer": {
    id: "adversarial-reviewer",
    name: "Adversarial Reviewer",
    purpose: "Challenge findings, detect confirmation bias, test prompt injection resistance, red-team claims.",
    modelRole: "critique",
    allowedTools: ["bias_detector", "promptfoo_evaluator"],
    skills: ["adversarial-reviewer", "prompt-injection-defense"],
    permissionBoundary: "Critique and robustness testing; cannot mutate underlying evidence records.",
    timeoutMs: 25000,
    retryLimit: 1,
    requiresHumanReview: false,
  },
  "memory-curator": {
    id: "memory-curator",
    name: "Memory Curator",
    purpose: "Tiered persistent memory maintenance, semantic deduplication, and stale belief invalidation.",
    modelRole: "memory",
    allowedTools: ["letta_memory_store", "graphiti_temporal_graph"],
    skills: ["agent-memory", "memory-engineering"],
    permissionBoundary: "Only verified evidence summaries and open records can be curated.",
    timeoutMs: 20000,
    retryLimit: 2,
    requiresHumanReview: false,
  },
  "code-repair": {
    id: "code-repair",
    name: "Code Repair Agent",
    purpose: "Autonomous defect reproduction, test generation, patch drafting, and regression evaluation.",
    modelRole: "engineering",
    allowedTools: ["superpowers_tdd", "openhands_patcher", "test_runner"],
    skills: ["zero-hallucination-coder", "systematic-debugging"],
    permissionBoundary: "Cannot deploy unapproved code to production without human verification.",
    timeoutMs: 60000,
    retryLimit: 2,
    requiresHumanReview: true,
  },
  "evidence-verification": {
    id: "evidence-verification",
    name: "Evidence Verification Agent",
    purpose: "Cryptographic hash-chain auditing, tamper detection, and legal admissibility checks.",
    modelRole: "audit",
    allowedTools: ["hash_chain_verifier", "court_admissibility_checker"],
    skills: ["agent-decision-receipts", "evidence-provenance"],
    permissionBoundary: "Read-only verification of cryptographic evidence ledger.",
    timeoutMs: 15000,
    retryLimit: 1,
    requiresHumanReview: false,
  },
  "frontend-uiux": {
    id: "frontend-uiux",
    name: "Frontend UI/UX Engineer",
    purpose: "Design system validation, accessibility auditing, layout composition, and interactive DAGs.",
    modelRole: "frontend",
    allowedTools: ["a11y_auditor", "design_tokens_engine"],
    skills: ["ui-ux-pro-max", "design-system", "a11y-audit"],
    permissionBoundary: "Web presentation layer only.",
    timeoutMs: 20000,
    retryLimit: 1,
    requiresHumanReview: false,
  },
  "runtime-supervisor": {
    id: "runtime-supervisor",
    name: "Runtime Supervisor",
    purpose: "Monitor worker health, manage timeouts, trigger automated circuit breakers on failure.",
    modelRole: "supervisor",
    allowedTools: ["health_checker", "temporal_workflow_lease"],
    skills: ["observability-designer", "resilience-monitor"],
    permissionBoundary: "Service telemetry and circuit breaker enforcement.",
    timeoutMs: 15000,
    retryLimit: 3,
    requiresHumanReview: false,
  },
  "human-review-coordinator": {
    id: "human-review-coordinator",
    name: "Human Review Coordinator",
    purpose: "Queue high-risk or ambiguous actions for human operator approval with evidence receipts.",
    modelRole: "governance",
    allowedTools: ["analyst_review_queue", "evidence_signer"],
    skills: ["human-in-the-loop", "governance-audit"],
    permissionBoundary: "Enforces human sign-off before consequential or classified actions.",
    timeoutMs: 30000,
    retryLimit: 1,
    requiresHumanReview: false,
  },
};

export type MissionExecutionPlan = {
  missionId: string;
  intent: string;
  selectedAgents: AgentRole[];
  policyDecision: PolicyDecision;
  state: "PLANNED" | "EXECUTING" | "COMPLETED" | "ESCALATED" | "BLOCKED";
  steps: Array<{
    agentRole: AgentRole;
    action: string;
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
    output?: Record<string, unknown>;
  }>;
};

export async function planMission(signal: DishaSignal): Promise<MissionExecutionPlan> {
  const policy = evaluatePolicy(signal);
  const raw = signal.input.rawText.toLowerCase();

  const selectedAgents: AgentRole[] = ["mission-commander"];

  if (raw.includes("domain") || raw.includes("ip") || raw.includes("osint") || raw.includes("breach") || raw.includes("recon")) {
    selectedAgents.push("research-osint");
  }
  if (raw.includes("cyber") || raw.includes("cve") || raw.includes("attack") || raw.includes("vuln")) {
    selectedAgents.push("cyber-analyst");
  }
  if (raw.includes("scan") || raw.includes("pentest") || raw.includes("audit")) {
    selectedAgents.push("security-testing");
  }
  if (raw.includes("code") || raw.includes("bug") || raw.includes("fix") || raw.includes("test")) {
    selectedAgents.push("code-repair");
  }

  // Always include Cognitive Analyst, Evidence Verification, and Memory Curator
  selectedAgents.push("cognitive-analyst", "evidence-verification", "memory-curator");

  if (policy.decision === "ESCALATE" || policy.decision === "DENY") {
    selectedAgents.push("human-review-coordinator");
  }

  const steps = selectedAgents.map((role) => ({
    agentRole: role,
    action: `execute_${role.replace(/-/g, "_")}`,
    status: "PENDING" as const,
  }));

  const plan: MissionExecutionPlan = {
    missionId: signal.missionId || `m-${Date.now()}`,
    intent: signal.intent,
    selectedAgents,
    policyDecision: policy,
    state: policy.decision === "DENY" ? "BLOCKED" : policy.decision === "ESCALATE" ? "ESCALATED" : "PLANNED",
    steps,
  };

  // Record mission plan event in Evidence Ledger
  try {
    await appendEvidenceEvent({
      missionId: plan.missionId,
      actor: signal.riskContext.userRole,
      action: "mission_planned",
      input: { rawText: signal.input.rawText, intent: signal.intent },
      output: { selectedAgents: plan.selectedAgents, state: plan.state },
      policyDecision: policy,
    });
  } catch {
    // Handled
  }

  return plan;
}

