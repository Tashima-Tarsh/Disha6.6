import fs from "node:fs";
import path from "node:path";
import { hashValue } from "./hash";
import type { MissionResult } from "./orchestrator";
import type { ModelIntelligenceResult } from "./model-provider";

export type LearningMemoryRecord = {
  memoryId: string;
  missionId: string;
  createdAt: string;
  sensitivity: MissionResult["signal"]["context"]["sensitivity"];
  policyDecision: MissionResult["policyDecision"]["decision"];
  sourceEventIds: string[];
  evidenceHashes: string[];
  summary: string;
  reusablePatterns: string[];
  redacted: boolean;
  status?: "ACTIVE" | "INVALIDATED" | "SUPERSEDED";
};

const memoryByMission = new Map<string, LearningMemoryRecord>();
let persistenceFile: string | null = null;

function getPersistenceFilePath(): string | null {
  if (persistenceFile) return persistenceFile;
  const envPath = process.env.DISHA_MEMORY_STORAGE_PATH;
  if (envPath) return envPath;
  if (process.env.NODE_ENV === "test") return null;
  return path.resolve(process.cwd(), "data/memory/unified-learning-memory.json");
}

function persistToDisk(): void {
  const target = getPersistenceFilePath();
  if (!target) return;
  try {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = Array.from(memoryByMission.values());
    fs.writeFileSync(target, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Graceful fallback if storage write fails
  }
}

export function loadPersistentLearningMemory(sourcePath?: string): number {
  const target = sourcePath || getPersistenceFilePath();
  if (!target || !fs.existsSync(target)) return 0;
  try {
    const raw = fs.readFileSync(target, "utf-8");
    const records = JSON.parse(raw) as LearningMemoryRecord[];
    if (Array.isArray(records)) {
      for (const rec of records) {
        memoryByMission.set(rec.missionId, rec);
      }
      return records.length;
    }
  } catch {
    // Graceful fallback
  }
  return 0;
}

export function setMemoryPersistenceFileForTests(filePath: string | null): void {
  persistenceFile = filePath;
}

export function learnFromMission(mission: MissionResult, model: ModelIntelligenceResult): LearningMemoryRecord | null {
  if (mission.policyDecision.decision === "DENY") return null;
  if (!mission.evidenceEventIds.length) return null;

  const redacted = ["controlled", "classified"].includes(mission.signal.context.sensitivity);
  const evidenceHashes = mission.evidenceEventIds.map((eventId) => hashValue(`${mission.missionId}:${eventId}`));
  const reusablePatterns = [
    ...mission.fusedIntelligence.topFindings,
    ...model.recommendedNextSteps,
  ]
    .filter((item) => item && !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(item))
    .slice(0, 8);

  const summary = redacted
    ? `Redacted ${mission.signal.context.sensitivity} mission memory. Evidence and policy metadata retained; raw mission text excluded.`
    : model.summary;

  const record: LearningMemoryRecord = {
    memoryId: hashValue(`${mission.missionId}:${mission.evidenceEventIds.join(":")}`).slice(0, 24),
    missionId: mission.missionId,
    createdAt: new Date().toISOString(),
    sensitivity: mission.signal.context.sensitivity,
    policyDecision: mission.policyDecision.decision,
    sourceEventIds: mission.evidenceEventIds,
    evidenceHashes,
    summary,
    reusablePatterns,
    redacted,
    status: "ACTIVE",
  };
  memoryByMission.set(mission.missionId, record);
  persistToDisk();
  return record;
}

export function checkMemoryContradiction(summary: string): {
  contradictionDetected: boolean;
  conflictMemoryId?: string;
  conflictingSummary?: string;
} {
  const norm = summary.trim().toLowerCase();
  const isNegated = norm.startsWith("no ") || norm.startsWith("not ") || norm.includes("never ") || norm.includes("denied") || norm.includes("without ");
  const cleanQuery = norm
    .replace(/^(no|not|never|without)\s+/, "")
    .replace(/\s+(exists|occurred|found|reported)$/, "")
    .trim();
  const queryWords = cleanQuery.split(/\s+/).filter((w) => w.length > 3);

  for (const record of memoryByMission.values()) {
    if (record.status !== "ACTIVE") continue;
    const recNorm = record.summary.trim().toLowerCase();
    const isRecNegated = recNorm.startsWith("no ") || recNorm.startsWith("not ") || recNorm.includes("denied");

    const matchCount = queryWords.filter((w) => recNorm.includes(w)).length;
    const overlapRatio = queryWords.length > 0 ? matchCount / queryWords.length : 0;

    if (overlapRatio >= 0.6 && isNegated !== isRecNegated) {
      return {
        contradictionDetected: true,
        conflictMemoryId: record.memoryId,
        conflictingSummary: record.summary,
      };
    }
  }
  return { contradictionDetected: false };
}

export function searchLearningMemory(query: string, limit = 5): LearningMemoryRecord[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return getLearningMemory().slice(0, limit);

  const scored: Array<{ score: number; record: LearningMemoryRecord }> = [];
  for (const record of memoryByMission.values()) {
    if (record.status !== "ACTIVE") continue;
    const haystack = `${record.summary} ${record.reusablePatterns.join(" ")}`.toLowerCase();
    let matches = 0;
    for (const term of terms) {
      if (haystack.includes(term)) matches++;
    }
    if (matches > 0) {
      scored.push({ score: matches / terms.length, record });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.record);
}

export function invalidateLearningMemory(memoryId: string): boolean {
  for (const [missionId, record] of memoryByMission.entries()) {
    if (record.memoryId === memoryId) {
      record.status = "INVALIDATED";
      memoryByMission.set(missionId, record);
      persistToDisk();
      return true;
    }
  }
  return false;
}

export function getLearningMemory(missionId?: string): LearningMemoryRecord[] {
  if (missionId) {
    const record = memoryByMission.get(missionId);
    return record ? [record] : [];
  }
  return Array.from(memoryByMission.values()).filter((r) => r.status !== "INVALIDATED");
}

export function clearLearningMemoryForTests(): void {
  memoryByMission.clear();
}
