import crypto from "node:crypto";
import { getDbPool } from "@/lib/server/db";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { parseIndianRegistration } from "@/lib/vehicle/validator";
import { resolveRto } from "@/lib/vehicle/rto-directory";
import type {
  NormalizedPlate,
  VehicleLookupRequest,
  VehicleProviderHealth,
  VehicleQueryContext,
  VehicleVerificationResult,
} from "@/lib/vehicle/types";
import type { VehicleProvider } from "@/lib/vehicle/providers/provider-interface";
import { PublicRTOReferenceProvider } from "@/lib/vehicle/providers/public-rto-provider";
import { LocalAuthorizedRecordsProvider, mapDbRowToVerificationResult } from "@/lib/vehicle/providers/local-records-provider";
import { CashfreeVehicleProvider } from "@/lib/vehicle/providers/cashfree-provider";
import { SurepassVehicleProvider } from "@/lib/vehicle/providers/surepass-provider";
import { APISetuVehicleProvider } from "@/lib/vehicle/providers/apisetu-provider";
import { ApprovedThirdPartyVehicleProvider } from "@/lib/vehicle/providers/third-party-provider";

interface CacheEntry {
  result: VehicleVerificationResult;
  expiresAt: number;
}

export class VehicleIntelligenceService {
  private static instance: VehicleIntelligenceService | null = null;
  private providers: VehicleProvider[] = [];
  private memoryCache = new Map<string, CacheEntry>();
  private rateLimitMap = new Map<string, number[]>();

  private constructor() {
    this.providers = [
      new APISetuVehicleProvider(),
      new CashfreeVehicleProvider(),
      new SurepassVehicleProvider(),
      new ApprovedThirdPartyVehicleProvider(),
      new LocalAuthorizedRecordsProvider(),
      new PublicRTOReferenceProvider(),
    ];
  }

  static getInstance(): VehicleIntelligenceService {
    if (!this.instance) {
      this.instance = new VehicleIntelligenceService();
    }
    return this.instance;
  }

