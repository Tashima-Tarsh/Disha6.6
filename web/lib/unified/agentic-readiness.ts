import { openDataSources } from "./data-integration";
import { listGovernedExtensions } from "../extensions";
import { lensRegistry } from "./lenses";
import { listSourceRegistry } from "./source-registry";
import { getConstitutionalCore } from "./constitutional-core";

export type AgentSkillStatus = "ready" | "partial" | "blocked";

export type AgentSkillDefinition = {
  id: string;
  title: string;
  purpose: string;
  lensBinding?: keyof typeof lensRegistry;
  inputContract: string;
  outputContract: string;
  allowedData: string[];
  policyBoundary: string;
  evidenceBoundary: string;
  learningMode: "none" | "evidence_memory" | "supervised_connector" | "blocked";
  status: AgentSkillStatus;
  readinessScore: number;
  blockers: string[];
};

export type AgenticReadinessReport = {
  product: string;
  agenticMode: string;
  orchestrationContract: string;
  claudeBridge: {
    role: string;
    allowedEntryPoints: string[];
    deniedCapabilities: string[];
  };
  openSourceConnectorMesh: Array<{
    sourceId: string;
    sourceName: string;
    url?: string;
    accessMode: string;
  }>;
  learningBoundary: {
    allowed: string[];
    denied: string[];
    promotionRule: string;
  };
  uniqueArchitecture: {
    name: string;
    thesis: string;
    liveCapabilities: string[];
    nonGoals: string[];
  };
  constitutionalCore: ReturnType<typeof getConstitutionalCore>;
  readiness: {
    score: number;
    ready: number;
    partial: number;
    blocked: number;
  };
  skills: AgentSkillDefinition[];
};

const commonPolicyBoundary = "All use must pass through policy-gate.ts after lens analysis and before action.";
const commonEvidenceBoundary = "Every result must include evidence items and mission events in evidence-ledger.ts.";

function evaluateSkillReadiness(
  def: Omit<AgentSkillDefinition, "status" | "readinessScore"> & { hasActiveTests?: boolean },
): AgentSkillDefinition {
  const hasContract = Boolean(def.inputContract?.trim() && def.outputContract?.trim());
  const hasPolicyBoundary = Boolean(def.policyBoundary && def.policyBoundary.length >= 10);
  const hasEvidenceBoundary = Boolean(def.evidenceBoundary && def.evidenceBoundary.length >= 10);
  const hasNoBlockers = def.blockers.length === 0;

  // Operational criteria weightings (25% each)
  let score = 0;
  if (hasContract) score += 0.25;
  if (hasPolicyBoundary) score += 0.25;
  if (hasEvidenceBoundary) score += 0.25;
  if (hasNoBlockers) score += 0.25;

  let status: AgentSkillStatus = "ready";
  if (def.blockers.some((b) => /denied|blocked|forbidden/i.test(b))) {
    status = "blocked";
  } else if (!hasNoBlockers || score < 1.0) {
    status = "partial";
  }

  return {
    ...def,
    status,
    readinessScore: Number(score.toFixed(2)),
  };
}

