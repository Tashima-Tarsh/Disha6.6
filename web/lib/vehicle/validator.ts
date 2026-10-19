import { resolveBharatSeries, resolveRto, INDIAN_STATES_AND_UTS } from "./rto-directory";
import type { NormalizedPlate, VehiclePlateFormat } from "./types";

// Standard State Registration Regex:
// e.g. DL01AB1234, MH12A1, KA05MB9999, UP14E9999, HR26DQ1234
const STANDARD_STATE_REGEX = /^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/;

// Bharat Series (BH) Regex:
// e.g. 21BH1234AA, 22BH9999A, 23BH0001B
const BHARAT_SERIES_REGEX = /^(\d{2})BH(\d{4})([A-Z]{1,2})$/;

// Diplomatic Plates (CD = Corps Diplomatique, CC = Corps Consulaire, UN = United Nations):
// e.g. 77CD1234, 19UN10
const DIPLOMATIC_REGEX = /^(\d{1,3})(CD|CC|UN)(\d{1,4})$/;

// Vintage Vehicles (VA series introduced by MoRTH in 2021):
// e.g. DL01VA1234 or DLVA01AB1234 or DLVA1234
const VINTAGE_REGEX = /^([A-Z]{2})(?:(\d{1,2})VA|VA(\d{1,2})?)([A-Z]{0,3})(\d{1,4})$/;

// Military Vehicles (Arrow prefix or upward arrow Unicode / caret, 2 digits year, base code):
// e.g. 22D123456X, ^21B123456Y, 99D123456X
const MILITARY_REGEX = /^[↑^]?(\d{2})([A-Z])(\d{4,7})([A-Z])$/;

/**
 * Normalizes an Indian vehicle registration plate string by removing whitespace,
 * hyphens, dots, forward slashes, and converting to uppercase.
 */
export function normalizeRegistrationNumber(rawInput: string): string {
  if (!rawInput) return "";
  return rawInput
    .trim()
    .replace(/[\s\-_./\\,]/g, "")
    .toUpperCase();
}

/**
 * Normalizes an Indian vehicle plate string (alias for normalizeRegistrationNumber).
 */
export const normalizePlateString = normalizeRegistrationNumber;

/**
 * Parses and validates an Indian vehicle registration number across all state,
 * union territory, and national series formats.
 */
export function parseIndianRegistration(rawInput: string): NormalizedPlate {
  const normalized = normalizeRegistrationNumber(rawInput);

  if (!normalized) {
    return {
      raw: rawInput,
      normalized: "",
      format: "unknown",
      isValid: false,
      error: "Registration number cannot be empty.",
    };
  }

  // 1. Check Bharat Series (BH)
  const bhMatch = normalized.match(BHARAT_SERIES_REGEX);
  if (bhMatch) {
    const yearPrefix = parseInt(bhMatch[1], 10);
    const bhDetails = resolveBharatSeries(yearPrefix);
    return {
      raw: rawInput,
      normalized,
      format: "bharat_series",
      isValid: true,
      stateCode: "BH",
      stateName: "Bharat Series (National)",
      rtoCode: `${bhMatch[1]}BH`,
      rtoName: "National Centralised Transport Registry (MoRTH)",
      bhYear: bhDetails.registrationYear,
      series: bhMatch[3] || "BH",
      serialNumber: bhMatch[2],
    };
  }

  // 2. Check Vintage Vehicle Format (VA)
  const vintageMatch = normalized.match(VINTAGE_REGEX);
  if (vintageMatch && INDIAN_STATES_AND_UTS[vintageMatch[1]]) {
    const stateCode = vintageMatch[1];
    const rtoNum = vintageMatch[2] || vintageMatch[3] || "01";
    const { state, rto, rtoCode } = resolveRto(stateCode, rtoNum);
    return {
      raw: rawInput,
      normalized,
      format: "vintage",
      isValid: true,
      stateCode,
      stateName: state?.name ?? stateCode,
      rtoCode,
      rtoName: rto?.officeName ?? `${stateCode} Vintage Registry`,
      series: vintageMatch[4] || "VA",
      serialNumber: vintageMatch[5],
    };
  }

  // 3. Check Diplomatic Format (CD / CC / UN)
  const diploMatch = normalized.match(DIPLOMATIC_REGEX);
  if (diploMatch) {
    return {
      raw: rawInput,
      normalized,
      format: "diplomatic",
      isValid: true,
      stateCode: "DL",
      stateName: "Diplomatic Mission (MEA)",
      rtoCode: `MEA-${diploMatch[2]}`,
      rtoName: "Ministry of External Affairs Diplomatic Vehicle Pool",
      series: diploMatch[2],
      serialNumber: diploMatch[3],
    };
  }

  // 4. Check Military Defense Format
  const milMatch = normalized.match(MILITARY_REGEX);
  if (milMatch) {
    return {
      raw: rawInput,
      normalized,
      format: "military",
      isValid: true,
      stateCode: "DEF",
      stateName: "Ministry of Defence",
      rtoCode: `DEF-${milMatch[2]}`,
      rtoName: "Armed Forces Base Ordnance Registry",
      bhYear: 2000 + parseInt(milMatch[1], 10),
      series: milMatch[2],
      serialNumber: milMatch[3],
    };
  }

  // 5. Check Standard State Registration
  const stdMatch = normalized.match(STANDARD_STATE_REGEX);
  if (stdMatch) {
    const stateCode = stdMatch[1];
    const rtoDigits = stdMatch[2];
    const seriesAlpha = stdMatch[3] || "";
    const regDigits = stdMatch[4];

    // Verify stateCode is an actual recognized Indian State or UT
    if (!INDIAN_STATES_AND_UTS[stateCode]) {
      return {
        raw: rawInput,
        normalized,
        format: "standard_state",
        isValid: false,
        stateCode,
        error: `State code '${stateCode}' is not a recognized Indian State or Union Territory code.`,
      };
    }

    const { state, rto, rtoCode } = resolveRto(stateCode, rtoDigits);
    const paddedReg = regDigits.padStart(4, "0");

    return {
      raw: rawInput,
      normalized,
      format: "standard_state",
      isValid: true,
      stateCode,
      stateName: state?.name ?? stateCode,
      rtoCode,
      rtoName: rto?.officeName ?? `${state?.name} RTO Office ${rtoDigits}`,
      series: seriesAlpha,
      serialNumber: paddedReg,
    };
  }

  return {
    raw: rawInput,
    normalized,
    format: "unknown",
    isValid: false,
    error: `Registration number '${normalized}' does not match standard Indian state, Bharat Series (BH), diplomatic, or vintage vehicle patterns.`,
  };
}
