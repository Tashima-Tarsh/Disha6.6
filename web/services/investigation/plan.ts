import { isIP } from "node:net";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { z } from "zod";
import type { TargetType } from "../../lib/investigation/types";
import {
  INVESTIGATION_TARGET_INPUT_TYPES,
  type InvestigationTargetInputType,
} from "../../lib/unified/search-targets";
import { buildTargetRoutePlan } from "../../lib/unified/target-route-registry";
import { classifyUniversalTarget } from "../../lib/unified/universal-target-classifier";

export const investigationInput = z.object({
  target: z.string().trim().min(1).max(512).refine(value => !/[\u0000-\u001f\u007f]/.test(value), "Invalid target"),
  targetType: z.enum(INVESTIGATION_TARGET_INPUT_TYPES).default("auto"),
}).strict();

function fail(message: string): never {
  throw Object.assign(new Error(message), { status: 400 });
}

export function classifyTarget(
  target: string,
  requested: InvestigationTargetInputType = "auto",
): { normalizedTarget: string; targetType: TargetType } {
  const trimmed = target.trim();

  if (["person_name", "company", "topic", "location"].includes(requested)) {
    return { normalizedTarget: trimmed, targetType: requested as TargetType };
  }

  if (requested === "norad_id") {
    const match = trimmed.match(/^(?:(?:NORAD|CATNR|CATALOG)\s*[:#-]?\s*)?(\d{1,9})$/i);
    if (!match) fail("Target does not match selected type");
    return { normalizedTarget: match[1], targetType: "norad_id" };
  }

  if (requested === "ioc") {
    return { normalizedTarget: trimmed, targetType: "ioc" };
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
    // Never invent a country code for a local number.
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

  return { targetType: inferred, normalizedTarget };
}

export function planInvestigation(target: string, type: TargetType) {
  return buildTargetRoutePlan(target, type);
}
