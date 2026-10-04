export type TargetType = "person_name" | "email" | "phone" | "username" | "company" | "domain" | "ip" | "asn" | "url" | "cve" | "norad_id" | "topic" | "image";
export type RunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "NO_RESULTS" | "FAILED" | "RATE_LIMITED" | "NOT_CONFIGURED" | "REFERENCE_ONLY" | "BLOCKED" | "RESTRICTED" | "SKIPPED";
export type ProviderHealth = "NOT_CONFIGURED" | "REST_HEALTHY" | "STREAM_HEALTHY" | "STREAM_NOT_ENTITLED" | "RATE_LIMITED" | "FAILED";
export interface AdapterPlan {
  adapterId: string;
  sourceName: string;
  input: Record<string, unknown>;
  reason: string;
  initialStatus?: RunStatus;
}
export interface InvestigationRun {
  adapterId: string;
  sourceName: string;
  status: RunStatus;
  evidenceCount: number;
  startedAt?: string;
  endedAt?: string;
  error?: string;
  warnings: string[];
  providerHealth?: ProviderHealth;
}
export interface InvestigationEvidence {
  evidenceId: string;
  sourceId: string;
  sourceName: string;
  adapterId: string;
  sourceUrl?: string;
  providerRecordId?: string;
  retrievedAt: string;
  observedAt?: string;
  summary: string;
  contentHash: string;
  provenanceHash: string;
  candidateId?: string;
  corroborationState: "unverified" | "corroborated";
  contradictionState: "not_assessed" | "contested";
  fields: Record<string, unknown>;
}
export interface InvestigationCandidate {
  candidateId: string;
  label: string;
  status: "CONFIRMED_MATCH" | "LIKELY_MATCH" | "POSSIBLE_MATCH" | "AMBIGUOUS" | "CONFLICT" | "REJECTED_MATCH";
  attributes: Record<string, string>;
  evidenceIds: string[];
}
export interface InvestigationEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: "RETURNED_BY" | "SOURCED_FROM" | "MENTIONS" | "SAME_IDENTIFIER" | "EMPLOYED_BY" | "DIRECTOR_OF" | "REGISTERED_TO" | "LOCATED_AT" | "CORROBORATES" | "CONTRADICTS" | "OBSERVED_BY" | "DERIVED_FROM";
  evidenceId: string;
}
export interface Investigation {
  investigationId: string;
  revision: number;
  target: string;
  normalizedTarget: string;
  targetType: TargetType;
  createdAt: string;
  expiresAt: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "CLOSING";
  plannedAdapters: AdapterPlan[];
  runs: InvestigationRun[];
  evidence: InvestigationEvidence[];
  candidateClusters: InvestigationCandidate[];
  edges: InvestigationEdge[];
}
export const SOURCE_CATEGORIES = ["Identity", "Social", "Corporate", "News", "Cyber", "Infrastructure", "Archives", "Geospatial", "Space", "Evidence"] as const;
export function safeSourceUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}
