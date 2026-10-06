import { isIP } from "node:net";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { z } from "zod";
import type { AdapterPlan, TargetType } from "../../lib/investigation/types";
import { buildUniversalOsintPlan } from "../../lib/unified/universal-osint-search";

const TYPES = [
  "auto", "person_name", "email", "phone", "username", "telegram", "instagram",
  "vehicle_identifier", "vin", "company", "domain", "ip", "asn", "url", "cve",
  "norad_id", "topic",
] as const;

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;
const INDIA_VEHICLE_RE = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/i;
const TELEGRAM_USERNAME_RE = /^[A-Za-z0-9_]{5,32}$/;
const INSTAGRAM_USERNAME_RE = /^[A-Za-z0-9._]{1,30}$/;

function astraEnabled(toolId: string): boolean {
  const key = `DISHA_ASTRA6_${toolId.toUpperCase().replace(/-/g, "_")}_ENABLED`;
  return process.env[key] === "true" || process.env.DISHA_ASTRA6_ALL_TOOLS_ENABLED === "true";
}

function identityToolStatus(toolId: string): AdapterPlan["initialStatus"] | undefined {
  if (process.env.DISHA_IDENTITY_ENUMERATION_APPROVED !== "true") return "RESTRICTED";
  return astraEnabled(toolId) ? undefined : "NOT_CONFIGURED";
}

function publicWorkerStatus(toolId: string): AdapterPlan["initialStatus"] | undefined {
  return astraEnabled(toolId) ? undefined : "NOT_CONFIGURED";
}

function telegramWorkerStatus(): AdapterPlan["initialStatus"] | undefined {
  if (!astraEnabled("telegram-public")) return "NOT_CONFIGURED";
  if (!process.env.TELEGRAM_API_ID || !process.env.TELEGRAM_API_HASH || !process.env.TELEGRAM_SESSION) return "NOT_CONFIGURED";
  return undefined;
}

