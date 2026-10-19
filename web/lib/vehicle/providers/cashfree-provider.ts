import crypto from "node:crypto";
import type { NormalizedPlate, VehicleCategory, VehicleProviderHealth, VehicleQueryContext, VehicleVerificationResult } from "../types";
import type { ProviderLookupResult, VehicleProvider } from "./provider-interface";

export class CashfreeVehicleProvider implements VehicleProvider {
  readonly id = "cashfree_verification";
  readonly name = "Cashfree Verification Suite (RC API)";
  readonly priority = 1; // Primary commercial live provider
  readonly isLiveProvider = true;

  private getCredentials() {
    const clientId = process.env.CASHFREE_CLIENT_ID?.trim() || "";
    const clientSecret = process.env.CASHFREE_CLIENT_SECRET?.trim() || "";
    const envMode = (process.env.CASHFREE_ENV?.trim() || "sandbox").toLowerCase();
    const enabled = process.env.CASHFREE_VEHICLE_ENABLED === "true";
    const baseUrl = envMode === "production" ? "https://api.cashfree.com" : "https://sandbox.cashfree.com";
    return { clientId, clientSecret, envMode, enabled, baseUrl };
  }

  async health(): Promise<VehicleProviderHealth> {
    const { clientId, clientSecret, enabled, envMode } = this.getCredentials();
    if (!enabled || !clientId || !clientSecret) {
      return {
        id: this.id,
        name: this.name,
        status: "unavailable",
        configured: false,
        detail: enabled
          ? "Cashfree credentials missing (CASHFREE_CLIENT_ID / CASHFREE_CLIENT_SECRET required)."
          : "Cashfree vehicle lookup disabled in environment (CASHFREE_VEHICLE_ENABLED=false).",
      };
    }

    return {
      id: this.id,
      name: this.name,
      status: "healthy",
      configured: true,
      detail: `Cashfree Verification Gateway configured in ${envMode.toUpperCase()} mode.`,
    };
  }

