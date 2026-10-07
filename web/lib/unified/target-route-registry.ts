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

function addAstraRoute(
  plan: AdapterPlan[],
  adapterId: string,
  sourceName: string,
  target: string,
  targetType: string,
  identityAuthorized = false,
  activeAuthorized = false,
) {
  const toolId = adapterId.replace(/^astra6-/, "");
  const envKey = `DISHA_ASTRA6_${toolId.toUpperCase().replace(/-/g, "_")}_ENABLED`;
  const enabled = Boolean(process.env.DATABASE_URL)
    && (process.env[envKey] === "true" || process.env.DISHA_ASTRA6_ALL_TOOLS_ENABLED === "true");
  const identitySensitive = ["email", "phone_number", "username"].includes(targetType);
  const activeSensitive = toolId === "photon";
  const identityDeploymentApproved = process.env.DISHA_IDENTITY_ENUMERATION_APPROVED === "true";
  const activeDeploymentApproved = process.env.DISHA_ACTIVE_RECON_APPROVED === "true";
  const identityApproved = !identitySensitive || (identityDeploymentApproved && identityAuthorized);
  const activeApproved = !activeSensitive || (activeDeploymentApproved && activeAuthorized);
  const approved = identityApproved && activeApproved;
  const initialStatus: AdapterPlan["initialStatus"] | undefined = !enabled
    ? "NOT_CONFIGURED"
    : !approved
      ? "RESTRICTED"
      : undefined;
  const reason = !enabled
    ? "ASTRA 6 worker bridge requires DATABASE_URL and the tool enable flag."
    : !identityApproved
      ? "Identity-oriented ASTRA execution requires deployment approval plus operator/admin authorization for this investigation."
      : !activeApproved
        ? "Photon crawling requires deployment approval plus operator/admin authorization for this investigation."
        : "Execute through the isolated ASTRA 6 worker queue and return normalized evidence.";

  add(
    plan,
    adapterId,
    sourceName,
    {
      target,
      targetType,
      ...(identitySensitive ? { identityAuthorization: identityApproved } : {}),
      ...(activeSensitive ? { activeAuthorization: activeApproved } : {}),
    },
    reason,
    initialStatus,
  );
}


function addIdentityBoundaries(plan: AdapterPlan[]) {
  add(plan, "restricted-private-data", "Private / stolen credential datasets", {}, "Private and stolen datasets are blocked.", "BLOCKED");
  add(plan, "authorized-exposure", "Authorized exposure checks", {}, "Requires a separate explicit authorization workflow.", "RESTRICTED");
}

function addThreatFox(plan: AdapterPlan[], target: string, kind: "ioc" | "file_hash") {
  add(
    plan,
    "public-threatfox",
    "ThreatFox",
    { value: target, kind },
    "Defensive public threat-intelligence lookup. Requires an abuse.ch Auth-Key.",
    process.env.THREATFOX_AUTH_KEY ? undefined : "NOT_CONFIGURED",
  );
}

function addMalwareBazaar(plan: AdapterPlan[], hash: string) {
  add(
    plan,
    "public-malwarebazaar",
    "MalwareBazaar",
    { hash },
    "Defensive malware metadata lookup only; DISHA never downloads the sample.",
    process.env.MALWAREBAZAAR_AUTH_KEY ? undefined : "NOT_CONFIGURED",
  );
}

function serviceConfigured(...names: string[]): boolean {
  return names.every((name) => Boolean(process.env[name]?.trim()));
}

function addOpenCti(plan: AdapterPlan[], target: string) {
  add(
    plan,
    "service-opencti",
    "OpenCTI",
    { query: target },
    "Bounded read-only search of the configured OpenCTI STIX graph.",
    serviceConfigured("OPENCTI_BASE_URL", "OPENCTI_TOKEN") ? undefined : "NOT_CONFIGURED",
  );
}

function addIntelOwl(plan: AdapterPlan[], target: string) {
  const configured = Boolean(
    process.env.INTELOWL_BASE_URL?.trim() &&
    process.env.INTELOWL_API_KEY?.trim() &&
    (process.env.INTELOWL_ANALYZERS_ALLOWLIST?.trim() || process.env.INTELOWL_ANALYZERS?.trim())
  );
  add(
    plan,
    "service-intelowl",
    "IntelOwl",
    { observable: target },
    "Observable enrichment through the configured IntelOwl service using only the server-side analyzer allowlist.",
    configured ? undefined : "NOT_CONFIGURED",
  );
}

