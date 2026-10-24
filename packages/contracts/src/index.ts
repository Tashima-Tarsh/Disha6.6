/**
 * DISHA Canonical Contracts
 * Governing document: CONSTITUTION.md
 *
 * These types are the single source of truth for evidence, adapters, and policy.
 * All new code must conform to them.
 */

export type VerificationState =
  | "OBSERVED"
  | "INFERRED"
  | "CORRELATED"
  | "PREDICTED"
  | "VERIFY_REQUIRED"
  | "VERIFIED"
  | "REJECTED";

export type ActorType = "human" | "agent" | "system" | "adapter";

export interface Actor {
  type: ActorType;
  id: string;
  displayName?: string;
}

export interface SourceReference {
  adapterId?: string;
  url?: string;
  title?: string;
  retrievedAt?: string;
  hash?: string;
}

export interface PolicyContext {
  policyId: string;
  decision: "allow" | "deny" | "ask" | "propose";
  reasons: string[];
}

/**
 * Immutable, hash-chained evidence event.
 * Every significant action in the system must produce one.
 */
export interface EvidenceEvent {
  id: string; // ULID
  previousHash: string;
  hash: string;
  timestamp: string; // ISO-8601
  actor: Actor;
  type:
    | "observation"
    | "claim"
    | "policy_decision"
    | "approval"
    | "finding"
    | "rejection";
  payload: unknown;
  sources: SourceReference[];
  verification: VerificationState;
  policyContext: PolicyContext;
  missionId?: string;
  caseId?: string;
  signature?: string;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type DataSensitivity = "public" | "sensitive" | "restricted";

export interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

export interface CanonicalInput {
  [key: string]: string | number | boolean | undefined;
}

export interface ExecutionContext {
  missionId?: string;
  caseId?: string;
  actor: Actor;
  policySnapshotId?: string;
  budgetRemainingMs?: number;
}

export interface Observation {
  key: string;
  value: unknown;
  confidence?: number;
  limitations?: string[];
}

/**
 * Every adapter must implement this contract.
 * High-risk adapters default to proposal-only.
 */
export interface Adapter {
  id: string;
  name: string;
  version: string;
  category: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  legalBasis: string;
  dataSensitivity: DataSensitivity;
  rateLimit: RateLimitConfig;
  timeoutMs: number;

  execute(
    input: CanonicalInput,
    ctx: ExecutionContext
  ): Promise<AdapterResult>;
}

export interface AdapterResult {
  observations: Observation[];
  evidenceEvents: EvidenceEvent[]; // mandatory
  confidence: number; // 0-1
  limitations: string[];
  errors?: string[];
}

export interface PolicyDecision {
  action: "allow" | "deny" | "ask" | "propose";
  riskLevel: RiskLevel;
  reasons: string[];
  requiredApprovals: string[];
  expiresAt?: string;
}

export type MissionState =
  | "draft"
  | "active"
  | "under_review"
  | "approved"
  | "closed"
  | "rejected"
  | "archived";
