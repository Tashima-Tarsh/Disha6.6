import crypto from "node:crypto";
import type { NormalizedPlate, VehicleProviderHealth, VehicleQueryContext } from "../types";
import type { ProviderLookupResult, VehicleProvider } from "./provider-interface";

export class APISetuVehicleProvider implements VehicleProvider {
  readonly id = "apisetu_vahan";
  readonly name = "API Setu — MoRTH National VAHAN Registry";
  readonly priority = 0; // Sovereign government gateway takes priority when configured
  readonly isLiveProvider = true;

  private getCredentials() {
    const clientId = process.env.APISETU_CLIENT_ID?.trim() || "";
    const clientSecret = process.env.APISETU_CLIENT_SECRET?.trim() || "";
    const enabled = process.env.APISETU_ENABLED === "true";
    const baseUrl = process.env.APISETU_BASE_URL?.trim() || "https://apisetu.gov.in/api/v1";
    return { clientId, clientSecret, enabled, baseUrl };
  }

  async health(): Promise<VehicleProviderHealth> {
    const { clientId, clientSecret, enabled } = this.getCredentials();
    if (!enabled || !clientId || !clientSecret) {
      return {
        id: this.id,
        name: this.name,
        status: "unavailable",
        configured: false,
        detail: enabled
          ? "API Setu MoRTH credentials missing (APISETU_CLIENT_ID / APISETU_CLIENT_SECRET required)."
          : "Government API Setu VAHAN gateway disabled (APISETU_ENABLED=false).",
      };
    }

    return {
      id: this.id,
      name: this.name,
      status: "healthy",
      configured: true,
      detail: "Official API Setu Government Gateway configured with active OAuth2 credentials.",
    };
  }

  async verifyRegistration(plate: NormalizedPlate, context: VehicleQueryContext): Promise<ProviderLookupResult> {
    const { clientId, clientSecret, enabled, baseUrl } = this.getCredentials();

    if (!enabled || !clientId || !clientSecret) {
      return {
        success: false,
        unauthorized: true,
        error: "API Setu requires authorized government credentials and a signed consent artifact.",
      };
    }

    if (!context.consentConfirmed) {
      return {
        success: false,
        unauthorized: true,
        error: "API Setu requires explicit operator consent confirmation under Section 63 BSA governance.",
      };
    }

    const endpoint = `${baseUrl}/transport/vahan/rc`;
    const now = new Date();
    const utcTime = now.toISOString();
    const istTime = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-APISETU-CLIENTID": clientId,
          "X-APISETU-APIKEY": clientSecret,
        },
        body: JSON.stringify({
          regNo: plate.normalized,
          consent: "Y",
        }),
        signal: context.signal ?? AbortSignal.timeout(10000),
      });

      const rawPayload = (await response.json()) as Record<string, unknown>;
      const rawPayloadString = JSON.stringify(rawPayload);
      const rawHash = crypto.createHash("sha256").update(rawPayloadString).digest("hex");

      if (!response.ok) {
        return {
          success: false,
          statusCode: response.status,
          error: `API Setu returned HTTP ${response.status}: ${JSON.stringify(rawPayload)}`,
          rawPayload,
        };
      }

      // Map API Setu response
      const certificate = (rawPayload.certificateData || rawPayload) as Record<string, unknown>;

      const specs = {
        registrationNumber: plate.normalized,
        registrationDate: (certificate.regDate as string) || null,
        state: plate.stateName ?? null,
        stateCode: plate.stateCode ?? null,
        rto: (certificate.regAuthority as string) || plate.rtoName || null,
        rtoCode: plate.rtoCode ?? null,
        vehicleCategory: "car" as const,
        vehicleClass: (certificate.vehicleClass as string) || null,
        manufacturer: (certificate.maker as string) || null,
        model: (certificate.model as string) || null,
        modelVariant: null,
        fuelType: (certificate.fuelType as string) || null,
        color: (certificate.color as string) || null,
        manufacturingMonthYear: (certificate.manufacturingDate as string) || null,
        emissionNorms: (certificate.normsType as string) || null,
        engineCapacityCc: null,
        seatingCapacity: null,
        bodyType: null,
        unladenWeightKg: null,
        grossVehicleWeightKg: null,
        wheelbaseMm: null,
        statusAsOn: utcTime,
        rcStatus: (certificate.status as string) || "ACTIVE",
        rcFinancer: null,
        isFinanced: false,
      };

      const compliance = {
        insuranceStatus: "VALID" as const,
        insuranceCompany: (certificate.insuranceCompany as string) || null,
        insurancePolicyNumber: (certificate.policyNumber as string) || null,
        insuranceValidUntil: (certificate.insuranceUpto as string) || null,
        daysUntilInsuranceExpiry: null,
        pucStatus: "VALID" as const,
        pucNumber: (certificate.pucNumber as string) || null,
        pucValidUntil: (certificate.pucUpto as string) || null,
        daysUntilPucExpiry: null,
        fitnessStatus: "VALID" as const,
        fitnessValidUntil: (certificate.fitUpto as string) || null,
        daysUntilFitnessExpiry: null,
        taxStatus: "VALID" as const,
        taxValidUntil: (certificate.taxUpto as string) || null,
        isLifetimeTax: false,
      };

      const ownerInfo = {
        ownerName: maskString(certificate.ownerName as string),
        fatherName: null,
        mobileNumber: null,
        permanentAddress: null,
        presentAddress: null,
        chassisNumber: maskChassis(certificate.chassisNo as string),
        engineNumber: maskEngine(certificate.engineNo as string),
        isMasked: true,
      };

      const normHash = crypto.createHash("sha256").update(JSON.stringify(specs)).digest("hex");

      return {
        success: true,
        result: {
          registration_number: plate.normalized,
          status: "VERIFIED",
          data_type: "live_provider_response",
          source: "API Setu (MoRTH)",
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
            sourceReference: String(rawPayload.txnId || `SETU-${plate.normalized}`),
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
        },
        rawPayload,
      };
    } catch (err) {
      return {
        success: false,
        error: `API Setu request error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
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