export function listAgentSkills(): AgentSkillDefinition[] {
  const rawSkills: Array<Omit<AgentSkillDefinition, "status" | "readinessScore">> = [
    {
      id: "governed-extension-layer",
      title: "Governed Extension Layer",
      purpose: "Make advanced capabilities native to DISHA while forcing policy evaluation and evidence logging before output.",
      inputContract: "MissionResult",
      outputContract: "GovernedExtensionRun",
      allowedData: listGovernedExtensions().map((extension) => extension.id),
      policyBoundary: "Every extension result is re-evaluated by policy-gate.ts before it is returned.",
      evidenceBoundary: "Every extension request, policy decision, and result is appended to evidence-ledger.ts.",
      learningMode: "evidence_memory",
      blockers: [],
    },
    {
      id: "vyuha-defense-engine",
      title: "Vyuha Defense Engine",
      purpose: "Produce No-First-Use defensive posture proposals for evidence preservation, containment, alerting, and owned-environment honeypots.",
      lensBinding: "cyber",
      inputContract: "MissionResult + DishaSignal.input.indicators",
      outputContract: "GovernedExtensionResult",
      allowedData: ["public/internal cyber telemetry", "mission indicators", "owned-environment defensive context"],
      policyBoundary: "No execution; proposals pass through the policy gate and deny offensive or unauthorized action.",
      evidenceBoundary: "Vyuha source constraints, policy action ids, proposed actions, and extension result are ledger-recorded.",
      learningMode: "evidence_memory",
      blockers: [],
    },
    {
      id: "mission-intake",
      title: "Mission Intake Agent",
      purpose: "Normalize user request into DishaSignal and bind it to mission evidence.",
      inputContract: "MissionInput",
      outputContract: "DishaSignal",
      allowedData: ["user command", "attached file metadata", "locations", "threat indicators"],
      policyBoundary: commonPolicyBoundary,
      evidenceBoundary: "Records user_command_received and signal_normalized events.",
      learningMode: "none",
      blockers: [],
    },
    {
      id: "open-source-connector",
      title: "Open Source Connector Agent",
      purpose: "Expose real public source definitions and live source probes without synthetic data.",
      inputContract: "sourceId? + missionId",
      outputContract: "OpenDataRecord[] or SourceProbeResult[]",
      allowedData: listSourceRegistry().map((source) => source.sourceId),
      policyBoundary: "Open source only; controlled data remains deny-by-default.",
      evidenceBoundary: "Connector responses carry provenanceHash, source metadata, and probe events.",
      learningMode: "supervised_connector",
      blockers: ["Dataset-specific parsers and scheduled update monitors must be added per source."],
    },
    {
      id: "cyber-defense",
      title: "Cyber Defense Agent",
      purpose: "Map CVE/IP/domain/hash indicators, telemetry risk, and defensive incident posture.",
      lensBinding: "cyber",
      inputContract: "DishaSignal.input.indicators",
      outputContract: "DishaLensResult",
      allowedData: ["CVE", "IP", "domain", "URL", "hash", "email", "telemetry risk"],
      policyBoundary: "Offensive cyber language is denied; actions are defensive only.",
      evidenceBoundary: commonEvidenceBoundary,
      learningMode: "evidence_memory",
      blockers: [],
    },
    {
      id: "yudh-view",
      title: "Yudh View Strategic Agent",
      purpose: "Produce strategic, probabilistic, non-targeting scenario analysis.",
      lensBinding: "yudh_view",
      inputContract: "DishaSignal.input.rawText + locations + dataSources",
      outputContract: "DishaLensResult",
      allowedData: ["scenario text", "terrain terms", "logistics terms", "infrastructure terms"],
      policyBoundary: "No operational targeting or harmful tactical instruction.",
      evidenceBoundary: commonEvidenceBoundary,
      learningMode: "evidence_memory",
      blockers: [],
    },
    {
      id: "quantum-simulation",
      title: "Quantum/Simulation Agent",
      purpose: "Classify simulation, optimization, uncertainty modeling, or experimental framing.",
      lensBinding: "quantum",
      inputContract: "DishaSignal.input.rawText",
      outputContract: "DishaLensResult",
      allowedData: ["bounded model description", "classical baseline note"],
      policyBoundary: "No quantum advantage claim without benchmark.",
      evidenceBoundary: commonEvidenceBoundary,
      learningMode: "blocked",
      blockers: ["Python quantum engines require controlled internal service adapter before direct execution."],
    },
    {
      id: "geospatial",
      title: "Geospatial Intelligence Agent",
      purpose: "Validate coordinates and prepare map-layer-ready, provenance-bound findings.",
      lensBinding: "geospatial",
      inputContract: "DishaSignal.input.locations",
      outputContract: "DishaLensResult",
      allowedData: ["coordinates", "public GeoJSON", "open geospatial source manifests"],
      policyBoundary: "No invented coordinates, district facts, or sensitive facility exposure.",
      evidenceBoundary: commonEvidenceBoundary,
      learningMode: "supervised_connector",
      blockers: [],
    },
    {
      id: "governance",
      title: "Governance and Constitutional Audit Agent",
      purpose: "Classify sensitivity, authorization boundary, verification gaps, and human review needs.",
      lensBinding: "governance",
      inputContract: "DishaSignal.context + dataSources",
      outputContract: "DishaLensResult",
      allowedData: ["sensitivity", "role", "source links", "public authority terms"],
      policyBoundary: "Unsupported government/legal claims are [VERIFY REQUIRED].",
      evidenceBoundary: commonEvidenceBoundary,
      learningMode: "evidence_memory",
      blockers: [],
    },
    {
      id: "strategy-planner",
      title: "Strategy Planning Agent",
      purpose: "Decompose missions into safe steps, selected lenses, missing evidence, and report path.",
      lensBinding: "strategy",
      inputContract: "DishaSignal",
      outputContract: "DishaLensResult",
      allowedData: ["mission text", "selected lenses", "missing evidence list"],
      policyBoundary: "Planning proposes actions only; policy gate decides execution state.",
      evidenceBoundary: commonEvidenceBoundary,
      learningMode: "evidence_memory",
      blockers: [],
    },
    {
      id: "memory-learning",
      title: "Memory and Learning Agent",
      purpose: "Record evidence-backed mission memory without silent training or raw controlled-data retention.",
      inputContract: "missionId + approved evidence events",
      outputContract: "LearningMemoryRecord",
      allowedData: ["evidence ledger events", "verified source records", "operator-approved summaries"],
      policyBoundary: "No silent learning from controlled data, personal data, or unverified claims.",
      evidenceBoundary: "Learning input must reference evidence event ids and source provenance.",
      learningMode: "evidence_memory",
      blockers: ["Durable memory store adapter requires retention policy, export, and production database persistence."],
    },
    {
      id: "claude-orchestrator-bridge",
      title: "Claude Orchestrator Bridge",
      purpose: "Allow Claude or another provider to enrich DISHA missions without direct data or action access.",
      inputContract: "/api/v1/agentic/mission, /api/v1/mission, or /api/v1/lenses/{lens}/analyze",
      outputContract: "AgenticMissionResult, MissionResult, or DishaLensResult",
      allowedData: ["API responses returned after policy/evidence controls"],
      policyBoundary: "Claude cannot bypass policy, controlled connectors, or evidence ledger.",
      evidenceBoundary: "Every Claude-driven mission remains a normal DISHA mission with event hashes.",
      learningMode: "evidence_memory",
      blockers: ["Production provider keys, rate limits, and prompt-injection regression tests must be configured per deployment."],
    },
    {
      id: "governed-model-intelligence",
      title: "Governed Model Intelligence Agent",
      purpose: "Run optional Anthropic or OpenAI analysis after policy gating and return advisory JSON with verification gaps.",
      inputContract: "MissionResult + operatorInstruction?",
      outputContract: "ModelIntelligenceResult",
      allowedData: ["mission summaries", "lens summaries", "policy decision", "evidence event ids"],
      policyBoundary: "Provider execution is skipped when policy denies the mission.",
      evidenceBoundary: "Model output is appended to the mission evidence chain before learning memory is recorded.",
      learningMode: "evidence_memory",
      blockers: [],
    },
  ];

  return rawSkills.map(evaluateSkillReadiness);
}