  /**
   * Checks in-memory rate limit for the requesting actor or IP.
   */
  private checkRateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
    const now = Date.now();
    const timestamps = this.rateLimitMap.get(key) || [];
    const recent = timestamps.filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      return false;
    }
    recent.push(now);
    this.rateLimitMap.set(key, recent);
    return true;
  }

  /**
   * Discovers and tests all registered vehicle data providers.
   */
  async getProvidersHealth(): Promise<VehicleProviderHealth[]> {
    return Promise.all(this.providers.map((p) => p.health()));
  }

  /**
   * Executes multi-source verification for an Indian vehicle registration plate.
   */
  async lookupVehicle(
    request: VehicleLookupRequest,
    context?: Partial<VehicleQueryContext>,
  ): Promise<VehicleVerificationResult> {
    const ctx: VehicleQueryContext = {
      investigatorId: context?.investigatorId || "system-analyst",
      actorRole: context?.actorRole || "analyst",
      ipAddress: context?.ipAddress || "127.0.0.1",
      consentConfirmed: context?.consentConfirmed ?? true,
      caseId: context?.caseId || request.case_id,
      purpose: context?.purpose || request.purpose || "vehicle_registration_verification",
    };
    const rateLimitKey = ctx.investigatorId || ctx.ipAddress || "anonymous";
    const allowed = this.checkRateLimit(rateLimitKey);
    if (!allowed) {
      throw Object.assign(new Error("Vehicle verification rate limit exceeded. Max 20 queries per minute."), {
        statusCode: 429,
      });
    }

    const regNum = request.registration_number || (request as any).registrationNumber || "";
    const plate = parseIndianRegistration(regNum);
    if (!plate.isValid) {
      throw Object.assign(new Error(plate.error || "Invalid Indian vehicle registration format."), {
        statusCode: 400,
        plate,
      });
    }

    const cacheKey = plate.normalized;
    const ttlSeconds = parseInt(process.env.VEHICLE_LOOKUP_CACHE_TTL || "3600", 10);

    // 1. Check in-memory cache if allowed
    if (request.allow_cached) {
      const cached = this.memoryCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        await this.logAudit({
          registrationNumber: plate.normalized,
          action: "record_retrieved_from_cache",
          context: ctx,
          providerUsed: cached.result.provider_id,
        });
        return cached.result;
      }
    }

    // 2. Select and order providers
    let orderedProviders: VehicleProvider[] = [];

    if (request.preferred_provider) {
      const match = this.providers.find((p) => p.id === request.preferred_provider);
      if (match) {
        orderedProviders.push(match);
      }
    }

    // Add remaining providers by priority
    const remaining = this.providers
      .filter((p) => p.id !== request.preferred_provider)
      .sort((a, b) => a.priority - b.priority);

    orderedProviders = [...orderedProviders, ...remaining];

    let finalResult: VehicleVerificationResult | null = null;
    let errorsCollected: string[] = [];

    // 3. Multi-source failover execution loop
    for (const provider of orderedProviders) {
      try {
        const lookup = await provider.verifyRegistration(plate, ctx);
        if (lookup.success && lookup.result) {
          finalResult = lookup.result;
          break;
        } else if (lookup.error) {
          errorsCollected.push(`${provider.name}: ${lookup.error}`);
        }
      } catch (err) {
        errorsCollected.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (!finalResult) {
      // Guaranteed deterministic fallback: Public RTO Reference Provider
      const fallbackProvider = new PublicRTOReferenceProvider();
      const fallback = await fallbackProvider.verifyRegistration(plate, ctx);
      if (fallback.success && fallback.result) {
        finalResult = fallback.result;
        finalResult.warnings = [
          ...(finalResult.warnings || []),
          ...errorsCollected,
        ];
      } else {
        throw new Error(`Vehicle lookup failed across all providers: ${errorsCollected.join(" | ")}`);
      }
    }

    // 3.5 Apply Section 63 BSA & DPDP Act 2023 Masking by default
    const isLawEnforcement = ctx.actorRole === "law_enforcement" || ctx.actorRole === "judicial_authority";
    if (!isLawEnforcement && finalResult.owner_info) {
      const o = finalResult.owner_info;
      const rawName = o.unmaskedOwnerName || o.ownerName?.replace(/^\[PROTECTED[^\]]*\]\s*/, "") || "Confidential";
      const rawFather = o.unmaskedFatherName || o.fatherName?.replace(/^\[PROTECTED[^\]]*\]\s*/, "") || null;
      const rawMobile = o.unmaskedMobileNumber || o.mobileNumber || null;
      const rawChassis = o.unmaskedChassisNumber || o.chassisNumber || null;
      const rawEngine = o.unmaskedEngineNumber || o.engineNumber || null;

      finalResult.owner_info = {
        ...o,
        isMasked: true,
        ownerName: `[PROTECTED - DPDP/Section 63 BSA] ${maskString(rawName)}`,
        fatherName: rawFather ? `[PROTECTED - DPDP/Section 63 BSA] ${maskString(rawFather)}` : null,
        mobileNumber: rawMobile ? `+91 ***** **${rawMobile.replace(/\D/g, "").slice(-4)}` : null,
        chassisNumber: rawChassis ? `[MASKED] ****${rawChassis.replace(/[^A-Za-z0-9]/g, "").slice(-4)}` : null,
        engineNumber: rawEngine ? `[MASKED] ****${rawEngine.replace(/[^A-Za-z0-9]/g, "").slice(-4)}` : null,
        permanentAddress: o.permanentAddress ? "[PROTECTED - Address Redacted pursuant to Section 63 BSA]" : null,
        presentAddress: o.presentAddress ? "[PROTECTED - Address Redacted pursuant to Section 63 BSA]" : null,
        unmaskedOwnerName: rawName,
        unmaskedFatherName: rawFather,
        unmaskedMobileNumber: rawMobile,
        unmaskedChassisNumber: rawChassis,
        unmaskedEngineNumber: rawEngine,
      };
    }

    // 4. Cache response
    this.memoryCache.set(cacheKey, {
      result: finalResult,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    // 5. Persist to database & audit ledger
    await this.persistVerification(finalResult, ctx);

    return finalResult;
  }

  /**
   * Persists verification record into Postgres database and logs audit trail.
   */
  private async persistVerification(
    result: VehicleVerificationResult,
    context: VehicleQueryContext,
  ): Promise<void> {
    const pool = getDbPool();
    if (!pool) return;

    try {
      const v = result.vehicle;
      const c = result.compliance;
      const o = result.owner_info;

      const insertRes = await pool.query(
        `INSERT INTO vehicle_verifications (
          registration_number, normalized_number, plate_format, status, data_type,
          provider_id, provider_reference_id, case_id, investigator_id, purpose,
          state_code, state_name, rto_code, rto_name, vehicle_category, vehicle_class,
          manufacturer, model, model_variant, fuel_type, color, manufacturing_year_month,
          emission_norms, engine_capacity_cc, seating_capacity, registration_date,
          fitness_valid_until, insurance_company, insurance_policy_number, insurance_valid_until,
          puc_number, puc_valid_until, tax_valid_until, masked_owner_name, masked_father_name,
          masked_chassis_number, masked_engine_number, financer, is_financed,
          payload, raw_response_hash_sha256, normalized_hash_sha256, retrieved_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43
        ) RETURNING id`,
        [
          result.plate.raw,
          result.registration_number,
          result.plate.format,
          result.status,
          result.data_type,
          result.provider_id,
          result.evidence.sourceReference,
          context.caseId || null,
          context.investigatorId || null,
          context.purpose,
          result.plate.stateCode || null,
          result.plate.stateName || null,
          result.plate.rtoCode || null,
          result.plate.rtoName || null,
          v.vehicleCategory || null,
          v.vehicleClass || null,
          v.manufacturer || null,
          v.model || null,
          v.modelVariant || null,
          v.fuelType || null,
          v.color || null,
          v.manufacturingMonthYear || null,
          v.emissionNorms || null,
          v.engineCapacityCc || null,
          v.seatingCapacity || null,
          v.registrationDate || null,
          c.fitnessValidUntil || null,
          c.insuranceCompany || null,
          c.insurancePolicyNumber || null,
          c.insuranceValidUntil || null,
          c.pucNumber || null,
          c.pucValidUntil || null,
          c.taxValidUntil || null,
          o.ownerName || null,
          o.fatherName || null,
          o.chassisNumber || null,
          o.engineNumber || null,
          v.rcFinancer || null,
          v.isFinanced,
          JSON.stringify({ ...(result.raw_payload || {}), owner_info: result.owner_info, compliance: result.compliance }),
          result.evidence.rawResponseHashSha256,
          result.evidence.normalizedHashSha256,
          result.retrieved_at,
        ],
      );

      const verificationId = insertRes.rows[0]?.id;
      if (verificationId) {
        result.evidence.recordId = verificationId;
        result.evidence.verificationId = verificationId;
      }

      // Record audit log
      await this.logAudit({
        verificationId,
        registrationNumber: result.registration_number,
        action: "lookup_executed",
        context,
        providerUsed: result.provider_id,
        metadata: {
          status: result.status,
          dataType: result.data_type,
          rawHash: result.evidence.rawResponseHashSha256,
        },
      });

      // Bind to DISHA Evidence Ledger if caseId present
      if (context.caseId) {
        await appendEvidenceEvent({
          missionId: context.caseId,
          actor: context.investigatorId || "vehicle-engine",
          action: "vehicle_registration_anchored",
          input: { registration: result.registration_number, purpose: context.purpose },
          output: {
            status: result.status,
            source: result.source,
            make: v.manufacturer,
            model: v.model,
            insurance: c.insuranceStatus,
            hash: result.evidence.normalizedHashSha256,
          },
        });
      }
    } catch (err) {
      console.warn("[vehicle-service] Database persistence skipped:", err instanceof Error ? err.message : String(err));
    }
  }

  private async logAudit(params: {
    verificationId?: string;
    registrationNumber: string;
    action: string;
    context: VehicleQueryContext;
    providerUsed?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const pool = getDbPool();
    if (!pool) return;

    try {
      await pool.query(
        `INSERT INTO vehicle_audit_log (
          verification_id, registration_number, action, actor_id, actor_email,
          actor_role, case_id, provider_used, ip_address, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          params.verificationId || null,
          params.registrationNumber,
          params.action,
          params.context.investigatorId || "anonymous",
          null,
          params.context.actorRole || "investigator",
          params.context.caseId || null,
          params.providerUsed || null,
          params.context.ipAddress || null,
          JSON.stringify(params.metadata || {}),
        ],
      );
    } catch {
      // Best-effort audit logging
    }
  }

  /**
  /**
   * Returns metadata about all registered vehicle data providers.
   */
  getProviders(): Array<{
    id: string;
    name: string;
    priority: number;
    configured: boolean;
    isLiveProvider: boolean;
    description: string;
  }> {
    return this.providers.map((p) => ({
      id: p.id,
      name: p.name,
      priority: p.priority,
      configured: typeof (p as any).isConfigured === "function" ? (p as any).isConfigured() : true,
      isLiveProvider: p.isLiveProvider,
      description:
        p.id === "apisetu_vahan"
          ? "MoRTH API Setu OAuth2 Government VAHAN Gateway"
          : p.id === "cashfree_rc"
          ? "Cashfree RC Verification Engine (FinTech/KYC)"
          : p.id === "surepass_rc"
          ? "Surepass Vehicle Verification API"
          : p.id === "third_party_rc"
          ? "Enterprise Third-Party Webhook Provider"
          : p.id === "local_authorized_records"
          ? "DISHA Local Case Evidence Vault (PostgreSQL)"
          : "Offline Sovereign 36 States/UTs RTO Directory",
    }));
  }

  /**
   * Retrieves past verification records from the database.
   */
  async getVerificationById(id: string): Promise<VehicleVerificationResult | null> {
    const pool = getDbPool();
    if (!pool) return null;

    try {
      const res = await pool.query("SELECT * FROM vehicle_verifications WHERE id = $1", [id]);
      if (!res.rows.length) return null;

      const row = res.rows[0];
      return mapDbRowToVerificationResult(row, { purpose: "fetch_by_id" });
    } catch {
      return null;
    }
  }

  /**
   * Resolves RTO office information by state code or full RTO code (e.g., DL01, MH12).
   */
  getRtoDetails(rtoCode: string) {
    const clean = rtoCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const statePrefix = clean.slice(0, 2);
    const num = clean.slice(2);
    return resolveRto(statePrefix, num ? parseInt(num, 10) : undefined);
  }

  /**
   * Generates or retrieves a forensic report by verification lookup ID.
   */
  async getReportById(id: string): Promise<{ result: VehicleVerificationResult; html: string } | null> {
    const result = await this.getVerificationById(id);
    if (!result) return null;
    return {
      result,
      html: this.generateForensicReportHtml(result),
    };
  }

  /**
   * Generates a printable forensic investigation report in HTML / printable format.
   */
  generateForensicReportHtml(result: VehicleVerificationResult): string {
    const v = result.vehicle;
    const c = result.compliance;
    const o = result.owner_info;
    const e = result.evidence;

    const statusColor =
      result.status === "VERIFIED"
        ? "#10b981"
        : result.status === "NOT_FOUND"
        ? "#ef4444"
        : result.status === "PUBLIC_REFERENCE"
        ? "#38bdf8"
        : "#f59e0b";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DISHA 6.6 — Vehicle Intelligence Report: ${result.registration_number}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b111a; color: #e2e8f0; margin: 0; padding: 30px; line-height: 1.5; }
    .header { border-bottom: 2px solid #38bdf8; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: 0.05em; text-transform: uppercase; margin: 0; }
    .sub { font-size: 11px; color: #94a3b8; font-family: monospace; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 12px; text-transform: uppercase; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}66; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px; }
    .card { background: #131d2b; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; }
    .card-title { font-size: 12px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .row span:first-child { color: #94a3b8; }
    .row span:last-child { color: #f1f5f9; font-weight: 600; text-align: right; }
    .code { font-family: monospace; font-size: 11px; background: #070c14; padding: 3px 6px; border-radius: 4px; color: #38bdf8; word-break: break-all; }
    .notice { font-size: 11px; color: #94a3b8; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; padding: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">DISHA 6.6 // Indian Vehicle Intelligence Dossier</h1>
      <div class="sub">AUTHORITATIVE DIGITAL EVIDENCE REPORT · SECTION 63 BSA COMPLIANT</div>
    </div>
    <div>
      <span class="badge">${result.status}</span>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Registration & RTO Authority</div>
      <div class="row"><span>Registration Plate:</span><span>${result.registration_number}</span></div>
      <div class="row"><span>Format Classification:</span><span>${result.plate.format.toUpperCase()}</span></div>
      <div class="row"><span>State / UT:</span><span>${result.plate.stateName || "N/A"} (${result.plate.stateCode || "N/A"})</span></div>
      <div class="row"><span>Registered RTO Office:</span><span>${result.plate.rtoName || "N/A"} (${result.plate.rtoCode || "N/A"})</span></div>
      <div class="row"><span>Registration Date:</span><span>${v.registrationDate || "N/A"}</span></div>
      <div class="row"><span>RC Status:</span><span>${v.rcStatus || "N/A"}</span></div>
    </div>

    <div class="card">
      <div class="card-title">Vehicle Technical Specifications</div>
      <div class="row"><span>Manufacturer:</span><span>${v.manufacturer || "N/A"}</span></div>
      <div class="row"><span>Model / Line:</span><span>${v.model || "N/A"}</span></div>
      <div class="row"><span>Category:</span><span>${v.vehicleCategory.toUpperCase()}</span></div>
      <div class="row"><span>Vehicle Class:</span><span>${v.vehicleClass || "N/A"}</span></div>
      <div class="row"><span>Fuel Type:</span><span>${v.fuelType || "N/A"}</span></div>
      <div class="row"><span>Engine Capacity:</span><span>${v.engineCapacityCc ? v.engineCapacityCc + " cc" : "N/A"}</span></div>
      <div class="row"><span>Emission Norms:</span><span>${v.emissionNorms || "N/A"}</span></div>
    </div>

    <div class="card">
      <div class="card-title">Statutory Compliance Status</div>
      <div class="row"><span>Insurance Status:</span><span>${c.insuranceStatus}</span></div>
      <div class="row"><span>Insurance Company:</span><span>${c.insuranceCompany || "N/A"}</span></div>
      <div class="row"><span>Insurance Valid Upto:</span><span>${c.insuranceValidUntil || "N/A"}</span></div>
      <div class="row"><span>PUC Certificate Status:</span><span>${c.pucStatus}</span></div>
      <div class="row"><span>PUCC Valid Upto:</span><span>${c.pucValidUntil || "N/A"}</span></div>
      <div class="row"><span>Fitness Valid Upto:</span><span>${c.fitnessValidUntil || "N/A"}</span></div>
      <div class="row"><span>Road Tax Status:</span><span>${c.taxStatus} ${c.isLifetimeTax ? "(Lifetime Tax / LTT)" : ""}</span></div>
    </div>

    <div class="card">
      <div class="card-title">Ownership & Identity Protection (Section 63 BSA)</div>
      <div class="row"><span>Registered Owner:</span><span>${o.ownerName || "[PROTECTED]"}</span></div>
      <div class="row"><span>Father's Name:</span><span>${o.fatherName || "[PROTECTED]"}</span></div>
      <div class="row"><span>Mobile / Contact:</span><span>${o.mobileNumber || "[PROTECTED]"}</span></div>
      <div class="row"><span>Chassis Number:</span><span>${o.chassisNumber || "[MASKED]"}</span></div>
      <div class="row"><span>Engine Number:</span><span>${o.engineNumber || "[MASKED]"}</span></div>
      <div class="row"><span>Hypothecation / Financer:</span><span>${v.rcFinancer || "None recorded"}</span></div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Digital Evidence Provenance & Cryptographic Custody</div>
    <div class="row"><span>Primary Source Provider:</span><span>${result.source} (${result.provider_id})</span></div>
    <div class="row"><span>Data Type:</span><span>${result.data_type.toUpperCase()}</span></div>
    <div class="row"><span>Query Timestamp (UTC):</span><span>${e.retrievedAtUtc}</span></div>
    <div class="row"><span>Query Timestamp (IST):</span><span>${e.retrievedAtIst}</span></div>
    <div class="row"><span>Associated Case ID:</span><span>${e.caseId || "Ad-hoc Reconnaissance"}</span></div>
    <div class="row"><span>Investigator ID:</span><span>${e.investigatorId || "Console Operator"}</span></div>
    <div class="row"><span>Raw Response Hash (SHA-256):</span><span class="code">${e.rawResponseHashSha256}</span></div>
    <div class="row"><span>Normalized Hash (SHA-256):</span><span class="code">${e.normalizedHashSha256}</span></div>
  </div>

  <div class="notice">
    <strong>DISHA Legal Notice & Verification Limitations:</strong> This dossier was compiled under governed digital intelligence controls.
    Unmasked personal identifiers are restricted strictly to authorized law enforcement and judicial personnel under the Digital Personal Data Protection Act (DPDP) and Section 63 BSA.
    A status of PUBLIC_REFERENCE indicates offline directory resolution without querying live VAHAN registries.
  </div>
</body>
</html>`;
  }
}

export const vehicleIntelligenceService = VehicleIntelligenceService.getInstance();

function maskString(str?: string | null): string {
  if (!str) return "[PROTECTED]";
  const trimmed = str.trim();
  if (trimmed.length <= 2) return "*".repeat(trimmed.length);
  const words = trimmed.split(/\s+/);
  return words
    .map((w) => (w.length > 2 ? `${w[0]}${"*".repeat(w.length - 2)}${w[w.length - 1]}` : `${w[0]}*`))
    .join(" ");
}
