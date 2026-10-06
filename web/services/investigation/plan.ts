import { isIP } from "node:net";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { z } from "zod";
 codex/osint-search-routing-v1
import type { AdapterPlan, TargetType } from "../../lib/investigation/types";
import { buildUniversalOsintPlan } from "../../lib/unified/universal-osint-search";
import { classifyUniversalTarget } from "../../lib/unified/universal-target-classifier";

const TYPES = [
  "auto",
  "person_name",
  "email",
  "phone",
  "username",
  "company",
  "domain",
  "ip",
  "asn",
  "url",
  "cve",
  "norad_id",
  "topic",
  "vehicle_identifier",
  "document",
  "file_hash",
  "certificate",
  "repository",
  "location",
  "ioc",
] as const;

type RequestedTargetType = (typeof TYPES)[number];
import type { TargetType } from "../../lib/investigation/types";
import {
  INVESTIGATION_TARGET_INPUT_TYPES,
  type InvestigationTargetInputType,
} from "../../lib/unified/search-targets";
import { buildTargetRoutePlan } from "../../lib/unified/target-route-registry";
import { classifyUniversalTarget } from "../../lib/unified/universal-target-classifier";
 main

export const investigationInput = z.object({
  target: z.string().trim().min(1).max(512).refine(value => !/[\u0000-\u001f\u007f]/.test(value), "Invalid target"),
  targetType: z.enum(INVESTIGATION_TARGET_INPUT_TYPES).default("auto"),
}).strict();

codex/osint-search-routing-v1
function extendedUniversalType(target: string): TargetType | undefined {
  const classified = classifyUniversalTarget(target);
  if (classified.primaryType === "vehicle_identifier") return "vehicle_identifier";
  if (classified.primaryType === "file_hash") return "file_hash";
  if (classified.primaryType === "certificate") return "certificate";
  if (classified.primaryType === "repository") return "repository";
  if (classified.primaryType === "ioc") return "ioc";
  return undefined;
}

