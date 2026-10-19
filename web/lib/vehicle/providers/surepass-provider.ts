import crypto from "node:crypto";
import type { NormalizedPlate, VehicleCategory, VehicleProviderHealth, VehicleQueryContext, VehicleVerificationResult } from "../types";
import type { ProviderLookupResult, VehicleProvider } from "./provider-interface";

export class SurepassVehicleProvider implements VehicleProvider {
  readonly id = "surepass_verification";
  readonly name = "Surepass Vehicle Intelligence API";
  readonly priority = 2;
  readonly isLiveProvider = true;

  private getCredentials() {
    const apiKey = process.env.SUREPASS_API_KEY?.trim() || "";
    const enabled = process.env.SUREPASS_ENABLED === "true";
    const baseUrl = process.env.SUREPASS_BASE_URL?.trim() || "https://kyc-api.surepass.io";
    return { apiKey, enabled, baseUrl };
  }

  async health(): Promise<VehicleProviderHealth> {
    const { apiKey, enabled, baseUrl } = this.getCredentials();
    if (!enabled || !apiKey) {
      return {
        id: this.id,
        name: this.name,
        status: "unavailable",
        configured: false,
        detail: enabled
          ? "Surepass API key missing (SUREPASS_API_KEY required)."
          : "Surepass vehicle verification disabled (SUREPASS_ENABLED=false).",
      };
    }

    return {
      id: this.id,
      name: this.name,
      status: "healthy",
      configured: true,
      detail: `Surepass RC Verification gateway configured at ${baseUrl}.`,
    };
  }

