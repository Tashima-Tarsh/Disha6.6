import { z } from "zod";
import type { PolicyDecision } from "../contracts";

export const sourceTrustTierSchema = z.enum([
  "tier_1_primary_official",
  "tier_2_authoritative_secondary",
  "tier_3_reputable_reporting",
  "tier_4_community_osint",
  "tier_5_unverified_assertion",
]);
export type SourceTrustTier = z.infer<typeof sourceTrustTierSchema>;

export const evidenceLifecycleStateSchema = z.enum([
  "RAW",
  "OBSERVED",
  "EXTRACTED",
  "NORMALIZED",
  "ADMITTED",
  "CORROBORATED",
  "REVIEW_REQUIRED",
  "VERIFIED",
  "DISPUTED",
  "REJECTED",
  "SUPERSEDED",
]);
export type EvidenceLifecycleState = z.infer<typeof evidenceLifecycleStateSchema>;

export const constitutionalEntityTypeSchema = z.enum([
  "PERSON",
  "ORGANIZATION",
  "COMPANY",
  "DOMAIN",
  "IP",
  "DEVICE",
  "APPLICATION",
  "DOCUMENT",
  "COURT_CASE",
  "COURT_ORDER",
  "LEGISLATION",
  "GOVERNMENT_BODY",
  "GOVERNMENT_OFFICER",
  "REGULATOR",
  "LOCATION",
  "EVENT",
  "INCIDENT",
  "CLAIM",
  "SOURCE",
  "OBLIGATION",
  "DECISION",
  "RESPONSE",
  "NON_RESPONSE",
  "TENDER",
  "ASSET",
]);
export type ConstitutionalEntityType = z.infer<typeof constitutionalEntityTypeSchema>;

export const constitutionalRelationTypeSchema = z.enum([
  "MENTIONED_IN",
  "PUBLISHED_BY",
  "BOUND_BY",
  "SUPPORTS",
  "CONTRADICTS",
  "RESPONDS_TO",
  "OCCURRED_AFTER",
  "SUPERSEDES",
  "DERIVED_FROM",
  "AFFILIATED_WITH",
  "OPERATES",
  "OWNS",
  "LOCATED_AT",
]);
export type ConstitutionalRelationType = z.infer<typeof constitutionalRelationTypeSchema>;

export const contradictionTypeSchema = z.enum([
  "statement_vs_statement",
  "gov_reply_vs_record",
  "court_order_vs_implementation",
  "claim_vs_dataset",
  "document_version_diff",
  "obligation_vs_action",
  "announcement_vs_execution",
  "date_inconsistency",
  "amount_inconsistency",
  "identity_inconsistency",
  "jurisdiction_inconsistency",
  "procedural_inconsistency",
]);
export type ContradictionType = z.infer<typeof contradictionTypeSchema>;

export const dishaObservationSchema = z.object({
  observationId: z.string().min(1),
  sourceId: z.string().min(1),
  sourceType: z.string().min(1),
  sourceAuthority: z.string().min(1),
  sourceTier: sourceTrustTierSchema,
  originalUrl: z.string().url().optional(),
  retrievedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
  observedAt: z.string().datetime(),
  changedAt: z.string().datetime().optional(),
  contentHash: z.string().min(16),
  snapshotHash: z.string().min(16).optional(),
  mimeType: z.string().min(1).default("text/plain"),
  language: z.string().min(2).default("en"),
  jurisdiction: z.string().min(2).default("IN"),
  entities: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  indicators: z.array(z.string()).default([]),
  claims: z.array(z.string()).default([]),
  legalReferences: z.array(z.string()).default([]),
  relatedObservations: z.array(z.string()).default([]),
  sourceConfidence: z.number().min(0).max(1).default(0.7),
  corroborationCount: z.number().int().nonnegative().default(0),
  contradictionCount: z.number().int().nonnegative().default(0),
  admissionStatus: z.enum(["pending", "admitted", "rejected", "quarantined"]).default("pending"),
  policyDecision: z.record(z.string(), z.unknown()).optional(),
  humanReviewStatus: z.enum(["not_reviewed", "in_review", "approved", "rejected"]).default("not_reviewed"),
  evidenceEventId: z.string().optional(),
});
export type DISHAObservation = z.infer<typeof dishaObservationSchema>;

export const dishaEvidenceSchema = z.object({
  evidenceId: z.string().min(1),
  contentHash: z.string().min(16),
  vaultArtifactId: z.string().min(1),
  exactPassage: z.string().min(1),
  uri: z.string().min(1),
  retrievedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
  mimeType: z.string().min(1).default("text/plain"),
  sourceAuthority: z.string().min(1),
  sourceTier: sourceTrustTierSchema,
  collectorVersion: z.string().min(1).default("6.6.0"),
  state: evidenceLifecycleStateSchema.default("EXTRACTED"),
  provenanceHash: z.string().min(16),
});
export type DISHAEvidence = z.infer<typeof dishaEvidenceSchema>;

export const dishaClaimSchema = z.object({
  claimId: z.string().min(1),
  claimText: z.string().min(1),
  claimType: z.string().min(1).default("factual_assertion"),
  subject: z.string().min(1),
  predicate: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
  supportingEvidence: z.array(z.string()).default([]),
  contradictingEvidence: z.array(z.string()).default([]),
  sourceAuthority: z.string().min(1),
  sourceFamilyId: z.string().min(1),
  corroborationCount: z.number().int().nonnegative().default(0),
  confidence: z.number().min(0).max(1).default(0.5),
  createdBy: z.string().min(1),
  createdAt: z.string().datetime(),
  reviewState: z.enum(["unreviewed", "review_required", "analyst_approved", "disputed", "verified"]).default("unreviewed"),
  evidenceChainRef: z.string().optional(),
});
export type DISHAClaim = z.infer<typeof dishaClaimSchema>;

