import crypto from "node:crypto";

import {
  dishaSignalSchema,
  type DishaLensResult,
  type DishaSignal,
  type LensName,
  type PolicyDecision,
} from "./contracts";
import { appendEvidenceEvent, getEvidenceEvents } from "./evidence-ledger";
import { evaluatePolicy } from "./policy-gate";
import { lensRegistry, selectLenses } from "./lenses";
import { clearMissionStoreForTests, getMissionResult, saveMissionResult, reserveMissionId } from "./mission-store";
import type { Principal } from "../server/types";

export type MissionInput = {
  rawText: string;
  requestedAction?: string;
  sensitivity?: DishaSignal["context"]["sensitivity"];
  userId: string;
  userRole: string;
  deviceId?: string;
  deviceTrust?: number;
  missionId?: string;
  indicators?: DishaSignal["input"]["indicators"];
  locations?: DishaSignal["input"]["locations"];
  dataSources?: DishaSignal["context"]["dataSources"];
};

export type MissionComponentFailure = {
  component: LensName;
  stage: "lens_analysis";
  error: string;
};

export type MissionResult = {
  missionId: string;
  signal: DishaSignal;
  selectedLenses: LensName[];
  lensResults: DishaLensResult[];
  componentFailures: MissionComponentFailure[];
  degraded: boolean;
  fusedIntelligence: FusionResult;
  fusedSummary: string;
  riskScore: number;
  policyDecision: PolicyDecision;
  approvalRequired: boolean;
  safeExecution: "report_generated" | "waiting_for_confirmation" | "sandbox_only" | "read_only" | "denied" | "escalated";
  evidenceEventIds: string[];
};

export type FusionResult = {
  executiveSummary: string;
  topFindings: string[];
  riskDrivers: string[];
  confidence: number;
  uncertainty: string[];
  requiredApprovals: string[];
  recommendedSafeActions: string[];
  verifyRequiredItems: string[];
};

export async function runMission(input: MissionInput): Promise<MissionResult> {
  const signal = normalizeMission(input);
  await reserveMissionId(signal.missionId ?? signal.id, signal.userId, signal.input);
  const eventIds: string[] = [];

  eventIds.push((await appendEvidenceEvent({
    missionId: signal.missionId ?? signal.id,
    actor: signal.userId,
    action: "user_command_received",
    input,
  })).eventId);

  eventIds.push((await appendEvidenceEvent({
    missionId: signal.missionId ?? signal.id,
    actor: signal.userId,
    action: "signal_normalized",
    input,
    output: signal,
  })).eventId);

  const selected = selectLenses(signal);
  eventIds.push((await appendEvidenceEvent({
    missionId: signal.missionId ?? signal.id,
    actor: "disha-orchestrator",
    action: "lens_selected",
    input: signal,
    output: selected.map((lens) => lens.name),
  })).eventId);

  const settled = await Promise.allSettled(selected.map((lens) => lens.analyze(signal)));
  const lensResults: DishaLensResult[] = [];
  const componentFailures: MissionComponentFailure[] = [];
  settled.forEach((outcome, index) => {
    if (outcome.status === "fulfilled") {
      lensResults.push(outcome.value);
      return;
    }
    componentFailures.push({
      component: selected[index].name,
      stage: "lens_analysis",
      error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
    });
  });

  eventIds.push((await appendEvidenceEvent({
    missionId: signal.missionId ?? signal.id,
    actor: "disha-orchestrator",
    action: componentFailures.length ? "lens_analysis_partially_completed" : "lens_analysis_completed",
    input: selected.map((lens) => lens.name),
    output: { lensResults, componentFailures },
    lensResults: lensResults.map((result) => result.lens),
  })).eventId);

  const policyDecision = evaluatePolicy(signal, lensResults);
  const policyEvent = await appendEvidenceEvent({
    missionId: signal.missionId ?? signal.id,
    actor: "policy-gate",
    action: "policy_decision_made",
    input: { signal, lensResults, componentFailures },
    output: policyDecision,
    policyDecision,
    lensResults: lensResults.map((result) => result.lens),
  });
  eventIds.push(policyEvent.eventId);
  const responsePolicyDecision = { ...policyDecision, evidenceEventId: policyEvent.eventId };

  const fusedIntelligence = fuseLensResults(lensResults, componentFailures);
  const result: MissionResult = {
    missionId: signal.missionId ?? signal.id,
    signal,
    selectedLenses: selected.map((lens) => lens.name),
    lensResults,
    componentFailures,
    degraded: componentFailures.length > 0,
    fusedIntelligence,
    fusedSummary: renderFusionSummary(fusedIntelligence),
    riskScore: Math.max(signal.riskContext.actionRisk, ...lensResults.map((item) => item.riskScore)),
    policyDecision: responsePolicyDecision,
    approvalRequired: ["ASK_CONFIRMATION", "ESCALATE"].includes(responsePolicyDecision.decision),
    safeExecution: executionState(responsePolicyDecision),
    evidenceEventIds: eventIds,
  };

  eventIds.push((await appendEvidenceEvent({
    missionId: result.missionId,
    actor: "disha-orchestrator",
    action: "report_generated",
    input: { missionId: result.missionId },
    output: missionReportPayload(result),
    policyDecision: responsePolicyDecision,
  })).eventId);
  result.evidenceEventIds = eventIds;
  await saveMissionResult(result);
  return result;
}

export function missionReportPayload(result: MissionResult) {
  const { evidenceEventIds: _eventIds, ...report } = result;
  return report;
}