  async verifyRegistration(plate: NormalizedPlate, context: VehicleQueryContext): Promise<ProviderLookupResult> {
    const { apiKey, enabled, baseUrl } = this.getCredentials();

    if (!enabled || !apiKey) {
      return {
        success: false,
        unauthorized: true,
        error: "Surepass provider is not configured with active credentials.",
      };
    }

    const endpoint = `${baseUrl}/api/v1/rc/rc-full`;
    const now = new Date();
    const utcTime = now.toISOString();
    const istTime = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          id_number: plate.normalized,
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
          error: "Surepass authentication failed. Check SUREPASS_API_KEY.",
          rawPayload,
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          rateLimited: true,
          statusCode: 429,
          error: "Surepass rate limit exceeded.",
          rawPayload,
        };
      }

      const isSuccess = Boolean(rawPayload.success);
      const data = (rawPayload.data && typeof rawPayload.data === "object" ? rawPayload.data : {}) as Record<string, unknown>;

      if (!response.ok || !isSuccess) {
        const msg = String(rawPayload.message || "");
        if (response.status === 404 || /not found|invalid/i.test(msg)) {
          return {
            success: true,
            result: {
              registration_number: plate.normalized,
              status: "NOT_FOUND",
              data_type: "live_provider_response",
              source: "Surepass RC API",
              provider_id: this.id,
              retrieved_at: utcTime,
              retrieved_at_ist: istTime,
              plate,
              vehicle: {
                registrationNumber: plate.normalized,
                registrationDate: null,
                state: plate.stateName ?? null,
                stateCode: plate.stateCode ?? null,
                rto: plate.rtoName ?? null,
                rtoCode: plate.rtoCode ?? null,
                vehicleCategory: "unknown",
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
              },
              compliance: {
                insuranceStatus: "UNAVAILABLE",
                insuranceCompany: null,
                insurancePolicyNumber: null,
                insuranceValidUntil: null,
                daysUntilInsuranceExpiry: null,
                pucStatus: "UNAVAILABLE",
                pucNumber: null,
                pucValidUntil: null,
                daysUntilPucExpiry: null,
                fitnessStatus: "UNAVAILABLE",
                fitnessValidUntil: null,
                daysUntilFitnessExpiry: null,
                taxStatus: "UNAVAILABLE",
                taxValidUntil: null,
                isLifetimeTax: false,
              },
              owner_info: {
                ownerName: null,
                fatherName: null,
                mobileNumber: null,
                permanentAddress: null,
                presentAddress: null,
                chassisNumber: null,
                engineNumber: null,
                isMasked: true,
              },
              evidence: {
                sourceId: this.id,
                sourceName: this.name,
                sourceReference: String(rawPayload.client_id || plate.normalized),
                retrievedAtUtc: utcTime,
                retrievedAtIst: istTime,
                rawResponseHashSha256: rawHash,
                normalizedHashSha256: rawHash,
                caseId: context.caseId ?? null,
                investigatorId: context.investigatorId ?? null,
                purpose: context.purpose,
                dataFreshness: "live",
                integrityStatus: "tamper_evident_anchored",
              },
              warnings: ["Vehicle registration not found in VAHAN records via Surepass."],
              raw_payload: rawPayload,
            },
            rawPayload,
          };
        }

        return {
          success: false,
          statusCode: response.status,
          error: `Surepass returned error: ${msg || response.statusText}`,
          rawPayload,
        };
      }

      const vehicleCategory = mapVehicleCategory(String(data.vehicle_category || data.vehicle_class || ""));
      const specs = {
        registrationNumber: plate.normalized,
        registrationDate: parseDateString(data.registration_date),
        state: plate.stateName ?? null,
        stateCode: plate.stateCode ?? null,
        rto: (data.registered_at as string) || plate.rtoName || null,
        rtoCode: plate.rtoCode ?? null,
        vehicleCategory,
        vehicleClass: (data.vehicle_class as string) || null,
        manufacturer: (data.maker_description as string) || null,
        model: (data.maker_model as string) || null,
        modelVariant: null,
        fuelType: (data.fuel_type as string) || null,
        color: (data.color as string) || null,
        manufacturingMonthYear: (data.manufacturing_date as string) || null,
        emissionNorms: (data.norms_type as string) || null,
        engineCapacityCc: parseNumber(data.cubic_capacity),
        seatingCapacity: parseNumber(data.seat_capacity),
        bodyType: (data.body_type as string) || null,
        unladenWeightKg: parseNumber(data.unladen_weight),
        grossVehicleWeightKg: parseNumber(data.gross_vehicle_weight),
        wheelbaseMm: parseNumber(data.wheelbase),
        statusAsOn: utcTime,
        rcStatus: (data.rc_status as string) || "ACTIVE",
        rcFinancer: (data.financer as string) || null,
        isFinanced: Boolean(data.financer),
      };

      const compliance = {
        insuranceStatus: calculateExpiryState(data.insurance_upto),
        insuranceCompany: (data.insurance_company as string) || null,
        insurancePolicyNumber: (data.insurance_policy_number as string) || null,
        insuranceValidUntil: parseDateString(data.insurance_upto),
        daysUntilInsuranceExpiry: calculateDaysUntil(data.insurance_upto),

        pucStatus: calculateExpiryState(data.pucc_upto),
        pucNumber: (data.pucc_number as string) || null,
        pucValidUntil: parseDateString(data.pucc_upto),
        daysUntilPucExpiry: calculateDaysUntil(data.pucc_upto),

        fitnessStatus: calculateExpiryState(data.fit_upto),
        fitnessValidUntil: parseDateString(data.fit_upto),
        daysUntilFitnessExpiry: calculateDaysUntil(data.fit_upto),

        taxStatus: calculateExpiryState(data.tax_upto),
        taxValidUntil: parseDateString(data.tax_upto),
        isLifetimeTax: String(data.tax_upto || "").toUpperCase().includes("LTT"),
      };

      const ownerInfo = {
        ownerName: maskString(data.owner_name as string),
        fatherName: maskString(data.father_name as string),
        mobileNumber: maskMobile(data.mobile_number as string),
        permanentAddress: maskAddress(data.permanent_address as string),
        presentAddress: maskAddress(data.present_address as string),
        chassisNumber: maskChassis(data.chassis_number as string),
        engineNumber: maskEngine(data.engine_number as string),
        isMasked: true,
      };

      const normHash = crypto.createHash("sha256").update(JSON.stringify(specs)).digest("hex");

      const result: VehicleVerificationResult = {
        registration_number: plate.normalized,
        status: "VERIFIED",
        data_type: "live_provider_response",
        source: "Surepass Vehicle Intelligence API",
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
          sourceReference: String(rawPayload.client_id || plate.normalized),
          retrievedAtUtc: utcTime,
          retrievedAtIst: istTime,
          rawResponseHashSha256: rawHash,
          normalizedHashSha256: normHash,
          caseId: context.caseId ?? null,
          investigatorId: context.investigatorId ?? null,
          purpose: context.purpose,
          dataFreshness: "live",
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
        error: `Surepass request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
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
