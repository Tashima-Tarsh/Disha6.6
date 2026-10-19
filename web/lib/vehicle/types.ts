import { z } from "zod";

export const vehiclePlateFormatSchema = z.enum([
  "standard_state",
  "bharat_series",
  "diplomatic",
  "vintage",
  "military",
  "temporary",
  "unknown",
]);

export type VehiclePlateFormat = z.infer<typeof vehiclePlateFormatSchema>;

export const vehicleVerificationStatusSchema = z.enum([
  "VERIFIED",
  "NOT_FOUND",
  "RESTRICTED",
  "PROVIDER_UNAVAILABLE",
  "SANDBOX_RESULT",
  "PUBLIC_REFERENCE",
]);

export type VehicleVerificationStatus = z.infer<typeof vehicleVerificationStatusSchema>;

export const vehicleDataTypeSchema = z.enum([
  "live_provider_response",
  "public_reference",
  "case_record",
  "sandbox_data",
]);

export type VehicleDataType = z.infer<typeof vehicleDataTypeSchema>;

export const vehicleCategorySchema = z.enum([
  "two_wheeler",
  "three_wheeler",
  "car",
  "commercial_transport",
  "bus",
  "heavy_goods",
  "construction_equipment",
  "electric_vehicle",
  "special_purpose",
  "unknown",
]);

export type VehicleCategory = z.infer<typeof vehicleCategorySchema>;

export const complianceStateSchema = z.enum(["VALID", "EXPIRING_SOON", "EXPIRED", "UNAVAILABLE"]);
export type ComplianceState = z.infer<typeof complianceStateSchema>;

export interface NormalizedPlate {
  raw: string;
  normalized: string;
  format: VehiclePlateFormat;
  isValid: boolean;
  stateCode?: string;
  stateName?: string;
  rtoCode?: string;
  rtoName?: string;
  bhYear?: number;
  series?: string;
  serialNumber?: string;
  error?: string;
}

export interface VehicleQueryContext {
  caseId?: string;
  investigatorId?: string;
  actorRole?: string;
  purpose: string;
  consentConfirmed?: boolean;
  allowCached?: boolean;
  preferredProvider?: string;
  ipAddress?: string;
  signal?: AbortSignal;
}

export interface VehicleSpecs {
  registrationNumber: string;
  registrationDate: string | null;
  state: string | null;
  stateCode: string | null;
  rto: string | null;
  rtoCode: string | null;
  vehicleCategory: VehicleCategory;
  vehicleClass: string | null;
  manufacturer: string | null;
  model: string | null;
  modelVariant: string | null;
  fuelType: string | null;
  color: string | null;
  manufacturingMonthYear: string | null;
  emissionNorms: string | null;
  engineCapacityCc: number | null;
  seatingCapacity: number | null;
  bodyType: string | null;
  unladenWeightKg: number | null;
  grossVehicleWeightKg: number | null;
  wheelbaseMm: number | null;
  statusAsOn: string | null;
  rcStatus: string | null;
  rcFinancer: string | null;
  isFinanced: boolean;
}

export interface VehicleCompliance {
  insuranceStatus: ComplianceState;
  insuranceCompany: string | null;
  insurancePolicyNumber: string | null;
  insuranceValidUntil: string | null;
  daysUntilInsuranceExpiry: number | null;

  pucStatus: ComplianceState;
  pucNumber: string | null;
  pucValidUntil: string | null;
  daysUntilPucExpiry: number | null;

  fitnessStatus: ComplianceState;
  fitnessValidUntil: string | null;
  daysUntilFitnessExpiry: number | null;

  taxStatus: ComplianceState;
  taxValidUntil: string | null;
  isLifetimeTax: boolean;

  permitStatus?: ComplianceState;
  permitType?: string | null;
  permitValidUntil?: string | null;
}

export interface MaskedOwnerInfo {
  ownerName: string | null;
  fatherName: string | null;
  mobileNumber: string | null;
  permanentAddress: string | null;
  presentAddress: string | null;
  chassisNumber: string | null;
  engineNumber: string | null;
  isMasked: boolean;
  unmaskedOwnerName?: string | null;
  unmaskedFatherName?: string | null;
  unmaskedMobileNumber?: string | null;
  unmaskedPermanentAddress?: string | null;
  unmaskedPresentAddress?: string | null;
  unmaskedChassisNumber?: string | null;
  unmaskedEngineNumber?: string | null;
  unmaskingAuditLogged?: boolean;
}

export interface EvidenceBlock {
  sourceId: string;
  sourceName: string;
  sourceReference: string | null;
  retrievedAtUtc: string;
  retrievedAtIst: string;
  rawResponseHashSha256: string;
  normalizedHashSha256: string;
  caseId: string | null;
  investigatorId: string | null;
  purpose: string;
  dataFreshness: "live" | "cached" | "reference_archive" | "sandbox";
  integrityStatus: "tamper_evident_anchored" | "ephemeral_unpersisted";
  recordId?: string;
  verificationId?: string;
}

export interface VehicleVerificationResult {
  registration_number: string;
  status: VehicleVerificationStatus;
  data_type: VehicleDataType;
  source: string;
  provider_id: string;
  retrieved_at: string;
  retrieved_at_ist: string;
  plate: NormalizedPlate;
  vehicle: VehicleSpecs;
  compliance: VehicleCompliance;
  owner_info: MaskedOwnerInfo;
  evidence: EvidenceBlock;
  warnings?: string[];
  raw_payload?: Record<string, unknown>;
}

export const vehicleLookupRequestSchema = z
  .object({
    registration_number: z.string().min(2).max(30).optional(),
    registrationNumber: z.string().min(2).max(30).optional(),
    case_id: z.string().optional(),
    caseId: z.string().optional(),
    purpose: z.string().optional().default("vehicle_registration_verification"),
    consent_confirmed: z.boolean().optional().default(true),
    consentConfirmed: z.boolean().optional(),
    allow_cached: z.boolean().optional().default(true),
    allowCached: z.boolean().optional(),
    preferred_provider: z.string().optional(),
    preferredProvider: z.string().optional(),
  })
  .transform((data) => ({
    registration_number: (data.registration_number || data.registrationNumber || "").trim(),
    case_id: data.case_id || data.caseId,
    purpose: data.purpose || "vehicle_registration_verification",
    consent_confirmed: data.consentConfirmed !== undefined ? data.consentConfirmed : data.consent_confirmed,
    allow_cached: data.allowCached !== undefined ? data.allowCached : data.allow_cached,
    preferred_provider: data.preferred_provider || data.preferredProvider,
  }))
  .refine((data) => data.registration_number.length >= 2, {
    message: "registration_number is required",
    path: ["registration_number"],
  });

export type VehicleLookupRequest = {
  registration_number: string;
  case_id?: string;
  purpose?: string;
  consent_confirmed?: boolean;
  allow_cached?: boolean;
  preferred_provider?: string;
};

export interface VehicleProviderHealth {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "unavailable";
  configured: boolean;
  latencyMs?: number;
  detail: string;
}
