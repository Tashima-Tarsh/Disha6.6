import type { AdapterPlan, TargetType } from "../investigation/types";
import { buildUniversalOsintPlan } from "./universal-osint-search";

const displayName = (adapterId: string) =>
  adapterId.replace(/^public-/, "").replace(/^astra6-/, "").replace(/-/g, " ");

function add(
  plan: AdapterPlan[],
  adapterId: string,
  sourceName: string,
  input: Record<string, unknown>,
  reason: string,
  initialStatus?: AdapterPlan["initialStatus"],
) {
  plan.push({ adapterId, sourceName, input, reason, initialStatus });
}

function addPublicDiscovery(plan: AdapterPlan[], target: string) {
  const query = `"${target.replace(/["\\]/g, " ")}"`;
  add(plan, "public-gdelt-news", "GDELT", { query, maxRecords: 15 }, "Public reporting mentioning the target.");
  add(
    plan,
    "public-brave-search",
    "Brave Search",
    { query },
    "Indexed public web references.",
    process.env.BRAVE_SEARCH_API_KEY ? undefined : "NOT_CONFIGURED",
  );
}

function addPendingAstra(
  plan: AdapterPlan[],
  adapterId: string,
  sourceName: string,
  target: string,
  targetType: string,
) {
  add(
    plan,
    adapterId,
    sourceName,
    { target, targetType },
    "ASTRA 6 worker capability is present, but the ephemeral investigation-to-worker result bridge is not connected yet.",
    "NOT_CONFIGURED",
  );
}

function addIdentityBoundaries(plan: AdapterPlan[]) {
  add(plan, "restricted-private-data", "Private / stolen credential datasets", {}, "Private and stolen datasets are blocked.", "BLOCKED");
  add(plan, "authorized-exposure", "Authorized exposure checks", {}, "Requires a separate explicit authorization workflow.", "RESTRICTED");
}

export function buildTargetRoutePlan(target: string, type: TargetType): AdapterPlan[] {
  const plan: AdapterPlan[] = [];

  if (["domain", "url", "ip", "asn", "cve", "norad_id", "repository"].includes(type)) {
    const input =
      type === "norad_id"
        ? `NORAD ${target}`
        : type === "url"
          ? new URL(target).hostname
          : target;
    for (const run of buildUniversalOsintPlan(input).runs) {
      add(plan, run.adapterId, displayName(run.adapterId), run.input, run.reason);
    }
  }

  if (["person_name", "company", "topic", "location"].includes(type)) {
    add(plan, "public-wikidata-search", "Wikidata", { query: target, limit: 12 }, "Distinct public entity records; identity remains unverified.");
    addPublicDiscovery(plan, target);
  }

  if (["email", "phone", "username", "vehicle_identifier", "file_hash", "certificate", "ioc"].includes(type)) {
    addPublicDiscovery(plan, target);
  }

  if (type === "email") {
    addPendingAstra(plan, "astra6-spiderfoot", "SpiderFoot", target, "email");
    addIdentityBoundaries(plan);
  }

  if (type === "phone") {
    addPendingAstra(plan, "astra6-phoneinfoga", "PhoneInfoga", target, "phone_number");
    addPendingAstra(plan, "astra6-spiderfoot", "SpiderFoot", target, "phone_number");
    addIdentityBoundaries(plan);
  }

  if (type === "username") {
    addPendingAstra(plan, "astra6-sherlock", "Sherlock", target, "username");
    addPendingAstra(plan, "astra6-spiderfoot", "SpiderFoot", target, "username");
  }

  if (type === "vehicle_identifier") {
    add(
      plan,
      "authorized-vahan-registry",
      "VAHAN / National Transport Registry",
      { registrationNumber: target },
      "Vehicle registry enrichment requires an approved data-sharing/API entitlement and a reviewed connector.",
      "RESTRICTED",
    );
    add(
      plan,
      "authorized-echallan",
      "eChallan",
      { registrationNumber: target },
      "Enforcement/challan enrichment requires an approved public or authorized connector.",
      "RESTRICTED",
    );
  }

  if (["domain", "url", "ip", "asn"].includes(type)) {
    add(
      plan,
      "passive-shodan",
      "Shodan",
      { target: type === "url" ? new URL(target).hostname : target, type: type === "url" ? "domain" : type },
      "Passive provider records only; filtered searches may consume one query credit.",
      process.env.SHODAN_API_KEY ? undefined : "NOT_CONFIGURED",
    );
  }

  if (type === "domain" || type === "url") {
    const domain = type === "url" ? new URL(target).hostname : target;
    addPendingAstra(plan, "astra6-theharvester", "theHarvester", domain, "domain");
    addPendingAstra(plan, "astra6-spiderfoot", "SpiderFoot", domain, "domain");
    addPendingAstra(plan, "astra6-owasp-amass", "OWASP Amass", domain, "domain");
    addPendingAstra(plan, "astra6-subfinder", "ProjectDiscovery Subfinder", domain, "domain");
  }

  if (type === "ip") {
    addPendingAstra(plan, "astra6-spiderfoot", "SpiderFoot", target, "ip");
  }

  if (type === "image") {
    add(
      plan,
      "google-vision-web",
      "Google Cloud Vision · Web Detection",
      {},
      "Public image and page matches; no face identification.",
      process.env.GOOGLE_CLOUD_VISION_API_KEY ? undefined : "NOT_CONFIGURED",
    );
  }

  return plan;
}
