import type {
  AdapterPlan,
  InvestigationMode,
  Jurisdiction,
  SearchUniverse,
  SourcePolicy,
  TargetType,
  TimeRange,
} from "../investigation/types";
import { buildUniversalOsintPlan } from "./universal-osint-search";

export interface TargetRouteOptions {
  identityAuthorized?: boolean;
  activeAuthorized?: boolean;
  searchUniverse?: SearchUniverse;
  investigationMode?: InvestigationMode;
  sourcePolicy?: SourcePolicy;
  jurisdiction?: Jurisdiction;
  timeRange?: TimeRange;
  selectedToolIds?: string[];
}

export type AdapterSourceClass =
  | "government"
  | "authoritative_registry"
  | "curated_cti"
  | "worker_scanner"
  | "public_archive"
  | "public_discovery";

export interface AdapterSourceMeta {
  sourceClass: AdapterSourceClass;
  authorityLevel: "official" | "primary" | "secondary" | "aggregator";
  jurisdiction: "india" | "global";
  compatibleUniverses: SearchUniverse[];
  compatibleTypes: TargetType[];
}

const ADAPTER_METADATA: Record<string, AdapterSourceMeta> = {
  "public-cisa-kev": { sourceClass: "government", authorityLevel: "official", jurisdiction: "global", compatibleUniverses: ["cyber", "government", "universal", "osint"], compatibleTypes: ["cve", "ioc"] },
  "public-nvd-cve": { sourceClass: "government", authorityLevel: "official", jurisdiction: "global", compatibleUniverses: ["cyber", "government", "universal", "osint"], compatibleTypes: ["cve", "ioc"] },
  "public-sec-edgar": { sourceClass: "government", authorityLevel: "official", jurisdiction: "global", compatibleUniverses: ["company", "government", "universal", "osint"], compatibleTypes: ["company", "topic"] },
  "public-noaa-space-weather": { sourceClass: "government", authorityLevel: "official", jurisdiction: "global", compatibleUniverses: ["government", "universal", "osint"], compatibleTypes: ["topic"] },
  "public-india-vehicle-format": { sourceClass: "government", authorityLevel: "official", jurisdiction: "india", compatibleUniverses: ["vehicle", "government", "universal", "osint"], compatibleTypes: ["vehicle_identifier"] },
  "authorized-vahan-registry": { sourceClass: "government", authorityLevel: "official", jurisdiction: "india", compatibleUniverses: ["vehicle", "government", "universal", "osint"], compatibleTypes: ["vehicle_identifier"] },
  "authorized-echallan": { sourceClass: "government", authorityLevel: "official", jurisdiction: "india", compatibleUniverses: ["vehicle", "government", "universal", "osint"], compatibleTypes: ["vehicle_identifier"] },

  "public-dns-google": { sourceClass: "authoritative_registry", authorityLevel: "primary", jurisdiction: "global", compatibleUniverses: ["domain", "cyber", "osint", "universal"], compatibleTypes: ["domain", "url"] },
  "public-rdap": { sourceClass: "authoritative_registry", authorityLevel: "primary", jurisdiction: "global", compatibleUniverses: ["domain", "cyber", "osint", "universal"], compatibleTypes: ["domain", "ip", "url", "asn"] },
  "public-certificate-transparency": { sourceClass: "authoritative_registry", authorityLevel: "primary", jurisdiction: "global", compatibleUniverses: ["domain", "cyber", "osint", "universal"], compatibleTypes: ["domain", "url", "certificate"] },
  "public-ripestat-whois": { sourceClass: "authoritative_registry", authorityLevel: "primary", jurisdiction: "global", compatibleUniverses: ["cyber", "osint", "universal"], compatibleTypes: ["ip", "asn"] },
  "public-celestrak-gp": { sourceClass: "authoritative_registry", authorityLevel: "primary", jurisdiction: "global", compatibleUniverses: ["universal", "osint"], compatibleTypes: ["norad_id", "topic"] },
  "public-epss": { sourceClass: "authoritative_registry", authorityLevel: "primary", jurisdiction: "global", compatibleUniverses: ["cyber", "osint", "universal"], compatibleTypes: ["cve", "ioc"] },
  "public-opensanctions": { sourceClass: "authoritative_registry", authorityLevel: "primary", jurisdiction: "global", compatibleUniverses: ["person", "company", "government", "universal", "osint"], compatibleTypes: ["person_name", "company", "topic"] },
  "public-opencorporates": { sourceClass: "authoritative_registry", authorityLevel: "primary", jurisdiction: "global", compatibleUniverses: ["company", "person", "universal", "osint"], compatibleTypes: ["company", "person_name", "topic"] },
  "public-wikidata-search": { sourceClass: "authoritative_registry", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["universal", "person", "company", "location", "document", "government", "osint"], compatibleTypes: ["person_name", "company", "location", "topic", "document"] },
  "public-openalex": { sourceClass: "authoritative_registry", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["document", "universal", "osint"], compatibleTypes: ["topic", "document"] },
  "public-reliefweb": { sourceClass: "authoritative_registry", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["location", "universal", "osint"], compatibleTypes: ["location", "topic"] },

  "public-threatfox": { sourceClass: "curated_cti", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["cyber", "osint", "universal"], compatibleTypes: ["ioc", "file_hash", "domain", "ip", "url"] },
  "public-malwarebazaar": { sourceClass: "curated_cti", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["cyber", "osint", "universal"], compatibleTypes: ["file_hash", "ioc"] },
  "service-opencti": { sourceClass: "curated_cti", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["cyber", "osint", "universal"], compatibleTypes: ["domain", "url", "ip", "asn", "file_hash", "ioc", "cve", "certificate"] },
  "service-intelowl": { sourceClass: "curated_cti", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["cyber", "osint", "universal"], compatibleTypes: ["domain", "url", "ip", "file_hash", "ioc"] },
  "passive-shodan": { sourceClass: "curated_cti", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["domain", "cyber", "osint", "universal"], compatibleTypes: ["domain", "url", "ip", "asn"] },

  "public-wayback-cdx": { sourceClass: "public_archive", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["domain", "osint", "universal"], compatibleTypes: ["domain", "url"] },
  "public-common-crawl": { sourceClass: "public_archive", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["domain", "osint", "universal"], compatibleTypes: ["domain", "url"] },

  "public-gdelt-news": { sourceClass: "public_discovery", authorityLevel: "aggregator", jurisdiction: "global", compatibleUniverses: ["universal", "person", "domain", "company", "location", "document", "osint"], compatibleTypes: ["domain", "url", "ip", "asn", "cve", "person_name", "company", "location", "topic", "email", "phone", "username", "vehicle_identifier", "file_hash", "certificate", "ioc", "norad_id", "repository"] },
  "public-brave-search": { sourceClass: "public_discovery", authorityLevel: "aggregator", jurisdiction: "global", compatibleUniverses: ["universal", "person", "domain", "company", "location", "document", "osint"], compatibleTypes: ["domain", "url", "ip", "asn", "person_name", "company", "location", "topic", "email", "phone", "username", "vehicle_identifier", "cve", "file_hash", "ioc", "certificate", "norad_id", "repository"] },
  "public-github-repository": { sourceClass: "public_discovery", authorityLevel: "primary", jurisdiction: "global", compatibleUniverses: ["cyber", "universal", "osint"], compatibleTypes: ["repository", "url"] },
  "google-vision-web": { sourceClass: "public_discovery", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["universal", "osint"], compatibleTypes: ["image"] },

  "astra6-theharvester": { sourceClass: "worker_scanner", authorityLevel: "aggregator", jurisdiction: "global", compatibleUniverses: ["domain", "osint", "universal"], compatibleTypes: ["domain", "url"] },
  "astra6-owasp-amass": { sourceClass: "worker_scanner", authorityLevel: "aggregator", jurisdiction: "global", compatibleUniverses: ["domain", "cyber", "osint", "universal"], compatibleTypes: ["domain", "url"] },
  "astra6-subfinder": { sourceClass: "worker_scanner", authorityLevel: "aggregator", jurisdiction: "global", compatibleUniverses: ["domain", "cyber", "osint", "universal"], compatibleTypes: ["domain", "url"] },
  "astra6-spiderfoot": { sourceClass: "worker_scanner", authorityLevel: "aggregator", jurisdiction: "global", compatibleUniverses: ["domain", "cyber", "osint", "universal"], compatibleTypes: ["domain", "url", "ip"] },
  "astra6-recon-ng": { sourceClass: "worker_scanner", authorityLevel: "aggregator", jurisdiction: "global", compatibleUniverses: ["domain", "osint", "universal"], compatibleTypes: ["domain", "url"] },
  "astra6-photon": { sourceClass: "worker_scanner", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["domain", "osint", "universal"], compatibleTypes: ["domain", "url"] },
  "astra6-phoneinfoga": { sourceClass: "worker_scanner", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["phone", "osint", "universal"], compatibleTypes: ["phone", "phone_number"] as unknown as TargetType[] },
  "astra6-sherlock": { sourceClass: "worker_scanner", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["person", "osint", "universal"], compatibleTypes: ["username"] },
  "astra6-maigret": { sourceClass: "worker_scanner", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["person", "osint", "universal"], compatibleTypes: ["username"] },
  "astra6-holehe": { sourceClass: "worker_scanner", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["email", "osint", "universal"], compatibleTypes: ["email"] },
  "astra6-instaloader": { sourceClass: "worker_scanner", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["person", "osint", "universal"], compatibleTypes: ["username"] },
  "astra6-telegram-public": { sourceClass: "worker_scanner", authorityLevel: "secondary", jurisdiction: "global", compatibleUniverses: ["person", "osint", "universal"], compatibleTypes: ["username", "topic"] },
};

