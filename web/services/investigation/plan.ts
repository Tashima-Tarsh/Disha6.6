import { isIP } from "node:net";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { z } from "zod";
import type { AdapterPlan, TargetType } from "../../lib/investigation/types";
import { buildUniversalOsintPlan } from "../../lib/unified/universal-osint-search";

const TYPES = ["auto", "person_name", "email", "phone", "username", "company", "domain", "ip", "asn", "url", "cve", "norad_id", "topic"] as const;
export const investigationInput = z.object({
  target: z.string().trim().min(1).max(512).refine(value => !/[\u0000-\u001f\u007f]/.test(value), "Invalid target"),
  targetType: z.enum(TYPES).default("auto"),
}).strict();
export function classifyTarget(target: string, requested: typeof TYPES[number] = "auto"): { normalizedTarget: string; targetType: TargetType } {
  let type: TargetType = "topic";
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
  if (requested !== "auto") {
    if (["person_name", "company", "topic"].includes(requested)) type = requested;
    else if (requested === "username" && /^@?[\w.-]{1,64}$/.test(target)) type = requested;
    else if (requested === "norad_id" && /^\d{1,9}$/.test(target)) type = requested;
    else if (type !== requested) throw Object.assign(new Error("Target does not match selected type"), { status: 400 });
  }
  let normalizedTarget = target;
  if (type === "email") {
    const at = target.lastIndexOf("@");
    normalizedTarget = target.slice(0, at) + "@" + target.slice(at + 1).toLowerCase();
  }
  if (type === "domain" || type === "ip") normalizedTarget = target.toLowerCase();
  if (type === "asn" || type === "cve") normalizedTarget = target.toUpperCase();
  if (type === "asn" && (Number(target.slice(2)) < 1 || Number(target.slice(2)) > 4294967295)) throw Object.assign(new Error("Invalid ASN"), { status: 400 });
  if (type === "norad_id") normalizedTarget = target.replace(/^(NORAD|CATNR)\s+/i, "");
  if (type === "username") normalizedTarget = target.replace(/^@/, "");
  if (type === "phone") {
    // Never invent a country code for a local number.
    const phone = target.startsWith("+") ? parsePhoneNumberFromString(target) : undefined;
    if (!phone?.isValid()) throw Object.assign(new Error("Enter a valid international phone number including +country code"), { status: 400 });
    normalizedTarget = phone.number;
  }
  if (type === "url") {
    const url = new URL(target);
    if (url.username || url.password || !["http:", "https:"].includes(url.protocol)) throw Object.assign(new Error("Invalid public URL"), { status: 400 });
    normalizedTarget = url.toString();
  }
  return { targetType: type, normalizedTarget };
}

export function planInvestigation(target: string, type: TargetType): AdapterPlan[] {
  const plan: AdapterPlan[] = [];
  const add = (adapterId: string, sourceName: string, input: Record<string, unknown>, reason: string, initialStatus?: AdapterPlan["initialStatus"]) => plan.push({ adapterId, sourceName, input, reason, initialStatus });
  if (["domain", "url", "ip", "asn", "cve", "norad_id"].includes(type)) {
    const input = type === "norad_id" ? `NORAD ${target}` : type === "url" ? new URL(target).hostname : target;
    plan.push(...buildUniversalOsintPlan(input).runs.map(run => ({ ...run, sourceName: run.adapterId.replace(/^public-/, "").replace(/-/g, " ") })));
  } else if (type !== "image") {
    if (type === "person_name" || type === "company" || type === "topic") add("public-wikidata-search", "Wikidata", { query: target, limit: 12 }, "Distinct public entity records; identity remains unverified.");
    add("public-gdelt-news", "GDELT", { query: `"${target.replace(/["\\]/g, " ")}"`, maxRecords: 15 }, "Public reporting mentioning the query.");
    add("public-brave-search", "Brave Search", { query: `"${target.replace(/["\\]/g, " ")}"` }, "Indexed public web references.", process.env.BRAVE_SEARCH_API_KEY ? undefined : "NOT_CONFIGURED");
    if (type === "email" || type === "phone") {
      add("restricted-private-data", "Private / stolen credential datasets", {}, "Private and stolen datasets are blocked.", "BLOCKED");
      add("authorized-exposure", "Authorized exposure checks", {}, "Requires a separate explicit authorization workflow.", "RESTRICTED");
    }
  }
  if (["domain", "url", "ip", "asn"].includes(type)) add("passive-shodan", "Shodan", { target: type === "url" ? new URL(target).hostname : target, type: type === "url" ? "domain" : type }, "Passive provider records only; filtered searches may consume one query credit.", process.env.SHODAN_API_KEY ? undefined : "NOT_CONFIGURED");
  if (type === "image") add("google-vision-web", "Google Cloud Vision · Web Detection", {}, "Public image and page matches; no face identification.", process.env.GOOGLE_CLOUD_VISION_API_KEY ? undefined : "NOT_CONFIGURED");
  return plan;
}
