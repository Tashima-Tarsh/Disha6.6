import { safePublicFetch } from "../server/safe-public-fetch";
import {
  buildAdapterEvidence,
  type AdapterContext,
  type GovernedOsintAdapter,
} from "./osint-adapter-bus";

type JsonRecord = Record<string, unknown>;

export type VinDecodeInput = { vin: string };
export type VinDecodeOutput = {
  records: Array<Record<string, string | number | boolean | undefined>>;
};

export type IndiaVehicleFormatInput = { registration: string };
export type IndiaVehicleFormatOutput = {
  records: Array<{
    registration: string;
    statePrefix: string;
    registrySystem: "VAHAN";
    ownerDataQueried: false;
    officialPortal: string;
  }>;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeVin(value: string): string {
  const vin = value.trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new Error("invalid_vin");
  return vin;
}

function normalizeIndianRegistration(value: string): string {
  const registration = value.trim().replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z]{0,3}[0-9]{4}$/.test(registration)) {
    throw new Error("invalid_indian_vehicle_registration");
  }
  return registration;
}

function ensurePurpose(context: AdapterContext): void {
  if (!context.purpose.trim()) throw new Error("purpose_required");
}

export function createNhtsaVinAdapter(
  fetcher: typeof safePublicFetch = safePublicFetch,
): GovernedOsintAdapter<VinDecodeInput, VinDecodeOutput> {
  return {
    metadata: {
      id: "public-nhtsa-vin",
      name: "NHTSA vPIC VIN Decoder",
      version: "4.06",
      capability: "public_vehicle_specification_lookup",
      auth: "none",
      legalUse: ["VIN decoding", "Vehicle specification research", "Safety and manufacturer verification"],
      blockedUse: ["Protected owner-data extraction", "Credentialed registry bypass", "Tracking individuals"],
      rateLimitPerMinute: 20,
      timeoutMs: 12_000,
      maxRetries: 1,
      executionClass: "passive_public",
      defaultEnabled: true,
      upstreamRepository: "https://vpic.nhtsa.dot.gov/api/",
    },
    async health() {
      return { status: "healthy" as const, detail: "Official NHTSA vPIC public VIN decoder configured." };
    },
    async execute(input, context) {
      ensurePurpose(context);
      const vin = normalizeVin(input.vin);
      const url = new URL(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}`);
      url.searchParams.set("format", "json");
      const response = await fetcher(url.toString(), {
        signal: context.signal,
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`nhtsa_http_${response.status}`);
      const body = asRecord(await response.json());
      const source = asRecord(Array.isArray(body.Results) ? body.Results[0] : undefined);
      const errorCode = text(source.ErrorCode);
      if (!Object.keys(source).length) return { data: { records: [] }, evidence: [], warnings: ["NHTSA returned no VIN record."] };

      const row = {
        vin: text(source.VIN) ?? vin,
        make: text(source.Make),
        model: text(source.Model),
        modelYear: text(source.ModelYear),
        manufacturer: text(source.Manufacturer),
        vehicleType: text(source.VehicleType),
        bodyClass: text(source.BodyClass),
        doors: text(source.Doors),
        driveType: text(source.DriveType),
        fuelTypePrimary: text(source.FuelTypePrimary),
        engineCylinders: text(source.EngineCylinders),
        displacementL: text(source.DisplacementL),
        plantCountry: text(source.PlantCountry),
        plantState: text(source.PlantState),
        series: text(source.Series),
        trim: text(source.Trim),
        errorCode,
        errorText: text(source.ErrorText),
        sourceUrl: "https://vpic.nhtsa.dot.gov/",
      };

      return {
        data: { records: [row] },
        evidence: [buildAdapterEvidence({
          sourceId: "nhtsa-vpic",
          sourceName: "NHTSA vPIC",
          sourceUrl: "https://vpic.nhtsa.dot.gov/",
          summary: `Official vPIC decode completed for VIN ${vin}: ${row.modelYear ?? "year unknown"} ${row.make ?? "make unknown"} ${row.model ?? "model unknown"}.`,
        })],
        warnings: errorCode && errorCode !== "0" ? [`NHTSA decoder reported ErrorCode ${errorCode}; inspect ErrorText before relying on the record.`] : [],
      };
    },
  };
}

export function createIndiaVehicleFormatAdapter(): GovernedOsintAdapter<IndiaVehicleFormatInput, IndiaVehicleFormatOutput> {
  return {
    metadata: {
      id: "public-india-vehicle-format",
      name: "India Vehicle Registration Format",
      version: "1.0.0",
      capability: "vehicle_registration_validation",
      auth: "none",
      legalUse: ["Registration format validation", "Jurisdiction routing", "Public-source vehicle research"],
      blockedUse: ["Protected VAHAN owner-data extraction", "Registry authentication bypass", "Personal tracking"],
      rateLimitPerMinute: 60,
      timeoutMs: 1_000,
      maxRetries: 0,
      executionClass: "passive_public",
      defaultEnabled: true,
      upstreamRepository: "https://parivahan.gov.in/",
    },
    async health() {
      return { status: "healthy" as const, detail: "Local Indian registration validation available; no protected owner registry is queried." };
    },
    async execute(input, context) {
      ensurePurpose(context);
      const registration = normalizeIndianRegistration(input.registration);
      const row = {
        registration,
        statePrefix: registration.slice(0, 2),
        registrySystem: "VAHAN" as const,
        ownerDataQueried: false as const,
        officialPortal: "https://parivahan.gov.in/",
      };
      return {
        data: { records: [row] },
        evidence: [buildAdapterEvidence({
          sourceId: "india-vehicle-registration-format",
          sourceName: "India vehicle registration format",
          sourceUrl: "https://parivahan.gov.in/",
          summary: `Registration ${registration} matches the supported Indian registration format; state prefix ${row.statePrefix}. No protected owner data was queried.`,
        })],
      };
    },
  };
}