export async function analyzeLens(name: LensName, signal: DishaSignal): Promise<DishaLensResult> {
  return lensRegistry[name].analyze(dishaSignalSchema.parse(signal));
}

export function getMission(missionId: string): Promise<MissionResult | null> {
  return getMissionResult(missionId);
}

export function canReadMission(mission: MissionResult, principal: Pick<Principal, "userId" | "roles">): boolean {
  return mission.signal.userId === principal.userId || principal.roles.includes("admin");
}

export function getMissionEvidence(missionId: string) {
  return getEvidenceEvents(missionId);
}

export function normalizeMission(input: MissionInput): DishaSignal {
  const missionId = input.missionId ?? crypto.randomUUID();
  return dishaSignalSchema.parse({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userId: input.userId,
    deviceId: input.deviceId,
    missionId,
    input: {
      rawText: input.rawText,
      requestedAction: input.requestedAction,
      indicators: input.indicators ?? [],
      locations: input.locations ?? [],
      files: [],
    },
    context: {
      intent: inferIntent(input.rawText),
      entities: [],
      memoryRefs: [],
      dataSources: input.dataSources ?? [],
      sensitivity: input.sensitivity ?? "public",
    },
    riskContext: {
      userRole: input.userRole,
      deviceTrust: input.deviceTrust ?? 0.75,
      actionRisk: input.requestedAction ? 0.45 : 0.2,
      dataSensitivityRisk: sensitivityRisk(input.sensitivity ?? "public"),
      telemetryRisk: input.indicators?.length ? 0.35 : undefined,
    },
  });
}

function inferIntent(rawText: string): string {
  const text = rawText.toLowerCase();
  if (/report|brief|summar/.test(text)) return "report";
  if (/monitor|detect|alert/.test(text)) return "monitor";
  if (/simulate|optimi/.test(text)) return "simulation";
  return "analysis";
}

function sensitivityRisk(sensitivity: DishaSignal["context"]["sensitivity"]): number {
  if (sensitivity === "classified") return 0.95;
  if (sensitivity === "controlled") return 0.7;
  if (sensitivity === "internal") return 0.35;
  return 0.1;
}

function fuseLensResults(results: DishaLensResult[], failures: MissionComponentFailure[] = []): FusionResult {
  const sortedFindings = results
    .flatMap((result) => result.findings.map((finding) => ({ ...finding, lens: result.lens, riskScore: result.riskScore })))
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.riskScore - a.riskScore);
  const riskDrivers = sortedFindings
    .filter((finding) => ["critical", "high", "medium"].includes(finding.severity))
    .map((finding) => `${finding.lens}: ${finding.title}`)
    .slice(0, 6);
  const verifyRequiredItems = sortedFindings
    .filter((finding) => finding.description.includes("[VERIFY REQUIRED]"))
    .map((finding) => `${finding.lens}: ${finding.title}`);
  const uncertainty = [
    ...results.filter((result) => result.confidence < 0.6).map((result) => `${result.lens}: low confidence ${result.confidence.toFixed(2)}`),
    ...verifyRequiredItems,
    ...failures.map((failure) => `${failure.component}: unavailable during ${failure.stage}`),
  ];
  const confidence = results.length
    ? Number((results.reduce((sum, result) => sum + result.confidence, 0) / results.length).toFixed(2))
    : 0;
  const requiredApprovals = results
    .filter((result) => result.policyRequired || result.riskScore >= 0.55)
    .map((result) => result.lens);
  const recommendedSafeActions = Array.from(new Set(results.flatMap((result) =>
    result.recommendedActions
      .filter((item) => !/hack|exploit|ddos|malware|credential|brute/i.test(item.action))
      .map((item) => item.label),
  ))).slice(0, 8);

  return {
    executiveSummary: results.map((result) => `${result.lens}: ${result.summary}`).join(" "),
    topFindings: sortedFindings.map((finding) => `${finding.lens}: ${finding.title}`).slice(0, 6),
    riskDrivers,
    confidence,
    uncertainty,
    requiredApprovals: Array.from(new Set(requiredApprovals)),
    recommendedSafeActions,
    verifyRequiredItems,
  };
}

function renderFusionSummary(fusion: FusionResult): string {
  return [
    `Executive summary: ${fusion.executiveSummary}`,
    `Top findings: ${fusion.topFindings.join("; ") || "none"}`,
    `Risk drivers: ${fusion.riskDrivers.join("; ") || "none"}`,
    `Confidence: ${fusion.confidence}`,
    `Uncertainty: ${fusion.uncertainty.join("; ") || "none"}`,
    `Required approvals: ${fusion.requiredApprovals.join(", ") || "none"}`,
    `Recommended safe actions: ${fusion.recommendedSafeActions.join(", ") || "none"}`,
    `Verify required: ${fusion.verifyRequiredItems.join("; ") || "none"}`,
  ].join("\n");
}

function severityRank(severity: DishaLensResult["findings"][number]["severity"]): number {
  return { info: 0, low: 1, medium: 2, high: 3, critical: 4 }[severity];
}

function executionState(policy: PolicyDecision): MissionResult["safeExecution"] {
  if (policy.decision === "ALLOW") return "report_generated";
  if (policy.decision === "ASK_CONFIRMATION") return "waiting_for_confirmation";
  if (policy.decision === "SANDBOX_ONLY") return "sandbox_only";
  if (policy.decision === "READ_ONLY") return "read_only";
  if (policy.decision === "ESCALATE") return "escalated";
  return "denied";
}

export function clearMissionsForTests(): Promise<void> {
  return clearMissionStoreForTests();
}
