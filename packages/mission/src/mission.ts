import { ulid } from "ulid";
import type { MissionState, Actor } from "@disha/contracts";
import type { Mission, CreateMissionInput, MissionTransition } from "./types";

const ALLOWED_TRANSITIONS: Record<MissionState, MissionState[]> = {
  draft: ["active", "archived"],
  active: ["under_review", "closed", "archived"],
  under_review: ["approved", "rejected", "active"],
  approved: ["closed", "archived"],
  closed: ["archived"],
  rejected: ["active", "archived"],
  archived: [],
};

export class MissionEngine {
  private missions = new Map<string, Mission>();
  private transitions: MissionTransition[] = [];

  create(input: CreateMissionInput): Mission {
    const now = new Date().toISOString();
    const mission: Mission = {
      id: ulid(),
      title: input.title,
      description: input.description,
      state: "draft",
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
      tags: input.tags ?? [],
      evidenceIds: [],
    };
    this.missions.set(mission.id, mission);
    return mission;
  }

  get(id: string): Mission | undefined {
    return this.missions.get(id);
  }

  list(filter?: { state?: MissionState }): Mission[] {
    let all = Array.from(this.missions.values());
    if (filter?.state) all = all.filter((m) => m.state === filter.state);
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  transition(id: string, to: MissionState, actor: Actor, reason?: string): Mission {
    const mission = this.missions.get(id);
    if (!mission) throw new Error(`Mission not found: ${id}`);

    const allowed = ALLOWED_TRANSITIONS[mission.state] || [];
    if (!allowed.includes(to)) {
      throw new Error(`Invalid transition ${mission.state} → ${to}`);
    }

    const from = mission.state;
    mission.state = to;
    mission.updatedAt = new Date().toISOString();

    this.transitions.push({
      from,
      to,
      actor,
      reason,
      at: mission.updatedAt,
    });

    return mission;
  }

  attachEvidence(missionId: string, evidenceId: string): void {
    const mission = this.missions.get(missionId);
    if (!mission) throw new Error(`Mission not found: ${missionId}`);
    if (!mission.evidenceIds.includes(evidenceId)) {
      mission.evidenceIds.push(evidenceId);
      mission.updatedAt = new Date().toISOString();
    }
  }

  getTransitions(missionId: string): MissionTransition[] {
    // In a full implementation this would be filtered by mission
    return this.transitions;
  }
}
