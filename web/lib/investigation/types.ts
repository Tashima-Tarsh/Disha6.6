import type { SearchTargetType } from "../unified/search-targets";

export type TargetType = SearchTargetType;

export const SEARCH_UNIVERSES = [
  "universal",
  "person",
  "domain",
  "email",
  "phone",
  "company",
  "location",
  "vehicle",
  "document",
  "cyber",
  "government",
  "osint",
] as const;
export type SearchUniverse = (typeof SEARCH_UNIVERSES)[number];

export const INVESTIGATION_MODES = [
  "standard",
  "deep",
  "evidence_first",
  "continuous_watch",
] as const;
export type InvestigationMode = (typeof INVESTIGATION_MODES)[number];

export const SOURCE_POLICIES = [
  "public",
  "authoritative",
  "government",
  "all_approved",
] as const;
export type SourcePolicy = (typeof SOURCE_POLICIES)[number];

export const JURISDICTIONS = ["india", "global"] as const;
export type Jurisdiction = (typeof JURISDICTIONS)[number];

export const TIME_RANGES = ["24h", "7d", "30d", "custom"] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

export type RunStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "NO_RESULTS"
  | "FAILED"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED"
  | "REFERENCE_ONLY"
  | "BLOCKED"
  | "RESTRICTED"
  | "INCOMPATIBLE"
  | "SKIPPED";

export type ProviderHealth =
  | "NOT_CONFIGURED"
  | "REST_HEALTHY"
  | "STREAM_HEALTHY"
  | "STREAM_NOT_ENTITLED"
  | "RATE_LIMITED"
  | "FAILED";

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
  externalRunId?: string;
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
  status:
    | "CONFIRMED_MATCH"
    | "LIKELY_MATCH"
    | "POSSIBLE_MATCH"
    | "AMBIGUOUS"
    | "CONFLICT"
    | "REJECTED_MATCH";
  attributes: Record<string, string>;
  evidenceIds: string[];
}

export interface InvestigationEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type:
    | "RETURNED_BY"
    | "SOURCED_FROM"
    | "MENTIONS"
    | "SAME_IDENTIFIER"
    | "EMPLOYED_BY"
    | "DIRECTOR_OF"
    | "REGISTERED_TO"
    | "LOCATED_AT"
    | "CORROBORATES"
    | "CONTRADICTS"
    | "OBSERVED_BY"
    | "DERIVED_FROM";
  evidenceId: string;
}

export interface InvestigationFinding {
  id: string;
  title: string;
  canonicalKey: string;
  matchState:
    | "CONFIRMED_MATCH"
    | "LIKELY_MATCH"
    | "POSSIBLE_MATCH"
    | "AMBIGUOUS"
    | "CONFLICT"
    | "REJECTED_MATCH";
  relevanceScore: number;
  sourceCount: number;
  contributingSources: string[];
  sourceClasses: string[];
  primarySource: string;
  observedAt?: string;
  timestampUnknown?: boolean;
  provenanceHash: string;
  summary: string;
  evidenceIds: string[];
  jurisdiction?: string;
  coordinates?: [number, number];
  contradictions?: string[];
  corroborations?: string[];
}

export interface InvestigationTimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  sourceName: string;
  evidenceId: string;
  summary: string;
}

export interface InvestigationMapMarker {
  id: string;
  title: string;
  coordinates: [number, number];
  locationName?: string;
  sourceName: string;
  evidenceId: string;
}

export interface InvestigationContradiction {
  id: string;
  topic: string;
  description: string;
  sourceA: string;
  claimA: string;
  sourceB: string;
  claimB: string;
  evidenceIds: [string, string];
}

export interface InvestigationCorroboration {
  id: string;
  fact: string;
  sources: string[];
  evidenceIds: string[];
  confidence: number;
}

export interface InvestigationStartRequest {
  target: string;
  targetType?: TargetType | "auto";
  searchUniverse?: SearchUniverse;
  investigationMode?: InvestigationMode;
  sourcePolicy?: SourcePolicy;
  jurisdiction?: Jurisdiction;
  timeRange?: TimeRange;
  selectedToolIds?: string[];
  identityAuthorization?: boolean;
  activeAuthorization?: boolean;
}

export interface Investigation {
  investigationId: string;
  revision: number;
  target: string;
  normalizedTarget: string;
  targetType: TargetType;
  searchUniverse: SearchUniverse;
  investigationMode: InvestigationMode;
  sourcePolicy: SourcePolicy;
  jurisdiction: Jurisdiction;
  timeRange: TimeRange;
  selectedToolIds: string[];
  identityAuthorization: boolean;
  activeAuthorization: boolean;
  createdAt: string;
  expiresAt: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "CLOSING";
  plannedAdapters: AdapterPlan[];
  runs: InvestigationRun[];
  evidence: InvestigationEvidence[];
  candidateClusters: InvestigationCandidate[];
  edges: InvestigationEdge[];
  rankedFindings: InvestigationFinding[];
  timeline: InvestigationTimelineEvent[];
  markers: InvestigationMapMarker[];
  contradictions: InvestigationContradiction[];
  corroborations: InvestigationCorroboration[];
  warnings?: string[];
}

export const SOURCE_CATEGORIES = [
  "Identity",
  "Social",
  "Corporate",
  "News",
  "Cyber",
  "Infrastructure",
  "Archives",
  "Geospatial",
  "Space",
  "Evidence",
] as const;

export function safeSourceUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
