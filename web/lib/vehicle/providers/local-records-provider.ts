import crypto from "node:crypto";
import { getDbPool } from "@/lib/server/db";
import type { NormalizedPlate, VehicleProviderHealth, VehicleQueryContext, VehicleVerificationResult } from "../types";
import type { ProviderLookupResult, VehicleProvider } from "./provider-interface";

export class LocalAuthorizedRecordsProvider implements VehicleProvider {
  readonly id = "local_authorized_records";
  readonly name = "DISHA Local Case Evidence Vault";
  readonly priority = 20; // Check local cache / case records after live providers
  readonly isLiveProvider = false;

  async health(): Promise<VehicleProviderHealth> {
    const pool = getDbPool();
    if (!pool) {
      return {
        id: this.id,
        name: this.name,
        status: "unavailable",
        configured: false,
        detail: "PostgreSQL database pool not connected.",
      };
    }
    try {
      await pool.query("SELECT 1 FROM vehicle_verifications LIMIT 1");
      return {
        id: this.id,
        name: this.name,
        status: "healthy",
        configured: true,
        latencyMs: 2,
        detail: "Persistent PostgreSQL case vehicle evidence store active and indexed.",
      };
    } catch (err) {
      return {
        id: this.id,
        name: this.name,
        status: "degraded",
        configured: true,
        detail: `Database query failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async verifyRegistration(plate: NormalizedPlate, context: VehicleQueryContext): Promise<ProviderLookupResult> {
    const pool = getDbPool();
    if (!pool) {
      return { success: false, error: "Database unavailable" };
    }

    try {
      const res = await pool.query(
        `SELECT * FROM vehicle_verifications 
         WHERE normalized_number = $1 
         ORDER BY retrieved_at DESC 
         LIMIT 1`,
        [plate.normalized],
      );

      if (!res.rows.length) {
        return { success: false, error: "No local record found" };
      }

      const row = res.rows[0];
      if (row.status === "PUBLIC_REFERENCE" && !row.manufacturer) {
        return { success: false, error: "Cached public reference record is incomplete" };
      }
      const mappedResult = mapDbRowToVerificationResult(row, context);
      return {
        success: true,
        result: mappedResult,
        rawPayload: mappedResult.raw_payload,
      };
    } catch (err) {
      return {
        success: false,
        error: `Database lookup error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

export function mapDbRowToVerificationResult(
  row: Record<string, any>,
  context: VehicleQueryContext = { purpose: "fetch_record" },
): VehicleVerificationResult {
  const now = new Date();
  const utcTime = now.toISOString();
  const istTime = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });

  const rawPayload = (row.payload && typeof row.payload === "object" ? row.payload : {}) as Record<string, unknown>;
  const payloadOwner = (rawPayload.owner_info && typeof rawPayload.owner_info === "object" ? rawPayload.owner_info : {}) as Record<string, any>;
  const rawHash = row.raw_response_hash_sha256 || crypto.createHash("sha256").update(JSON.stringify(rawPayload)).digest("hex");
  const normHash = row.normalized_hash_sha256 || crypto.createHash("sha256").update(row.normalized_number || "").digest("hex");

  return {
    registration_number: row.normalized_number,
    status: row.status as VehicleVerificationResult["status"],
    data_type: "case_record",
    source: `Local Case Evidence (Original: ${row.provider_id})`,
    provider_id: "local_authorized_records",
    retrieved_at: row.retrieved_at ? new Date(row.retrieved_at).toISOString() : utcTime,
    retrieved_at_ist: row.retrieved_at
      ? new Date(row.retrieved_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false })
      : istTime,
    plate: {
      raw: row.registration_number,
      normalized: row.normalized_number,
      format: row.plate_format || "standard_state",
      isValid: true,
      stateCode: row.state_code,
      stateName: row.state_name,
      rtoCode: row.rto_code,
      rtoName: row.rto_name,
    },
    vehicle: {
      registrationNumber: row.normalized_number,
      registrationDate: row.registration_date ? new Date(row.registration_date).toISOString().slice(0, 10) : null,
      state: row.state_name,
      stateCode: row.state_code,
      rto: row.rto_name,
      rtoCode: row.rto_code,
      vehicleCategory: (row.vehicle_category || "unknown") as VehicleVerificationResult["vehicle"]["vehicleCategory"],
      vehicleClass: row.vehicle_class,
      manufacturer: row.manufacturer,
      model: row.model,
      modelVariant: row.model_variant,
      fuelType: row.fuel_type,
      color: row.color,
      manufacturingMonthYear: row.manufacturing_year_month,
      emissionNorms: row.emission_norms,
      engineCapacityCc: row.engine_capacity_cc,
      seatingCapacity: row.seating_capacity,
      bodyType: null,
      unladenWeightKg: null,
      grossVehicleWeightKg: null,
      wheelbaseMm: null,
      statusAsOn: row.retrieved_at ? new Date(row.retrieved_at).toISOString() : null,
      rcStatus: row.status === "VERIFIED" ? "ACTIVE" : row.status,
      rcFinancer: row.financer,
      isFinanced: Boolean(row.is_financed),
    },
    compliance: {
      insuranceStatus: calculateExpiryState(row.insurance_valid_until),
      insuranceCompany: row.insurance_company,
      insurancePolicyNumber: row.insurance_policy_number,
      insuranceValidUntil: row.insurance_valid_until ? new Date(row.insurance_valid_until).toISOString().slice(0, 10) : null,
      daysUntilInsuranceExpiry: calculateDaysUntil(row.insurance_valid_until),

      pucStatus: calculateExpiryState(row.puc_valid_until),
      pucNumber: row.puc_number,
      pucValidUntil: row.puc_valid_until ? new Date(row.puc_valid_until).toISOString().slice(0, 10) : null,
      daysUntilPucExpiry: calculateDaysUntil(row.puc_valid_until),

      fitnessStatus: calculateExpiryState(row.fitness_valid_until),
      fitnessValidUntil: row.fitness_valid_until ? new Date(row.fitness_valid_until).toISOString().slice(0, 10) : null,
      daysUntilFitnessExpiry: calculateDaysUntil(row.fitness_valid_until),

      taxStatus: calculateExpiryState(row.tax_valid_until),
      taxValidUntil: row.tax_valid_until ? new Date(row.tax_valid_until).toISOString().slice(0, 10) : null,
      isLifetimeTax: row.tax_valid_until ? false : true,
    },
    owner_info: {
      ownerName: payloadOwner.ownerName || row.masked_owner_name || "[MASKED]",
      fatherName: payloadOwner.fatherName || row.masked_father_name,
      mobileNumber: payloadOwner.mobileNumber || null,
      permanentAddress: payloadOwner.permanentAddress || null,
      presentAddress: payloadOwner.presentAddress || null,
      chassisNumber: payloadOwner.chassisNumber || row.masked_chassis_number,
      engineNumber: payloadOwner.engineNumber || row.masked_engine_number,
      isMasked: Boolean(payloadOwner.isMasked ?? false),
      unmaskedOwnerName: payloadOwner.unmaskedOwnerName || payloadOwner.ownerName?.replace(/^\[PROTECTED\]\s*/, "") || row.masked_owner_name?.replace(/^\[PROTECTED\]\s*/, "") || null,
      unmaskedFatherName: payloadOwner.unmaskedFatherName || payloadOwner.fatherName?.replace(/^\[PROTECTED\]\s*/, "") || row.masked_father_name?.replace(/^\[PROTECTED\]\s*/, "") || null,
      unmaskedMobileNumber: payloadOwner.unmaskedMobileNumber || payloadOwner.mobileNumber || null,
      unmaskedPermanentAddress: payloadOwner.unmaskedPermanentAddress || payloadOwner.permanentAddress || null,
      unmaskedPresentAddress: payloadOwner.unmaskedPresentAddress || payloadOwner.presentAddress || null,
      unmaskedChassisNumber: payloadOwner.unmaskedChassisNumber || payloadOwner.chassisNumber?.replace(/^\[MASKED\]\s*/, "") || row.masked_chassis_number?.replace(/^\[MASKED\]\s*/, "") || null,
      unmaskedEngineNumber: payloadOwner.unmaskedEngineNumber || payloadOwner.engineNumber?.replace(/^\[MASKED\]\s*/, "") || row.masked_engine_number?.replace(/^\[MASKED\]\s*/, "") || null,
    },
    evidence: {
      sourceId: "local_authorized_records",
      sourceName: "DISHA Local Case Evidence Vault",
      sourceReference: `LOCAL-CASE-${row.id}`,
      retrievedAtUtc: utcTime,
      retrievedAtIst: istTime,
      rawResponseHashSha256: rawHash,
      normalizedHashSha256: normHash,
      caseId: context.caseId || row.case_id || null,
      investigatorId: context.investigatorId || row.investigator_id || null,
      purpose: context.purpose,
      dataFreshness: "cached",
      integrityStatus: "tamper_evident_anchored",
      recordId: row.id,
      verificationId: row.id,
    },
    warnings: [
      `Retrieved from persistent case vault. Originally fetched via ${row.provider_id} on ${new Date(row.retrieved_at).toLocaleDateString("en-IN")}.`,
    ],
    raw_payload: rawPayload,
  };
}

function calculateDaysUntil(dateVal?: string | Date | null): number | null {
  if (!dateVal) return null;
  const target = new Date(dateVal).getTime();
  if (isNaN(target)) return null;
  const diffMs = target - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function calculateExpiryState(dateVal?: string | Date | null): "VALID" | "EXPIRING_SOON" | "EXPIRED" | "UNAVAILABLE" {
  const days = calculateDaysUntil(dateVal);
  if (days === null) return "UNAVAILABLE";
  if (days < 0) return "EXPIRED";
  if (days <= 30) return "EXPIRING_SOON";
  return "VALID";
}
