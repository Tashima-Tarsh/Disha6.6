import { saveMissionResult } from "./mission-store";
import { appendEvidenceEvent } from "./evidence-ledger";
import { runGovernedExtensions, type GovernedExtensionRun } from "../extensions";
import { learnFromMission, type LearningMemoryRecord } from "./learning-memory";
import { persistModelCallAudit } from "./model-call-audit";
import { runModelIntelligence, type ModelIntelligenceResult } from "./model-provider";
import { runMission, type MissionInput, type MissionResult } from "./orchestrator";

export type AgenticMissionInput = MissionInput & {
  operatorInstruction?: string;
};

export type AgenticMissionResult = {
  mission: MissionResult;
  governedExtensions: GovernedExtensionRun;
  modelIntelligence: ModelIntelligenceResult;
  learning: LearningMemoryRecord | null;
  evidenceEventIds: string[];
};

export async function runAgenticMission(input: AgenticMissionInput): Promise<AgenticMissionResult> {
  const mission = await runMission(input);
  const governedExtensions = await runGovernedExtensions(mission);
  mission.evidenceEventIds = [...mission.evidenceEventIds, ...governedExtensions.evidenceEventIds];

  const modelRequest = { mission, operatorInstruction: input.operatorInstruction };
  const modelStartedAt = Date.now();
  const modelIntelligence = await runModelIntelligence(modelRequest);
  const modelEvent = await appendEvidenceEvent({
    missionId: mission.missionId,
    actor: "model-intelligence-adapter",
    action: "model_intelligence_completed",
    input: {
      missionId: mission.missionId,
      provider: modelIntelligence.provider,
      model: modelIntelligence.model,
      policyDecision: mission.policyDecision.decision,
    },
    output: {
      status: modelIntelligence.status,
      summary: modelIntelligence.summary,
      verifyRequired: modelIntelligence.verifyRequired,
      recommendedNextSteps: modelIntelligence.recommendedNextSteps,
    },
    policyDecision: mission.policyDecision,
  });
  mission.evidenceEventIds = [...mission.evidenceEventIds, modelEvent.eventId];
  await persistModelCallAudit({
    request: modelRequest,
    result: { ...modelIntelligence, evidenceEventIds: mission.evidenceEventIds },
    startedAt: modelStartedAt,
  });

  const learning = learnFromMission(mission, modelIntelligence);
  const learningEvent = await appendEvidenceEvent({
    missionId: mission.missionId,
    actor: "evidence-learning-memory",
    action: "learning_memory_recorded",
    input: { missionId: mission.missionId, modelEventId: modelEvent.eventId },
    output: learning
      ? {
          memoryId: learning.memoryId,
          redacted: learning.redacted,
          evidenceHashes: learning.evidenceHashes,
        }
      : { recorded: false },
    policyDecision: mission.policyDecision,
    parentEventId: modelEvent.eventId,
  });
  mission.evidenceEventIds = [...mission.evidenceEventIds, learningEvent.eventId];

  await saveMissionResult(mission);

  return {
    mission,
    governedExtensions,
    modelIntelligence: {
      ...modelIntelligence,
      evidenceEventIds: mission.evidenceEventIds,
    },
    learning,
    evidenceEventIds: mission.evidenceEventIds,
  };
}