function addOpenSanctions(plan: AdapterPlan[], target: string, schema: "Person" | "Company") {
  add(
    plan,
    "public-opensanctions",
    "OpenSanctions",
    { query: target, schema },
    "Public sanctions/PEP/entity discovery; returned search results remain unverified identity candidates.",
    process.env.OPENSANCTIONS_API_KEY ? undefined : "NOT_CONFIGURED",
  );
}

function addOpenCorporates(plan: AdapterPlan[], target: string, kind: "company" | "officer") {
  add(
    plan,
    "public-opencorporates",
    "OpenCorporates",
    { query: target, kind },
    "Public corporate/officer record discovery. Name matches require corroboration.",
    process.env.OPENCORPORATES_API_TOKEN ? undefined : "NOT_CONFIGURED",
  );
}

export function buildTargetRoutePlan(
  target: string,
  type: TargetType,
  options: { identityAuthorized?: boolean; activeAuthorized?: boolean } = {},
): AdapterPlan[] {
  const plan: AdapterPlan[] = [];
  const identityAuthorized = options.identityAuthorized === true;
  const activeAuthorized = options.activeAuthorized === true;

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

  if (type === "person_name") {
    addOpenSanctions(plan, target, "Person");
    addOpenCorporates(plan, target, "officer");
  }

  if (type === "company") {
    addOpenSanctions(plan, target, "Company");
    addOpenCorporates(plan, target, "company");
  }

  if (["email", "phone", "username", "vehicle_identifier", "file_hash", "certificate", "ioc"].includes(type)) {
    addPublicDiscovery(plan, target);
  }

  if (type === "file_hash") {
    addThreatFox(plan, target, "file_hash");
    addMalwareBazaar(plan, target);
  }

  if (type === "ioc") {
    addThreatFox(plan, target, "ioc");
  }

  if (["domain", "url", "ip", "asn", "file_hash", "ioc", "cve", "certificate"].includes(type)) {
    addOpenCti(plan, target);
  }

  if (["domain", "url", "ip", "file_hash", "ioc"].includes(type)) {
    addIntelOwl(plan, target);
  }

  if (["domain", "ip", "url"].includes(type)) {
    addThreatFox(plan, target, "ioc");
  }

  if (type === "email") {
    addAstraRoute(plan, "astra6-holehe", "Holehe", target, "email", identityAuthorized);
    addIdentityBoundaries(plan);
  }

  if (type === "phone") {
    addAstraRoute(plan, "astra6-phoneinfoga", "PhoneInfoga", target, "phone_number", identityAuthorized);
    addIdentityBoundaries(plan);
  }

  if (type === "username") {
    addAstraRoute(plan, "astra6-sherlock", "Sherlock", target, "username", identityAuthorized);
    addAstraRoute(plan, "astra6-maigret", "Maigret", target, "username", identityAuthorized);
  }

  if (type === "vehicle_identifier") {
    add(
      plan,
      "public-india-vehicle-format",
      "India Vehicle Registration Format",
      { registration: target },
      "Validate and normalize the public Indian registration format without querying protected owner data.",
    );
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
    addAstraRoute(plan, "astra6-theharvester", "theHarvester", domain, "domain");
    addAstraRoute(plan, "astra6-owasp-amass", "OWASP Amass", domain, "domain");
    addAstraRoute(plan, "astra6-subfinder", "ProjectDiscovery Subfinder", domain, "domain");
    addAstraRoute(plan, "astra6-spiderfoot", "SpiderFoot", domain, "domain");
    addAstraRoute(plan, "astra6-recon-ng", "Recon-ng", domain, "domain");
    addAstraRoute(plan, "astra6-photon", "Photon", domain, "domain", false, activeAuthorized);
  }

  if (type === "ip") {
    addAstraRoute(plan, "astra6-spiderfoot", "SpiderFoot", target, "ip");
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