export function getAgenticReadinessReport(): AgenticReadinessReport {
  const skills = listAgentSkills();
  const ready = skills.filter((skill) => skill.status === "ready").length;
  const partial = skills.filter((skill) => skill.status === "partial").length;
  const blocked = skills.filter((skill) => skill.status === "blocked").length;
  const score = Number((skills.reduce((sum, skill) => sum + skill.readinessScore, 0) / skills.length).toFixed(2));

  return {
    product: "DISHA v6.6 Unified Policy-Gated Cognitive Intelligence OS",
    agenticMode: "governed_orchestrator",
    orchestrationContract: "Claude or any model may orchestrate only through DISHA API v1, DishaSignal, DishaLensResult, policy gate, and evidence ledger.",
    claudeBridge: {
      role: "reasoning and orchestration client, not a privileged data plane",
      allowedEntryPoints: ["/api/v1/agentic/mission", "/api/v1/mission", "/api/v1/lenses/{lens}/analyze", "/api/v1/sources/registry", "/api/v1/sources/probe", "/api/v1/data/open/query", "/api/v1/evidence/export"],
      deniedCapabilities: ["direct controlled-data access", "offensive cyber action", "silent learning", "unsourced factual publication", "policy bypass"],
    },
    openSourceConnectorMesh: openDataSources.map((source) => ({
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      url: source.url,
      accessMode: "public_manifest_with_provenance",
    })),
    learningBoundary: {
      allowed: ["verified evidence summaries", "open source records with provenance", "operator-approved memory references"],
      denied: ["controlled data without authorization", "personal data without legal basis", "unverified claims as training truth", "model self-modification"],
      promotionRule: "Any learned capability must become an adapter, pass tests, and return DishaLensResult with evidence.",
    },
    uniqueArchitecture: {
      name: "Constitutional Evidence Graph",
      thesis: "DISHA's defensible edge is not a model prompt or dashboard. It is a policy-gated graph that binds public sources, live source probes, lens reasoning, model advice, and evidence hashes into one auditable mission chain.",
      liveCapabilities: [
        "constitutional source core for Constitution, laws, bills, Gazette, ministries, states, finance, audit, water, disaster, crime, and macroeconomic sources",
        "real-source registry for audit, finance, LGD, geospatial, disaster, crime, macroeconomic, and API-directory sources",
        "live source availability probes with provenance hashes",
        "no-demo-data open connector policy",
        "policy-gated model intelligence",
        "redacted evidence-memory learning",
      ],
      nonGoals: [
        "inventing government statistics",
        "publishing media claims as official data",
        "bypassing source-specific authentication",
        "storing controlled data without authorization",
      ],
    },
    constitutionalCore: getConstitutionalCore(),
    readiness: { score, ready, partial, blocked },
    skills,
  };
}