export const dishaEntitySchema = z.object({
  entityId: z.string().min(1),
  entityType: constitutionalEntityTypeSchema,
  name: z.string().min(1),
  canonicalIdentifier: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  attributes: z.record(z.string(), z.unknown()).default({}),
  confidence: z.number().min(0).max(1).default(0.8),
  firstObservedAt: z.string().datetime(),
  lastObservedAt: z.string().datetime(),
  provenanceHash: z.string().min(16),
});
export type DISHAEntity = z.infer<typeof dishaEntitySchema>;

export const dishaRelationshipSchema = z.object({
  relationshipId: z.string().min(1),
  sourceEntityId: z.string().min(1),
  targetEntityId: z.string().min(1),
  relationType: constitutionalRelationTypeSchema,
  sourceRef: z.string().min(1),
  retrievalTimestamp: z.string().datetime(),
  confidence: z.number().min(0).max(1).default(0.7),
  evidenceRef: z.string().min(1),
  contentHash: z.string().min(16),
  admissionStatus: z.enum(["pending", "admitted", "rejected"]).default("admitted"),
  reviewStatus: z.enum(["unreviewed", "reviewed", "contested"]).default("unreviewed"),
  actor: z.string().min(1),
  policyDecisionRef: z.string().optional(),
});
export type DISHARelationship = z.infer<typeof dishaRelationshipSchema>;

export const dishaObligationSchema = z.object({
  obligationId: z.string().min(1),
  authority: z.string().min(1),
  sourceLawOrOrder: z.string().min(1),
  dutyDescription: z.string().min(1),
  deadline: z.string().datetime().optional(),
  jurisdiction: z.string().min(2).default("IN"),
  complianceStatus: z.enum(["compliant", "non_compliant", "delayed", "unverified"]).default("unverified"),
  lastVerifiedAt: z.string().datetime().optional(),
  evidenceRefs: z.array(z.string()).default([]),
});
export type DISHAObligation = z.infer<typeof dishaObligationSchema>;

export const dishaContradictionSchema = z.object({
  contradictionId: z.string().min(1),
  claimA: z.string().min(1),
  claimB: z.string().min(1),
  evidenceA: z.string().min(1),
  evidenceB: z.string().min(1),
  conflictType: contradictionTypeSchema,
  explanation: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0.75),
  sourceIndependence: z.boolean().default(true),
  reviewRequired: z.literal(true).default(true),
  resolutionState: z.enum(["investigating", "sub judice", "resolved_temporal", "confirmed_contradiction", "dismissed"]).default("investigating"),
  createdAt: z.string().datetime(),
});
export type DISHAContradiction = z.infer<typeof dishaContradictionSchema>;

export const dishaCorroborationSchema = z.object({
  corroborationId: z.string().min(1),
  targetClaimId: z.string().min(1),
  sourceFamilyIds: z.array(z.string()).min(1),
  independentSourceCount: z.number().int().nonnegative(),
  rawLinkCount: z.number().int().nonnegative(),
  independenceRatio: z.number().min(0).max(1),
  corroborationScore: z.number().min(0).max(1),
  confidenceSummary: z.string().min(1),
  createdAt: z.string().datetime(),
});
export type DISHACorroboration = z.infer<typeof dishaCorroborationSchema>;

export const dishaEvidenceChainSchema = z.object({
  chainId: z.string().min(1),
  claimId: z.string().min(1),
  steps: z.array(
    z.object({
      stepIndex: z.number().int().nonnegative(),
      phase: z.enum([
        "SOURCE",
        "OBSERVATION",
        "POLICY",
        "EVIDENCE",
        "CORROBORATION",
        "CONTRADICTION",
        "REVIEW",
        "DECISION",
      ]),
      refId: z.string().min(1),
      contentHash: z.string().min(16),
      sourceAuthority: z.string().min(1),
      timestamp: z.string().datetime(),
      actor: z.string().min(1),
      isAiActor: z.boolean(),
    }),
  ),
  overallIntegrityHash: z.string().min(16),
});
export type DISHAEvidenceChain = z.infer<typeof dishaEvidenceChainSchema>;

export const dishaStateTransitionSchema = z.object({
  transitionId: z.string().min(1),
  targetType: z.enum(["evidence", "claim", "observation"]),
  targetId: z.string().min(1),
  previousState: evidenceLifecycleStateSchema,
  newState: evidenceLifecycleStateSchema,
  actor: z.string().min(1),
  isAiActor: z.boolean().default(false),
  reason: z.string().min(1),
  timestamp: z.string().datetime(),
  policyVersion: z.string().min(1).default("6.6.0"),
  evidenceRefs: z.array(z.string()).default([]),
  missionId: z.string().optional(),
  executionId: z.string().optional(),
  transitionHash: z.string().min(16),
});
export type DISHAStateTransition = z.infer<typeof dishaStateTransitionSchema>;

export type { EvidenceVaultArtifact, EvidenceVaultArtifact as DISHAEvidenceVaultArtifact } from "../evidence-vault";