  async verifyRegistration(plate: NormalizedPlate, context: VehicleQueryContext): Promise<ProviderLookupResult> {
    const { clientId, clientSecret, enabled, baseUrl, envMode } = this.getCredentials();

    if (!enabled || !clientId || !clientSecret) {
      return {
        success: false,
        unauthorized: true,
        error: "Cashfree verification provider is not configured with active credentials.",
      };
    }

    const verificationId = `DISHA-RC-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const endpoint = `${baseUrl}/verification/vehicle-rc`;

    const now = new Date();
    const utcTime = now.toISOString();
    const istTime = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": clientId,
          "x-client-secret": clientSecret,
          "x-api-version": "2024-03-01",
        },
        body: JSON.stringify({
          vehicle_number: plate.normalized,
          verification_id: verificationId,
        }),
        signal: context.signal ?? AbortSignal.timeout(12000),
      });

      const rawPayload = (await response.json()) as Record<string, unknown>;
      const rawPayloadString = JSON.stringify(rawPayload);
      const rawHash = crypto.createHash("sha256").update(rawPayloadString).digest("hex");

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          unauthorized: true,
          statusCode: response.status,
          error: "Cashfree authentication failed. Verify API credentials.",
          rawPayload,
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          rateLimited: true,
          statusCode: 429,
          error: "Cashfree API rate limit exceeded.",
          rawPayload,
        };
      }

      const statusField = String(rawPayload.status || "").toUpperCase();

      if (response.status === 404 || statusField === "NOT_FOUND" || statusField === "INVALID") {
        return {
          success: true,
          result: {
            registration_number: plate.normalized,
            status: "NOT_FOUND",
            data_type: envMode === "sandbox" ? "sandbox_data" : "live_provider_response",
            source: `Cashfree (${envMode})`,
            provider_id: this.id,
            retrieved_at: utcTime,
            retrieved_at_ist: istTime,
            plate,
            vehicle: this.emptySpecs(plate),
            compliance: this.emptyCompliance(),
            owner_info: this.emptyOwner(),
            evidence: {
              sourceId: this.id,
              sourceName: this.name,
              sourceReference: String(rawPayload.reference_id || verificationId),
              retrievedAtUtc: utcTime,
              retrievedAtIst: istTime,
              rawResponseHashSha256: rawHash,
              normalizedHashSha256: rawHash,
              caseId: context.caseId ?? null,
              investigatorId: context.investigatorId ?? null,
              purpose: context.purpose,
              dataFreshness: envMode === "sandbox" ? "sandbox" : "live",
              integrityStatus: "tamper_evident_anchored",
            },
            warnings: ["Vehicle registration number not found in VAHAN database via Cashfree."],
            raw_payload: rawPayload,
          },
          rawPayload,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          statusCode: response.status,
          error: `Cashfree returned HTTP ${response.status}: ${JSON.stringify(rawPayload.message || rawPayload)}`,
          rawPayload,
        };
      }

      // Map verified response
      const v = rawPayload;
      const vehicleCategory = mapVehicleCategory(String(v.class || v.type || v.vehicle_category || ""));

      const specs = {
        registrationNumber: plate.normalized,
        registrationDate: parseDateString(v.reg_date),
        state: plate.stateName ?? null,
        stateCode: plate.stateCode ?? null,
        rto: (v.reg_authority as string) || plate.rtoName || null,
        rtoCode: plate.rtoCode ?? null,
        vehicleCategory,
        vehicleClass: (v.class as string) || (v.type as string) || null,
        manufacturer: (v.vehicle_manufacturer_name as string) || null,
        model: (v.model as string) || null,
        modelVariant: null,
        fuelType: (v.type as string) || null,
        color: (v.vehicle_color as string) || null,
        manufacturingMonthYear: (v.vehicle_manufacturing_month_year as string) || null,
        emissionNorms: (v.norms_type as string) || null,
        engineCapacityCc: parseNumber(v.vehicle_cubic_capacity),
        seatingCapacity: parseNumber(v.vehicle_seat_capacity),
        bodyType: (v.body_type as string) || null,
        unladenWeightKg: parseNumber(v.unladen_weight),
        grossVehicleWeightKg: parseNumber(v.gross_vehicle_weight),
        wheelbaseMm: parseNumber(v.wheelbase),
        statusAsOn: (v.status_as_on as string) || utcTime,
        rcStatus: (v.rc_status as string) || "ACTIVE",
        rcFinancer: (v.rc_financer as string) || null,
        isFinanced: Boolean(v.rc_financer),
      };

      const compliance = {
        insuranceStatus: calculateExpiryState(v.vehicle_insurance_upto),
        insuranceCompany: (v.vehicle_insurance_company_name as string) || null,
        insurancePolicyNumber: (v.vehicle_insurance_policy_number as string) || null,
        insuranceValidUntil: parseDateString(v.vehicle_insurance_upto),
        daysUntilInsuranceExpiry: calculateDaysUntil(v.vehicle_insurance_upto),

        pucStatus: calculateExpiryState(v.vehicle_puc_upto),
        pucNumber: (v.vehicle_puc_number as string) || (v.puc_number as string) || null,
        pucValidUntil: parseDateString(v.vehicle_puc_upto),
        daysUntilPucExpiry: calculateDaysUntil(v.vehicle_puc_upto),

        fitnessStatus: calculateExpiryState(v.rc_fitness_upto),
        fitnessValidUntil: parseDateString(v.rc_fitness_upto),
        daysUntilFitnessExpiry: calculateDaysUntil(v.rc_fitness_upto),

        taxStatus: calculateExpiryState(v.vehicle_tax_upto),
        taxValidUntil: parseDateString(v.vehicle_tax_upto),
        isLifetimeTax: String(v.vehicle_tax_upto || "").toUpperCase().includes("LTT"),
      };

      const ownerInfo = {
        ownerName: maskString(v.owner as string),
        fatherName: maskString(v.owner_father_name as string),
        mobileNumber: maskMobile(v.mobile_number as string),
        permanentAddress: maskAddress(v.permanent_address as string),
        presentAddress: maskAddress(v.present_address as string),
        chassisNumber: maskChassis(v.chassis as string),
        engineNumber: maskEngine(v.engine as string),
        isMasked: true,
      };

      const normHash = crypto.createHash("sha256").update(JSON.stringify(specs)).digest("hex");

      const result: VehicleVerificationResult = {
        registration_number: plate.normalized,
        status: envMode === "sandbox" ? "SANDBOX_RESULT" : "VERIFIED",
        data_type: envMode === "sandbox" ? "sandbox_data" : "live_provider_response",
        source: `Cashfree Verification API (${envMode})`,
        provider_id: this.id,
        retrieved_at: utcTime,
        retrieved_at_ist: istTime,
        plate,
        vehicle: specs,
        compliance,
        owner_info: ownerInfo,
        evidence: {
          sourceId: this.id,
          sourceName: this.name,
          sourceReference: String(v.reference_id || verificationId),
          retrievedAtUtc: utcTime,
          retrievedAtIst: istTime,
          rawResponseHashSha256: rawHash,
          normalizedHashSha256: normHash,
          caseId: context.caseId ?? null,
          investigatorId: context.investigatorId ?? null,
          purpose: context.purpose,
          dataFreshness: envMode === "sandbox" ? "sandbox" : "live",
          integrityStatus: "tamper_evident_anchored",
        },
        raw_payload: rawPayload,
      };

      return {
        success: true,
        result,
        rawPayload,
      };
    } catch (err) {
      return {
        success: false,
        error: `Cashfree request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private emptySpecs(plate: NormalizedPlate) {
    return {
      registrationNumber: plate.normalized,
      registrationDate: null,
      state: plate.stateName ?? null,
      stateCode: plate.stateCode ?? null,
      rto: plate.rtoName ?? null,
      rtoCode: plate.rtoCode ?? null,
      vehicleCategory: "unknown" as const,
      vehicleClass: null,
      manufacturer: null,
      model: null,
      modelVariant: null,
      fuelType: null,
      color: null,
      manufacturingMonthYear: null,
      emissionNorms: null,
      engineCapacityCc: null,
      seatingCapacity: null,
      bodyType: null,
      unladenWeightKg: null,
      grossVehicleWeightKg: null,
      wheelbaseMm: null,
      statusAsOn: null,
      rcStatus: "NOT_FOUND",
      rcFinancer: null,
      isFinanced: false,
    };
  }

  private emptyCompliance() {
    return {
      insuranceStatus: "UNAVAILABLE" as const,
      insuranceCompany: null,
      insurancePolicyNumber: null,
      insuranceValidUntil: null,
      daysUntilInsuranceExpiry: null,
      pucStatus: "UNAVAILABLE" as const,
      pucNumber: null,
      pucValidUntil: null,
      daysUntilPucExpiry: null,
      fitnessStatus: "UNAVAILABLE" as const,
      fitnessValidUntil: null,
      daysUntilFitnessExpiry: null,
      taxStatus: "UNAVAILABLE" as const,
      taxValidUntil: null,
      isLifetimeTax: false,
    };
  }

  private emptyOwner() {
    return {
      ownerName: null,
      fatherName: null,
      mobileNumber: null,
      permanentAddress: null,
      presentAddress: null,
      chassisNumber: null,
      engineNumber: null,
      isMasked: true,
    };
  }
}

function parseNumber(val: unknown): number | null {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseInt(val.replace(/[^\d]/g, ""), 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseDateString(val: unknown): string | null {
  if (!val || typeof val !== "string") return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return val.trim();
  return d.toISOString().slice(0, 10);
}

function calculateDaysUntil(dateVal?: unknown): number | null {
  if (!dateVal || typeof dateVal !== "string") return null;
  const target = new Date(dateVal).getTime();
  if (isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

function calculateExpiryState(dateVal?: unknown): "VALID" | "EXPIRING_SOON" | "EXPIRED" | "UNAVAILABLE" {
  const days = calculateDaysUntil(dateVal);
  if (days === null) return "UNAVAILABLE";
  if (days < 0) return "EXPIRED";
  if (days <= 30) return "EXPIRING_SOON";
  return "VALID";
}

function mapVehicleCategory(desc: string): VehicleCategory {
  const s = desc.toLowerCase();
  if (/scooter|motorcycle|moped|2w|two[-\s]?wheeler|bike/.test(s)) return "two_wheeler";
  if (/autorickshaw|rickshaw|three[-\s]?wheeler|3w/.test(s)) return "three_wheeler";
  if (/car|sedan|hatchback|suv|muv|jeep|motor car/.test(s)) return "car";
  if (/bus|coach|mini bus/.test(s)) return "bus";
  if (/truck|hgv|goods|heavy|lorry|tipper|tanker/.test(s)) return "heavy_goods";
  if (/electric|ev\b|battery/.test(s)) return "electric_vehicle";
  if (/tractor|crane|dumper|excavator|construction/.test(s)) return "construction_equipment";
  if (/commercial|taxi|cab|transport/.test(s)) return "commercial_transport";
  return "unknown";
}

function maskString(str?: string | null): string | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (trimmed.length <= 2) return "*".repeat(trimmed.length);
  const words = trimmed.split(/\s+/);
  return words
    .map((w) => (w.length > 2 ? `${w[0]}${"*".repeat(w.length - 2)}${w[w.length - 1]}` : `${w[0]}*`))
    .join(" ");
}

function maskMobile(phone?: string | null): string | null {
  if (!phone) return null;
  const clean = phone.replace(/[^\d]/g, "");
  if (clean.length < 6) return "******";
  return `${clean.slice(0, 2)}******${clean.slice(-2)}`;
}

function maskAddress(addr?: string | null): string | null {
  if (!addr) return null;
  const parts = addr.split(",");
  return parts.length > 1
    ? `[Address Masked], ${parts[parts.length - 1].trim()}`
    : "[Address Masked for Privacy]";
}

function maskChassis(chassis?: string | null): string | null {
  if (!chassis) return null;
  const c = chassis.trim();
  if (c.length <= 4) return "****";
  return `****${c.slice(-4)}`;
}

function maskEngine(engine?: string | null): string | null {
  if (!engine) return null;
  const e = engine.trim();
  if (e.length <= 4) return "****";
  return `****${e.slice(-4)}`;
}
