import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  clearLearningMemoryForTests,
  getLearningMemory,
  learnFromMission,
  searchLearningMemory,
  checkMemoryContradiction,
  invalidateLearningMemory,
  loadPersistentLearningMemory,
  setMemoryPersistenceFileForTests,
} from "../lib/unified/learning-memory";
import type { MissionResult } from "../lib/unified/orchestrator";
import type { ModelIntelligenceResult } from "../lib/unified/model-provider";

describe("Unified Learning Memory — Persistence, Contradiction, and Invalidation", () => {
  let tmpFile: string;

  beforeEach(() => {
    clearLearningMemoryForTests();
    tmpFile = path.join(os.tmpdir(), `test-disha-memory-${Date.now()}.json`);
    setMemoryPersistenceFileForTests(tmpFile);
  });

  afterEach(() => {
    setMemoryPersistenceFileForTests(null);
    clearLearningMemoryForTests();
    if (fs.existsSync(tmpFile)) {
      try {
        fs.unlinkSync(tmpFile);
      } catch {}
    }
  });

  const mockMission: MissionResult = {
    missionId: "m-persist-01",
    signal: {
      rawText: "Satellite ground station telemetry gap",
      intent: "investigation",
      confidence: 0.95,
      context: { sensitivity: "unclassified", role: "operator", purpose: "audit" },
      input: { rawText: "telemetry" },
    },
    policyDecision: {
      decision: "ALLOW",
      ruleId: "POL-01",
      actionId: "ACT-01",
      reason: "Permitted audit",
      confidence: 1.0,
      evidenceHashes: ["h1"],
    },
    lensResults: [],
    fusedIntelligence: {
      overallConfidence: 0.9,
      dominantLens: "cyber",
      topFindings: ["Discrepancy in downlink framing"],
      evidenceGaps: [],
      contradictions: [],
      nextActions: ["Cross-verify with Doppler shift"],
    },
    evidenceEventIds: ["ev-01", "ev-02"],
    createdAt: new Date().toISOString(),
  };

  const mockModel: ModelIntelligenceResult = {
    provider: "openai",
    model: "gpt-4o",
    summary: "Confirmed ground station telemetry discrepancy in frame sync header.",
    reasoningNotes: ["Analysis backed by frame counters."],
    recommendedNextSteps: ["Verify station azimuth calibration"],
    verifyRequired: [],
    evidenceEventIds: ["ev-01", "ev-02"],
    policyBoundary: "Advisory only",
    status: "completed",
  };

  it("persists memory to storage and retrieves it after simulated process restart", () => {
    // 1. Create memory
    const rec = learnFromMission(mockMission, mockModel);
    expect(rec).not.toBeNull();
    expect(fs.existsSync(tmpFile)).toBe(true);

    // 2. Search in current session
    const searchRes = searchLearningMemory("ground station");
    expect(searchRes).toHaveLength(1);
    expect(searchRes[0].summary).toContain("Confirmed ground station telemetry");

    // 3. Clear memory to simulate restart
    clearLearningMemoryForTests();
    expect(getLearningMemory()).toHaveLength(0);

    // 4. Reload from disk persistence
    const loadedCount = loadPersistentLearningMemory(tmpFile);
    expect(loadedCount).toBe(1);
    expect(getLearningMemory()).toHaveLength(1);
    expect(getLearningMemory()[0].memoryId).toBe(rec?.memoryId);

    // 5. Detect contradiction
    const contra = checkMemoryContradiction("no ground station telemetry discrepancy exists");
    expect(contra.contradictionDetected).toBe(true);
    expect(contra.conflictMemoryId).toBe(rec?.memoryId);

    // 6. Invalidate memory
    const invSuccess = invalidateLearningMemory(rec!.memoryId);
    expect(invSuccess).toBe(true);

    // 7. Verify invalidated memory is filtered from active retrieval
    expect(getLearningMemory()).toHaveLength(0);
    expect(searchLearningMemory("ground station")).toHaveLength(0);
  });
});