function normalizeTelegram(value: string): string | undefined {
  const normalized = value.trim()
    .replace(/^https?:\/\/(?:t\.me|telegram\.me)\//i, "")
    .replace(/^@/, "")
    .split("/")[0] ?? "";
  return TELEGRAM_USERNAME_RE.test(normalized) ? normalized : undefined;
}

function normalizeInstagram(value: string): string | undefined {
  const normalized = value.trim()
    .replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split("/")[0] ?? "";
  return INSTAGRAM_USERNAME_RE.test(normalized) ? normalized : undefined;
}

export const investigationInput = z.object({
  target: z.string().trim().min(1).max(512).refine(value => !/[\u0000-\u001f\u007f]/.test(value), "Invalid target"),
  targetType: z.enum(TYPES).default("auto"),
}).strict();

export function classifyTarget(target: string, requested: typeof TYPES[number] = "auto"): { normalizedTarget: string; targetType: TargetType } {
  const trimmed = target.trim();
  const compactVehicle = trimmed.replace(/[\s-]/g, "").toUpperCase();
  const upper = trimmed.toUpperCase();
  let type: TargetType = "topic";

  if (/^https?:\/\/(?:t\.me|telegram\.me)\//i.test(trimmed) && normalizeTelegram(trimmed)) type = "telegram";
  else if (/^https?:\/\/(?:www\.)?instagram\.com\//i.test(trimmed) && normalizeInstagram(trimmed)) type = "instagram";
  else if (VIN_RE.test(upper)) type = "vin";
  else if (INDIA_VEHICLE_RE.test(compactVehicle)) type = "vehicle_identifier";
  else if (isIP(trimmed)) type = "ip";
  else if (/^CVE-\d{4}-\d{4,}$/i.test(trimmed)) type = "cve";
  else if (/^AS\d{1,10}$/i.test(trimmed)) type = "asn";
  else if (/^(?:NORAD|CATNR)\s+\d{1,9}$/i.test(trimmed)) type = "norad_id";
  else if (z.email().safeParse(trimmed).success) type = "email";
  else if (/^https?:\/\//i.test(trimmed)) type = "url";
  else if (/^\+?[\d\s().-]{8,24}$/.test(trimmed)) type = "phone";
  else if (/^@[\w.-]{1,64}$/.test(trimmed)) type = "username";
  else if (/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(trimmed)) type = "domain";
  else if (/\b(?:ltd|limited|inc|llc|corp|corporation|company|pvt)\b/i.test(trimmed)) type = "company";
  else if (/^[\p{L}][\p{L}\p{M}'’-]*(?:\s+[\p{L}][\p{L}\p{M}'’-]*){1,5}$/u.test(trimmed)) type = "person_name";

  if (requested !== "auto") {
    if (["person_name", "company", "topic"].includes(requested)) type = requested;
    else if (requested === "username" && /^@?[\w.-]{1,64}$/.test(trimmed)) type = requested;
    else if (requested === "telegram" && normalizeTelegram(trimmed)) type = requested;
    else if (requested === "instagram" && normalizeInstagram(trimmed)) type = requested;
    else if (requested === "vin" && VIN_RE.test(upper)) type = requested;
    else if (requested === "vehicle_identifier" && INDIA_VEHICLE_RE.test(compactVehicle)) type = requested;
    else if (requested === "norad_id" && /^\d{1,9}$/.test(trimmed)) type = requested;
    else if (type !== requested) throw Object.assign(new Error("Target does not match selected type"), { status: 400 });
  }

  let normalizedTarget = trimmed;
  if (type === "email") {
    const at = trimmed.lastIndexOf("@");
    normalizedTarget = trimmed.slice(0, at) + "@" + trimmed.slice(at + 1).toLowerCase();
  }
  if (type === "domain" || type === "ip") normalizedTarget = trimmed.toLowerCase();
  if (type === "asn" || type === "cve" || type === "vin") normalizedTarget = upper;
  if (type === "vehicle_identifier") normalizedTarget = compactVehicle;
  if (type === "telegram") normalizedTarget = normalizeTelegram(trimmed)!;
  if (type === "instagram") normalizedTarget = normalizeInstagram(trimmed)!;
  if (type === "asn" && (Number(trimmed.slice(2)) < 1 || Number(trimmed.slice(2)) > 4294967295)) throw Object.assign(new Error("Invalid ASN"), { status: 400 });
  if (type === "norad_id") normalizedTarget = trimmed.replace(/^(NORAD|CATNR)\s+/i, "");
  if (type === "username") normalizedTarget = trimmed.replace(/^@/, "");
  if (type === "phone") {
    // Never invent a country code for a local number.
    const phone = trimmed.startsWith("+") ? parsePhoneNumberFromString(trimmed) : undefined;
    if (!phone?.isValid()) throw Object.assign(new Error("Enter a valid international phone number including +country code"), { status: 400 });
    normalizedTarget = phone.number;
  }
  if (type === "url") {
    const url = new URL(trimmed);
    if (url.username || url.password || !["http:", "https:"].includes(url.protocol)) throw Object.assign(new Error("Invalid public URL"), { status: 400 });
    normalizedTarget = url.toString();
  }
  return { targetType: type, normalizedTarget };
}

export function planInvestigation(target: string, type: TargetType): AdapterPlan[] {
  const plan: AdapterPlan[] = [];
  const add = (adapterId: string, sourceName: string, input: Record<string, unknown>, reason: string, initialStatus?: AdapterPlan["initialStatus"]) => plan.push({ adapterId, sourceName, input, reason, initialStatus });

  if (type === "vin") {
    add("public-nhtsa-vin", "NHTSA vPIC", { vin: target }, "Official public VIN decoding and vehicle specification lookup.");
    return plan;
  }

  if (type === "vehicle_identifier") {
    add("public-india-vehicle-format", "India vehicle registration", { registration: target }, "Validate and normalize the registration; protected VAHAN owner records are not queried.");
    return plan;
  }

  if (["domain", "url", "ip", "asn", "cve", "norad_id"].includes(type)) {
    const input = type === "norad_id" ? `NORAD ${target}` : type === "url" ? new URL(target).hostname : target;
    plan.push(...buildUniversalOsintPlan(input).runs.map(run => ({ ...run, sourceName: run.adapterId.replace(/^public-/, "").replace(/-/g, " ") })));
  } else if (type !== "image") {
    if (type === "person_name" || type === "company" || type === "topic") {
      add("public-wikidata-search", "Wikidata", { query: target, limit: 12 }, "Distinct public entity records; identity remains unverified.");
    }

    add("public-gdelt-news", "GDELT", { query: `"${target.replace(/["\\]/g, " ")}"`, maxRecords: 15 }, "Public reporting mentioning the query.");
    add("public-brave-search", "Brave Search", { query: `"${target.replace(/["\\]/g, " ")}"` }, "Indexed public web references.", process.env.BRAVE_SEARCH_API_KEY ? undefined : "NOT_CONFIGURED");

    if (type === "username") {
      for (const [toolId, name] of [["sherlock", "Sherlock"], ["maigret", "Maigret"]] as const) {
        const status = identityToolStatus(toolId);
        add(
          `astra6-${toolId}`,
          name,
          { target, targetType: "username" },
          status === "RESTRICTED"
            ? "Cross-site username enumeration requires explicit authorized identity-investigation approval."
            : `Search public username presence through the isolated ${name} worker.`,
          status,
        );
      }
    }

    if (type === "email") {
      const status = identityToolStatus("holehe");
      add(
        "astra6-holehe",
        "Holehe",
        { target, targetType: "email" },
        status === "RESTRICTED"
          ? "Email account-presence checks require explicit authorized identity-investigation approval."
          : "Run bounded public account-presence checks with password-recovery-specific modules disabled.",
        status,
      );
    }

    if (type === "phone") {
      const status = identityToolStatus("phoneinfoga");
      add(
        "astra6-phoneinfoga",
        "PhoneInfoga",
        { target, targetType: "phone_number" },
        status === "RESTRICTED"
          ? "Phone intelligence requires explicit authorized identity-investigation approval."
          : "Run bounded public phone-number intelligence through the isolated ASTRA 6 identity worker.",
        status,
      );
    }

    if (type === "instagram") {
      const status = publicWorkerStatus("instaloader");
      add(
        "astra6-instaloader",
        "Instaloader",
        { target, targetType: "instagram_username" },
        "Resolve public Instagram profile metadata. Private profile bypass and follower scraping are not enabled.",
        status,
      );
    }

    if (type === "telegram") {
      const status = telegramWorkerStatus();
      add(
        "astra6-telegram-public",
        "Telegram Public Metadata",
        { target, targetType: "telegram_username" },
        "Resolve the supplied public Telegram username/channel through an authorized operator API session.",
        status,
      );
    }

    if (type === "email" || type === "phone") {
      add("restricted-private-data", "Private / stolen credential datasets", {}, "Private and stolen datasets are blocked.", "BLOCKED");
      add("authorized-exposure", "Authorized exposure checks", {}, "Requires a separate explicit authorization workflow.", "RESTRICTED");
    }
  }

  if (["domain", "url", "ip", "asn"].includes(type)) {
    add("passive-shodan", "Shodan", { target: type === "url" ? new URL(target).hostname : target, type: type === "url" ? "domain" : type }, "Passive provider records only; filtered searches may consume one query credit.", process.env.SHODAN_API_KEY ? undefined : "NOT_CONFIGURED");
  }
  if (type === "image") {
    add("google-vision-web", "Google Cloud Vision · Web Detection", {}, "Public image and page matches; no face identification.", process.env.GOOGLE_CLOUD_VISION_API_KEY ? undefined : "NOT_CONFIGURED");
  }
  return plan;
}