export function classifyTarget(target: string, requested: RequestedTargetType = "auto"): { normalizedTarget: string; targetType: TargetType } {
  const universal = classifyUniversalTarget(target);
  let type: TargetType = extendedUniversalType(target) ?? "topic";

  if (!extendedUniversalType(target)) {
    if (isIP(target)) type = "ip";
    else if (/^CVE-\d{4}-\d{4,}$/i.test(target)) type = "cve";
    else if (/^AS\d{1,10}$/i.test(target)) type = "asn";
    else if (/^(?:NORAD|CATNR)\s+\d{1,9}$/i.test(target)) type = "norad_id";
    else if (z.email().safeParse(target).success) type = "email";
    else if (/^https?:\/\//i.test(target)) type = "url";
    else if (/^\+?[\d\s().-]{8,24}$/.test(target)) type = "phone";
    else if (/^@[\w.-]{1,64}$/.test(target)) type = "username";
    else if (/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(target)) type = "domain";
    else if (/\b(?:ltd|limited|inc|llc|corp|corporation|company|pvt)\b/i.test(target)) type = "company";
    else if (/^[\p{L}][\p{L}\p{M}'’-]*(?:\s+[\p{L}][\p{L}\p{M}'’-]*){1,5}$/u.test(target)) type = "person_name";
  }

  if (requested !== "auto") {
    if (["person_name", "company", "topic", "location", "document", "ioc"].includes(requested)) {
      type = requested;
    } else if (requested === "username" && /^@?[\w.-]{1,64}$/.test(target)) {
      type = requested;
    } else if (requested === "norad_id" && /^\d{1,9}$/.test(target)) {
      type = requested;
    } else if (["vehicle_identifier", "file_hash", "certificate", "repository"].includes(requested)) {
      if (extendedUniversalType(target) !== requested) throw Object.assign(new Error("Target does not match selected type"), { status: 400 });
      type = requested;
    } else if (type !== requested) {
      throw Object.assign(new Error("Target does not match selected type"), { status: 400 });
    }
  }

  let normalizedTarget = target.trim();

  if (["vehicle_identifier", "file_hash", "certificate", "repository"].includes(type) && universal.primaryType !== "unknown") {
    normalizedTarget = universal.normalizedValue;
  }
  if (type === "email") {
    const at = target.lastIndexOf("@");
    normalizedTarget = target.slice(0, at) + "@" + target.slice(at + 1).toLowerCase();
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
main
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

codex/osint-search-routing-v1
  return { targetType: type, normalizedTarget };
}

function quotedPublicQuery(target: string): string {
  return `"${target.replace(/["\\]/g, " ")}"`;
}

export function planInvestigation(target: string, type: TargetType): AdapterPlan[] {
  const plan: AdapterPlan[] = [];
  const add = (
    adapterId: string,
    sourceName: string,
    input: Record<string, unknown>,
    reason: string,
    initialStatus?: AdapterPlan["initialStatus"],
  ) => plan.push({ adapterId, sourceName, input, reason, initialStatus });

  if (["domain", "url", "ip", "asn", "cve", "norad_id", "repository"].includes(type)) {
    const input =
      type === "norad_id"
        ? `NORAD ${target}`
        : type === "url"
          ? new URL(target).hostname
          : target;
    plan.push(...buildUniversalOsintPlan(input).runs.map(run => ({
      ...run,
      sourceName: run.adapterId.replace(/^public-/, "").replace(/-/g, " "),
    })));
  } else if (type === "vehicle_identifier") {
    add(
      "authorized-vehicle-registry",
      "Authorized vehicle registry",
      { registration: target },
      "No production vehicle-registry adapter is registered yet. Configure a lawful transport-data provider before registry details can be returned.",
      "NOT_CONFIGURED",
    );
    add("public-gdelt-news", "GDELT", { query: quotedPublicQuery(target), maxRecords: 15 }, "Public reporting mentioning the vehicle registration.");
    add("public-brave-search", "Brave Search", { query: quotedPublicQuery(target) }, "Indexed public web references for the vehicle registration.", process.env.BRAVE_SEARCH_API_KEY ? undefined : "NOT_CONFIGURED");
  } else if (type === "location") {
    add("public-wikidata-search", "Wikidata", { query: target, limit: 12 }, "Public place/entity records; exact location identity remains source-dependent.");
    add("public-gdelt-news", "GDELT", { query: quotedPublicQuery(target), maxRecords: 15 }, "Public reporting mentioning the location.");
    add("public-brave-search", "Brave Search", { query: quotedPublicQuery(target) }, "Indexed public web references for the location.", process.env.BRAVE_SEARCH_API_KEY ? undefined : "NOT_CONFIGURED");
  } else if (["file_hash", "certificate", "ioc", "document"].includes(type)) {
    add("public-gdelt-news", "GDELT", { query: quotedPublicQuery(target), maxRecords: 15 }, "Public reporting mentioning the submitted indicator or document reference.");
    add("public-brave-search", "Brave Search", { query: quotedPublicQuery(target) }, "Indexed public web references for the submitted indicator or document reference.", process.env.BRAVE_SEARCH_API_KEY ? undefined : "NOT_CONFIGURED");
  } else if (type !== "image") {
    if (type === "person_name" || type === "company" || type === "topic") {
      add("public-wikidata-search", "Wikidata", { query: target, limit: 12 }, "Distinct public entity records; identity remains unverified.");
    }
    add("public-gdelt-news", "GDELT", { query: quotedPublicQuery(target), maxRecords: 15 }, "Public reporting mentioning the query.");
    add("public-brave-search", "Brave Search", { query: quotedPublicQuery(target) }, "Indexed public web references.", process.env.BRAVE_SEARCH_API_KEY ? undefined : "NOT_CONFIGURED");
    if (type === "email" || type === "phone") {
      add("restricted-private-data", "Private / stolen credential datasets", {}, "Private and stolen datasets are blocked.", "BLOCKED");
      add("authorized-exposure", "Authorized exposure checks", {}, "Requires a separate explicit authorization workflow.", "RESTRICTED");
    }
  }

  if (["domain", "url", "ip", "asn"].includes(type)) {
    add(
      "passive-shodan",
      "Shodan",
      { target: type === "url" ? new URL(target).hostname : target, type: type === "url" ? "domain" : type },
      "Passive provider records only; filtered searches may consume one query credit.",
      process.env.SHODAN_API_KEY ? undefined : "NOT_CONFIGURED",
    );
  }
  if (type === "image") {
    add("google-vision-web", "Google Cloud Vision · Web Detection", {}, "Public image and page matches; no face identification.", process.env.GOOGLE_CLOUD_VISION_API_KEY ? undefined : "NOT_CONFIGURED");
  }

  return plan;

  if (inferred === "username") normalizedTarget = normalizedTarget.replace(/^@/, "");

  return { targetType: inferred, normalizedTarget };
}

export function planInvestigation(target: string, type: TargetType) {
  return buildTargetRoutePlan(target, type);
main
}
