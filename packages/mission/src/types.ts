import type { MissionState, VerificationState, Actor } from "@disha/contracts";

export type { MissionState, VerificationState, Actor };

export interface Mission {
  id: string;
  title: string;
  description?: string;
  state: MissionState;
  createdAt: string;
  updatedAt: string;
  createdBy: Actor;
  tags?: string[];
  /** Evidence event IDs belonging to this mission */
  evidenceIds: string[];
}

export interface CreateMissionInput {
  title: string;
  description?: string;
  createdBy: Actor;
  tags?: string[];
}

export interface MissionTransition {
  from: MissionState;
  to: MissionState;
  actor: Actor;
  reason?: string;
  at: string;
}
