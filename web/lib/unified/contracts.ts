import { z } from "zod";

export const sensitivitySchema = z.enum(["public", "internal", "controlled", "classified"]);
export const lensNameSchema = z.enum(["cyber", "yudh_view", "quantum", "geospatial", "governance", "strategy"]);
export const policyDecisionSchema = z.enum(["ALLOW", "ASK_CONFIRMATION", "SANDBOX_ONLY", "READ_ONLY", "DENY", "ESCALATE"]);

export const evidenceFileSchema = z.object({
  name: z.string().min(1),
  mediaType: z.string().min(1).optional(),
  sha256: z.string().min(8).optional(),
  url: z.string().url().optional(),
});

export const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyM: z.number().nonnegative().optional(),
  label: z.string().optional(),
});

export const threatIndicatorSchema = z.object({
  type: z.enum(["ip", "domain", "url", "hash", "cve", "email", "other"]),
  value: z.string().min(1),
  source: z.string().optional(),
});

export const entitySchema = z.object({
  type: z.string().min(1),
  value: z.string().min(1),
});

export const dataSourceRefSchema = z.object({
  sourceId: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url().optional(),
  sensitivity: sensitivitySchema.default("public"),
});

export const dishaSignalSchema = z.object({
  id: z.string().min(1).max(128),
  timestamp: z.string().datetime(),
  userId: z.string().min(1).max(256),
  deviceId: z.string().max(256).optional(),
  missionId: z.string().max(128).optional(),
  input: z.object({
    rawText: z.string().max(20_000).default(""),
    files: z.array(evidenceFileSchema).default([]),
    locations: z.array(geoPointSchema).default([]),
    indicators: z.array(threatIndicatorSchema).default([]),
    requestedAction: z.string().max(2_000).optional(),
  }),
  context: z.object({
    intent: z.string().max(256).default("analysis"),
    entities: z.array(entitySchema).default([]),
    memoryRefs: z.array(z.string().max(256)).default([]),
    dataSources: z.array(dataSourceRefSchema).default([]),
    sensitivity: sensitivitySchema.default("public"),
  }),
  riskContext: z.object({
    userRole: z.string().default("analyst"),
    deviceTrust: z.number().min(0).max(1).default(0.7),
    actionRisk: z.number().min(0).max(1).default(0.2),
    dataSensitivityRisk: z.number().min(0).max(1).default(0.1),
    telemetryRisk: z.number().min(0).max(1).optional(),
  }),
});

export const findingSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  description: z.string(),
  evidenceIds: z.array(z.string()).default([]),
});

export const evidenceItemSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  sourceName: z.string(),
  evidenceClass: z.string(),
  summary: z.string(),
  url: z.string().url().optional(),
  retrievedAt: z.string().datetime(),
  provenanceHash: z.string(),
  fields: z.record(z.string(), z.unknown()).optional(),
});

export const actionProposalSchema = z.object({
  id: z.string(),
  label: z.string(),
  action: z.string(),
  risk: z.number().min(0).max(1),
  requiresApproval: z.boolean(),
});

export const dishaLensResultSchema = z.object({
  lens: lensNameSchema,
  summary: z.string(),
  findings: z.array(findingSchema),
  confidence: z.number().min(0).max(1),
  riskScore: z.number().min(0).max(1),
  evidence: z.array(evidenceItemSchema),
  recommendedActions: z.array(actionProposalSchema),
  policyRequired: z.boolean(),
});

export const policyDecisionResultSchema = z.object({
  decision: policyDecisionSchema,
  reasons: z.array(z.string()),
  riskScore: z.number().min(0).max(1),
  requiredApprovals: z.array(z.string()).optional(),
  evidenceEventId: z.string().optional(),
  safeFallback: z.string(),
});

export const evidenceEventSchema = z.object({
  eventId: z.string(),
  missionId: z.string().min(1),
  chainIndex: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  actor: z.string(),
  action: z.string(),
  inputHash: z.string(),
  outputHash: z.string().optional(),
  policyDecision: policyDecisionResultSchema.optional(),
  lensResults: z.array(z.string()).optional(),
  parentEventId: z.string().optional(),
  previousHash: z.string().optional(),
  payloadHash: z.string(),
  hashAlgorithm: z.literal("sha256").default("sha256"),
  ledgerVersion: z.literal(2).default(2),
  eventHash: z.string(),
});

export const openDataRecordSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  license: z.string(),
  url: z.string().url().optional(),
  retrievedAt: z.string().datetime(),
  data: z.unknown(),
  provenanceHash: z.string(),
});

export const controlledDataQuerySchema = z.object({
  missionId: z.string().min(1),
  userId: z.string().min(1),
  userRole: z.string().min(1),
  purpose: z.string().min(1),
  query: z.record(z.string(), z.unknown()).default({}),
});

export type DishaSignal = z.infer<typeof dishaSignalSchema>;
export type DishaLensResult = z.infer<typeof dishaLensResultSchema>;
export type PolicyDecision = z.infer<typeof policyDecisionResultSchema>;
export type EvidenceEvent = z.infer<typeof evidenceEventSchema>;
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
export type OpenDataRecord = z.infer<typeof openDataRecordSchema>;
export type ControlledDataQuery = z.infer<typeof controlledDataQuerySchema>;
export type LensName = z.infer<typeof lensNameSchema>;

export type ControlledDataResult = {
  connector: string;
  classificationLevel: "controlled" | "classified";
  authorized: boolean;
  records: unknown[];
  redactions: string[];
};

export interface DishaLens {
  name: LensName;
  domains: string[];
  analyze(signal: DishaSignal): Promise<DishaLensResult>;
}

export interface ControlledDataConnector {
  name: string;
  classificationLevel: "controlled" | "classified";
  authorize(userId: string, missionId: string): Promise<boolean>;
  query(request: ControlledDataQuery): Promise<ControlledDataResult>;
  redact(result: ControlledDataResult, userRole: string): Promise<ControlledDataResult>;
}
