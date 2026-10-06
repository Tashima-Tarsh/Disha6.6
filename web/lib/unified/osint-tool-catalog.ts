export type OsintToolRisk = "passive_public" | "mixed_recon" | "identity_enumeration" | "active_recon";
export type OsintToolMode = "builtin" | "catalog_only" | "blocked_by_default";

export type OsintToolCatalogEntry = {
  id: string;
  name: string;
  repository: string;
  license: string;
  capabilities: string[];
  risk: OsintToolRisk;
  mode: OsintToolMode;
  reason: string;
};

// Upstream project source is pinned under disha/services/integrations/osint-upstreams as Git
// submodules. Presence of source does not automatically authorize execution: tools remain behind
// DISHA's governed-extension boundary and preserve provenance, licensing, operator authorization,
// and the passive/public-source default.
export const osintToolCatalog: OsintToolCatalogEntry[] = [
  {
    id: "spiderfoot",
    name: "SpiderFoot",
    repository: "https://github.com/smicallef/spiderfoot",
    license: "MIT",
    capabilities: ["multi-source OSINT", "correlation", "attack-surface mapping", "exports"],
    risk: "mixed_recon",
    mode: "builtin",
    reason: "Production-integrated via ASTRA 6 with reviewed passive module allowlist.",
  },
  {
    id: "theharvester",
    name: "theHarvester",
    repository: "https://github.com/laramies/theHarvester",
    license: "GPL-2.0",
    capabilities: ["passive domain discovery", "certificate sources", "search-provider aggregation"],
    risk: "mixed_recon",
    mode: "builtin",
    reason: "Production-integrated via ASTRA 6 with passive-only provider allowlist.",
  },
  {
    id: "owasp-amass",
    name: "OWASP Amass",
    repository: "https://github.com/owasp-amass/amass",
    license: "Apache-2.0",
    capabilities: ["asset discovery", "DNS enumeration", "attack-surface mapping"],
    risk: "active_recon",
    mode: "blocked_by_default",
    reason: "Upstream supports active reconnaissance; DISHA integrates only the passive-only portion via ASTRA 6.",
  },
  {
    id: "intelowl",
    name: "IntelOwl",
    repository: "https://github.com/intelowlproject/IntelOwl",
    license: "AGPL-3.0",
    capabilities: ["threat-intelligence aggregation", "IOC enrichment", "analyzers/connectors"],
    risk: "mixed_recon",
    mode: "builtin",
codex/osint-service-runtime-hardening
    reason: "Integrated through a configured IntelOwl service adapter that accepts observables only and restricts execution to the server-side analyzer allowlist.",

    reason: "Executable through the configured IntelOwl service adapter with an explicit analyzer allowlist; DISHA does not run every installed analyzer.",
 main
  },
  {
    id: "opensanctions",
    name: "OpenSanctions",
    repository: "https://github.com/opensanctions/opensanctions",
    license: "MIT code; generated data CC-BY-NC-4.0 / source-specific terms",
    capabilities: ["sanctions screening", "PEP/entity data", "entity matching inputs", "provenance-rich datasets"],
    risk: "passive_public",
    mode: "catalog_only",
    reason: "Strong entity-screening source, but dataset licensing and third-party source terms must be enforced independently from the MIT-licensed code.",
  },
  {
    id: "opencti",
    name: "OpenCTI",
    repository: "https://github.com/OpenCTI-Platform/opencti",
    license: "Apache-2.0 Community Edition; Enterprise components separately licensed",
    capabilities: ["STIX2 knowledge graph", "threat-intelligence management", "connectors", "GraphQL API"],
    risk: "mixed_recon",
    mode: "builtin",
codex/osint-service-runtime-hardening
    reason: "Integrated through a configured read-only OpenCTI GraphQL adapter for bounded STIX core-object search; mutations and connector execution remain outside the adapter.",

    reason: "Executable through the configured OpenCTI GraphQL service adapter; tenant connectors and data-feed permissions remain controlled by the OpenCTI deployment.",
 main
  },
  {
    id: "recon-ng",
    name: "Recon-ng",
    repository: "https://github.com/lanmaster53/recon-ng",
    license: "GPL-3.0",
    capabilities: ["modular OSINT", "workspace correlation", "reporting"],
    risk: "mixed_recon",
    mode: "builtin",
    reason: "Production-integrated through the ASTRA advanced worker using only pinned, approved official marketplace modules.",
  },
  {
    id: "photon",
    name: "Photon",
    repository: "https://github.com/s0md3v/Photon",
    license: "See upstream LICENSE before promotion",
    capabilities: ["public web crawling", "URL extraction", "technology discovery"],
    risk: "active_recon",
    mode: "builtin",
    reason: "Production-integrated as a bounded depth-1 public-site crawler; execution requires the active-recon deployment gate plus per-investigation operator/admin authorization.",
  },
  {
    id: "sherlock",
    name: "Sherlock",
    repository: "https://github.com/sherlock-project/sherlock",
    license: "MIT",
    capabilities: ["username presence discovery"],
    risk: "identity_enumeration",
    mode: "builtin",
    reason: "Production-integrated via ASTRA 6 with identity enumeration policy gate.",
  },
  {
    id: "maigret",
    name: "Maigret",
    repository: "https://github.com/soxoj/maigret",
    license: "MIT",
    capabilities: ["username/account discovery", "profile correlation"],
    risk: "identity_enumeration",
    mode: "blocked_by_default",
    reason: "Identity enumeration remains disabled unless a future policy explicitly defines a lawful, consented use case.",
  },
  {
    id: "holehe",
    name: "Holehe",
    repository: "https://github.com/megadose/holehe",
    license: "GPL-3.0",
    capabilities: ["email account-presence discovery"],
    risk: "identity_enumeration",
    mode: "blocked_by_default",
    reason: "Account-presence probing can affect privacy and provider services; it is intentionally not executable by DISHA's default OSINT bus.",
  },
  {
    id: "awesome-osint",
    name: "Awesome OSINT",
    repository: "https://github.com/jivoi/awesome-osint",
    license: "CC-BY-SA-4.0",
    capabilities: ["OSINT resource discovery", "tool/source index"],
    risk: "passive_public",
    mode: "catalog_only",
    reason: "Useful discovery index; individual linked resources still require independent review before integration.",
  },
  {
    id: "phoneinfoga",
    name: "PhoneInfoga",
    repository: "https://github.com/sundowndev/phoneinfoga",
    license: "GPL-3.0",
    capabilities: ["phone number OSINT", "carrier lookup", "reputation check"],
    risk: "passive_public" as OsintToolRisk,
    mode: "builtin" as OsintToolMode,
    reason: "Production-integrated via ASTRA 6 for phone number intelligence with identity enumeration policy gate.",
  },
  {
    id: "subfinder",
    name: "ProjectDiscovery Subfinder",
    repository: "https://github.com/projectdiscovery/subfinder",
    license: "MIT",
    capabilities: ["passive subdomain enumeration", "multi-source subdomain discovery"],
    risk: "passive_public" as OsintToolRisk,
    mode: "builtin" as OsintToolMode,
    reason: "Production-integrated via ASTRA 6 for passive subdomain enumeration.",
  },
];

export function listOsintToolCatalog(): OsintToolCatalogEntry[] {
  return osintToolCatalog.map((entry) => ({ ...entry, capabilities: [...entry.capabilities] }));
}

export function getOsintToolCatalogSummary() {
  const entries = listOsintToolCatalog();
  return {
    total: entries.length,
    builtin: entries.filter((entry) => entry.mode === "builtin").length,
    catalogOnly: entries.filter((entry) => entry.mode === "catalog_only").length,
    blockedByDefault: entries.filter((entry) => entry.mode === "blocked_by_default").length,
    rule: "GitHub OSINT source is pinned as upstream submodules. Execution is promoted only through reviewed adapters with passive/public-source defaults, provenance, policy checks, and licensing review.",
  };
}
