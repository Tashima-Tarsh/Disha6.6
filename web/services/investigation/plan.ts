import { isIP } from "node:net";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { z } from "zod";

import {
  INVESTIGATION_MODES,
  JURISDICTIONS,
  SEARCH_UNIVERSES,
  SOURCE_POLICIES,
  TIME_RANGES,
  type AdapterPlan,
  type InvestigationMode,
  type Jurisdiction,
  type SearchUniverse,
  type SourcePolicy,
  type TargetType,
  type TimeRange,
} from "../../lib/investigation/types";
import { classifyUniversalTarget } from "../../lib/unified/universal-target-classifier";
import {
  INVESTIGATION_TARGET_INPUT_TYPES,
  type InvestigationTargetInputType,
} from "../../lib/unified/search-targets";
import {
  buildTargetRoutePlan,
  type TargetRouteOptions,
} from "../../lib/unified/target-route-registry";

export const investigationInput = z.object({
  target: z.string().trim().min(1).max(512).refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Invalid target"),
  targetType: z.enum(INVESTIGATION_TARGET_INPUT_TYPES).default("auto"),
  searchUniverse: z.enum(SEARCH_UNIVERSES).default("universal"),
  investigationMode: z.enum(INVESTIGATION_MODES).default("standard"),
  sourcePolicy: z.enum(SOURCE_POLICIES).default("all_approved"),
  jurisdiction: z.enum(JURISDICTIONS).default("global"),
  timeRange: z.enum(TIME_RANGES).default("30d"),
  selectedToolIds: z.array(z.string().trim().min(1).max(128)).default([]),
  identityAuthorization: z.boolean().default(false),
  activeAuthorization: z.boolean().default(false),
}).strict();

export type InvestigationInputValues = z.infer<typeof investigationInput>;

function fail(message: string): never {
  throw Object.assign(new Error(message), { status: 400 });
}

export function classifyTarget(
  target: string,
  requested: InvestigationTargetInputType = "auto",
  universe: SearchUniverse = "universal",
): { normalizedTarget: string; targetType: TargetType; searchUniverse: SearchUniverse } {
  const trimmed = target.trim();

  // Explicit user Search Universe selection overrides ambiguous inference safely (Bug 4)
  if (universe === "person" && (requested === "auto" || requested === "person_name")) {
    return { normalizedTarget: trimmed.replace(/^@/, ""), targetType: "person_name", searchUniverse: universe };
  }
  if (universe === "location" && (requested === "auto" || requested === "location")) {
    return { normalizedTarget: trimmed, targetType: "location", searchUniverse: universe };
  }
  if (universe === "company" && (requested === "auto" || requested === "company")) {
    return { normalizedTarget: trimmed, targetType: "company", searchUniverse: universe };
  }
  if (universe === "vehicle" && (requested === "auto" || requested === "vehicle_identifier")) {
    return { normalizedTarget: trimmed.replace(/[\s-]/g, "").toUpperCase(), targetType: "vehicle_identifier", searchUniverse: universe };
  }
  if (universe === "document" && requested === "auto") {
    return { normalizedTarget: trimmed, targetType: "topic", searchUniverse: universe };
  }
  if (universe === "government" && requested === "auto") {
    return { normalizedTarget: trimmed, targetType: "topic", searchUniverse: universe };
  }

  if (["person_name", "company", "topic", "location"].includes(requested)) {
    return { normalizedTarget: trimmed, targetType: requested as TargetType, searchUniverse: universe };
  }

  if (requested === "norad_id") {
    const match = trimmed.match(/^(?:(?:NORAD|CATNR|CATALOG)\s*[:#-]?\s*)?(\d{1,9})$/i);
    if (!match) fail("Target does not match selected type");
    return { normalizedTarget: match[1], targetType: "norad_id", searchUniverse: universe };
  }

  if (requested === "ioc") {
    return { normalizedTarget: trimmed, targetType: "ioc", searchUniverse: universe };
  }

  let inferred: TargetType;
  let normalizedTarget: string;

  if (isIP(trimmed)) {
    inferred = "ip";
    normalizedTarget = trimmed.toLowerCase();
  } else {
    const classified = classifyUniversalTarget(trimmed);
    inferred = classified.primaryType === "unknown" ? "topic" : classified.primaryType;
    normalizedTarget = classified.normalizedValue;
  }

  if (requested !== "auto") {
    const compatibleUrl = requested === "url" && inferred === "repository";
    if (inferred !== requested && !compatibleUrl) fail("Target does not match selected type");
    inferred = requested;
  }

  if (inferred === "phone") {
    const phone = trimmed.startsWith("+") ? parsePhoneNumberFromString(trimmed) : undefined;
    if (!phone?.isValid()) fail("Enter a valid international phone number including +country code");
    normalizedTarget = phone.number;
  }

  if (inferred === "asn") {
    const value = Number(normalizedTarget.replace(/^AS/i, ""));
    if (value < 1 || value > 4294967295) fail("Invalid ASN");
    normalizedTarget = `AS${value}`;
  }

  if (inferred === "url") {
    const url = new URL(trimmed);
    if (url.username || url.password || !["http:", "https:"].includes(url.protocol)) fail("Invalid public URL");
    normalizedTarget = url.toString();
  }

  if (inferred === "username") normalizedTarget = normalizedTarget.replace(/^@/, "");

  return { targetType: inferred, normalizedTarget, searchUniverse: universe };
}

export function planInvestigation(
  target: string,
  type: TargetType,
  options: TargetRouteOptions = {},
): AdapterPlan[] {
  return buildTargetRoutePlan(target, type, options);
}