const displayName = (adapterId: string) =>
  adapterId.replace(/^public-/, "").replace(/^astra6-/, "").replace(/^service-/, "").replace(/^authorized-/, "").replace(/-/g, " ");

function add(
  plan: AdapterPlan[],
  adapterId: string,
  sourceName: string,
  input: Record<string, unknown>,
  reason: string,
  initialStatus?: AdapterPlan["initialStatus"],
) {
  if (plan.some((p) => p.adapterId === adapterId)) return;
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
  options: TargetRouteOptions = {},
): AdapterPlan[] {
  const plan: AdapterPlan[] = [];
  const identityAuthorized = options.identityAuthorized === true;
  const activeAuthorized = options.activeAuthorized === true;
  const universe = options.searchUniverse ?? "universal";
  const sourcePolicy = options.sourcePolicy ?? "all_approved";
  const jurisdiction = options.jurisdiction ?? "global";
  const investigationMode = options.investigationMode ?? "standard";
  const timeRange = options.timeRange ?? "30d";
  const selectedToolIds = options.selectedToolIds ?? [];

  // Build base candidate adapters based on type and universe
  if (["domain", "url", "ip", "asn", "cve", "norad_id", "repository"].includes(type) || universe === "domain" || universe === "cyber") {
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

  if (type === "person_name") {
    add(plan, "public-wikidata-search", "Wikidata", { query: target, limit: 12 }, "Distinct public entity records; identity remains unverified.");
    addOpenSanctions(plan, target, "Person");
    addOpenCorporates(plan, target, "officer");
  }

  if (type === "company" || type === "topic" || universe === "company" || universe === "government") {
    add(plan, "public-wikidata-search", "Wikidata", { query: target, limit: 12 }, "Distinct public entity records; identity remains unverified.");
    addPublicDiscovery(plan, target);
  }

  if (type === "company" || universe === "company") {
    addOpenSanctions(plan, target, "Company");
    addOpenCorporates(plan, target, "company");
    add(
      plan,
      "public-sec-edgar",
      "SEC EDGAR",
      { cik: target, query: target },
      "Official SEC public corporate filings registry.",
    );
  }

  if (type === "location" || universe === "location") {
    add(
      plan,
      "public-reliefweb",
      "ReliefWeb",
      { query: target, limit: 12 },
      "Humanitarian and regional crisis intelligence from ReliefWeb.",
    );
  }

  if (type === "document" || universe === "document") {
    add(
      plan,
      "public-openalex",
      "OpenAlex",
      { query: target, limit: 12 },
      "Global academic and scholarly research publications graph.",
    );
  }

  if (["email", "phone", "username", "vehicle_identifier", "file_hash", "certificate", "ioc"].includes(type)) {
    addPublicDiscovery(plan, target);
  }

  if (type === "file_hash" || universe === "cyber") {
    if (type === "file_hash") {
      addThreatFox(plan, target, "file_hash");
      addMalwareBazaar(plan, target);
    }
  }

  if (type === "ioc" || universe === "cyber") {
    addThreatFox(plan, target, "ioc");
  }

  if (["domain", "url", "ip", "asn", "file_hash", "ioc", "cve", "certificate"].includes(type) || universe === "cyber") {
    addOpenCti(plan, target);
  }

  if (["domain", "url", "ip", "file_hash", "ioc"].includes(type) || universe === "cyber") {
    addIntelOwl(plan, target);
  }

  if (["domain", "ip", "url"].includes(type)) {
    addThreatFox(plan, target, "ioc");
  }

  if (type === "email" || universe === "email") {
    addAstraRoute(plan, "astra6-holehe", "Holehe", target, "email", identityAuthorized);
    addIdentityBoundaries(plan);
  }

  if (type === "phone" || universe === "phone") {
    addAstraRoute(plan, "astra6-phoneinfoga", "PhoneInfoga", target, "phone_number", identityAuthorized);
    addIdentityBoundaries(plan);
  }

  if (type === "username" || (universe === "person" && target.startsWith("@"))) {
    addAstraRoute(plan, "astra6-sherlock", "Sherlock", target, "username", identityAuthorized);
    addAstraRoute(plan, "astra6-maigret", "Maigret", target, "username", identityAuthorized);
  }

  if (type === "vehicle_identifier" || universe === "vehicle") {
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

  if (["domain", "url", "ip", "asn"].includes(type) || universe === "domain") {
    add(
      plan,
      "passive-shodan",
      "Shodan",
      { target: type === "url" ? new URL(target).hostname : target, type: type === "url" ? "domain" : type },
      "Passive provider records only; filtered searches may consume one query credit.",
      process.env.SHODAN_API_KEY ? undefined : "NOT_CONFIGURED",
    );
  }

  if (type === "domain" || type === "url" || universe === "domain" || universe === "osint") {
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

  // Handle explicit tool selections (Bug 5)
  if (selectedToolIds.length > 0) {
    const normalizedSelected = new Set(
      selectedToolIds.map((id) => {
        const clean = id.trim().toLowerCase();
        if (clean.startsWith("astra6-") || clean.startsWith("public-") || clean.startsWith("service-") || clean.startsWith("authorized-")) {
          return clean;
        }
        return `astra6-${clean}`;
      }),
    );

    // Check each selected tool
    for (const rawSelectedId of selectedToolIds) {
      const clean = rawSelectedId.trim().toLowerCase();
      const mappedId = clean.startsWith("astra6-") || clean.startsWith("public-") || clean.startsWith("service-") || clean.startsWith("authorized-")
        ? clean
        : `astra6-${clean}`;

      const alreadyInPlan = plan.find((p) => p.adapterId === mappedId || p.adapterId === clean);
      if (!alreadyInPlan) {
        const meta = ADAPTER_METADATA[mappedId] || ADAPTER_METADATA[clean];
        const sourceName = displayName(mappedId);

        if (!meta) {
          // Unknown / Catalog-only tool not mapped to runnable adapter
          add(
            plan,
            mappedId,
            sourceName,
            { target },
            `${sourceName} is cataloged but does not have a live production worker or adapter mapped in this deployment.`,
            "NOT_CONFIGURED",
          );
        } else {
          // Check compatibility
          const compatibleWithType = meta.compatibleTypes.includes(type) || (type === "topic" && meta.compatibleTypes.includes("topic"));

          if (!compatibleWithType) {
            add(
              plan,
              mappedId,
              sourceName,
              { target },
              `${sourceName} is incompatible with target type '${type}'.`,
              "INCOMPATIBLE",
            );
          } else if (mappedId.startsWith("astra6-")) {
            addAstraRoute(plan, mappedId, sourceName, target, type, identityAuthorized, activeAuthorized);
          } else {
            add(plan, mappedId, sourceName, { target }, `User explicitly selected ${sourceName}.`);
          }
        }
      }
    }
  }

  // Filter and rank plan according to governance policies (Bug 8, 9, 11)
  let filtered = plan.filter((item) => {
    const meta = ADAPTER_METADATA[item.adapterId];

    // Source Policy filtering (Bug 8)
    if (sourcePolicy === "government") {
      if (meta && meta.sourceClass !== "government") return false;
      if (!meta && !item.adapterId.includes("cisa") && !item.adapterId.includes("nvd") && !item.adapterId.includes("sec") && !item.adapterId.includes("vahan") && !item.adapterId.includes("echallan")) {
        return false;
      }
    } else if (sourcePolicy === "authoritative") {
      if (meta && meta.sourceClass !== "government" && meta.sourceClass !== "authoritative_registry") return false;
    } else if (sourcePolicy === "public") {
      if (item.initialStatus === "BLOCKED" || item.initialStatus === "RESTRICTED") return false;
    }

    // Investigation Mode archive filtering (Bug 11)
    if (investigationMode === "standard") {
      if (item.adapterId === "public-common-crawl" || item.adapterId === "public-wayback-cdx") {
        return false;
      }
    }

    return true;
  });

  // Mode: Evidence First sorts authoritative / government sources to front
  if (investigationMode === "evidence_first") {
    filtered.sort((a, b) => {
      const metaA = ADAPTER_METADATA[a.adapterId];
      const metaB = ADAPTER_METADATA[b.adapterId];
      const rank = (m?: AdapterSourceMeta) => {
        if (!m) return 50;
        if (m.sourceClass === "government") return 10;
        if (m.sourceClass === "authoritative_registry") return 20;
        if (m.sourceClass === "curated_cti") return 30;
        return 40;
      };
      return rank(metaA) - rank(metaB);
    });
  }

  // Jurisdiction: India mode prioritizes Indian sources
  if (jurisdiction === "india") {
    filtered.sort((a, b) => {
      const metaA = ADAPTER_METADATA[a.adapterId];
      const metaB = ADAPTER_METADATA[b.adapterId];
      const isIndiaA = metaA?.jurisdiction === "india" || a.adapterId.includes("india") || a.adapterId.includes("vahan");
      const isIndiaB = metaB?.jurisdiction === "india" || b.adapterId.includes("india") || b.adapterId.includes("vahan");
      if (isIndiaA && !isIndiaB) return -1;
      if (!isIndiaA && isIndiaB) return 1;
      return 0;
    });
  }

  return filtered;
}
