import { hashValue } from "./hash";
import type { AdapterExecutionClass } from "./osint-adapter-bus";

export type DishaToolManifest = {
  toolId: string;
  name: string;
  version: string;
  repository: string;
  license: string;
  executionClass: AdapterExecutionClass;
  targetTypes: string[];
  capabilities: string[];
  passiveModuleAllowlist?: string[];
  blockedModules?: string[];
  workerRuntime: "python" | "go" | "node" | "rust" | "docker" | "binary" | "library-only" | "dataset-only" | "gui-only" | "documentation" | string;
  cliCommand: string;
  outputFormat: "json" | "csv" | "ndjson" | "text";
  timeoutMs: number;
  maxRetries: number;
  rateLimitPerMinute: number;
  legalUse: string[];
  blockedUse: string[];
  commandInjectionGuard: RegExp;
  registeredAt: string;
  manifestHash: string;
};

// Command injection guard: blocks shell metacharacters
const SHELL_INJECTION_GUARD = /[;&|`$(){}[\]<>!\n\r\\"']/;

export function validateCommandTarget(target: string, guard: RegExp): string {
  const trimmed = target.trim();
  if (!trimmed || trimmed.length > 512) throw new Error("target_invalid_length");
  if (guard.test(trimmed)) throw new Error("target_command_injection_blocked");
  return trimmed;
}

function buildManifest(input: Omit<DishaToolManifest, "registeredAt" | "manifestHash">): DishaToolManifest {
  const registeredAt = new Date().toISOString();
  const manifestHash = hashValue({ ...input, registeredAt });
  return { ...input, registeredAt, manifestHash };
}

export const phoneInfogaManifest = buildManifest({
  toolId: "phoneinfoga",
  name: "PhoneInfoga",
  version: "2.11.0",
  repository: "https://github.com/sundowndev/phoneinfoga",
  license: "GPL-3.0",
  executionClass: "passive_public",
  targetTypes: ["phone_number"],
  capabilities: ["phone number OSINT", "carrier lookup", "reputation check", "number validation"],
  workerRuntime: "go",
  cliCommand: "phoneinfoga scan",
  outputFormat: "json",
  timeoutMs: 30_000,
  maxRetries: 1,
  rateLimitPerMinute: 10,
  legalUse: ["Phone number validation", "Carrier identification", "Public reputation lookup"],
  blockedUse: ["Tracking individuals", "Unauthorized surveillance", "Harassment"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const sherlockManifest = buildManifest({
  toolId: "sherlock",
  name: "Sherlock",
  version: "0.15.0",
  repository: "https://github.com/sherlock-project/sherlock",
  license: "MIT",
  executionClass: "passive_public",
  targetTypes: ["username"],
  capabilities: ["username presence discovery", "social media account enumeration"],
  workerRuntime: "python",
  cliCommand: "sherlock",
  outputFormat: "json",
  timeoutMs: 120_000,
  maxRetries: 1,
  rateLimitPerMinute: 5,
  legalUse: ["Authorized identity investigation", "Account recovery support", "Consented background checks"],
  blockedUse: ["Stalking", "Harassment", "Unauthorized personal surveillance", "Non-consented enumeration"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const theHarvesterManifest = buildManifest({
  toolId: "theharvester",
  name: "theHarvester",
  version: "4.6.0",
  repository: "https://github.com/laramies/theHarvester",
  license: "GPL-2.0",
  executionClass: "passive_public",
  targetTypes: ["domain"],
  capabilities: ["passive domain discovery", "email harvesting", "subdomain enumeration", "search-provider aggregation"],
  passiveModuleAllowlist: ["anubis", "crtsh", "dnsdumpster", "duckduckgo", "hackertarget", "otx", "rapiddns", "subdomaincenter", "subdomainfinderc99", "threatminer", "urlscan", "yahoo"],
  blockedModules: ["bing", "google", "shodan", "censys", "zoomeye", "securityTrails", "hunter", "intelx", "pentest-tools", "projectDiscovery", "rocketreach", "spyse", "threatcrowd"],
  workerRuntime: "python",
  cliCommand: "theHarvester",
  outputFormat: "json",
  timeoutMs: 120_000,
  maxRetries: 1,
  rateLimitPerMinute: 5,
  legalUse: ["Public domain intelligence", "Passive subdomain discovery", "Certificate-based enumeration"],
  blockedUse: ["Active scanning", "Credential harvesting", "Intrusive reconnaissance"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const spiderfootManifest = buildManifest({
  toolId: "spiderfoot",
  name: "SpiderFoot",
  version: "4.0.0",
  repository: "https://github.com/smicallef/spiderfoot",
  license: "MIT",
  executionClass: "passive_public",
  targetTypes: ["domain", "ip"],
  capabilities: ["multi-source passive OSINT", "correlation", "public infrastructure intelligence"],
  passiveModuleAllowlist: [
    "sfp_archiveorg",
    "sfp_bgpview",
    "sfp_certspotter",
    "sfp_crt",
    "sfp_grep_app",
    "sfp_hackertarget",
    "sfp_ipinfo",
    "sfp_opnicwhois",
    "sfp_ripe",
    "sfp_robtex",
    "sfp_threatminer",
    "sfp_urlscan",
    "sfp_viewdns"
  ],
  blockedModules: [
    "sfp_dnsbrute",
    "sfp_dnszonexfer",
    "sfp_portscan_tcp",
    "sfp_portscan_udp",
    "sfp_spider",
    "sfp_crawlnow",
    "sfp_sslcert",
    "sfp_projectdiscovery"
  ],
  workerRuntime: "python",
  cliCommand: "sfcli.py",
  outputFormat: "json",
  timeoutMs: 180_000,
  maxRetries: 1,
  rateLimitPerMinute: 3,
  legalUse: ["Multi-source passive intelligence", "Correlation analysis", "Defensive asset mapping"],
  blockedUse: ["Active port scanning", "Web crawling", "Credential discovery", "Unbounded scans"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const amassManifest = buildManifest({
  toolId: "owasp-amass",
  name: "OWASP Amass",
  version: "4.2.0",
  repository: "https://github.com/owasp-amass/amass",
  license: "Apache-2.0",
  executionClass: "passive_public",
  targetTypes: ["domain"],
  capabilities: ["passive asset discovery", "DNS enumeration", "subdomain enumeration"],
  workerRuntime: "go",
  cliCommand: "amass enum -passive",
  outputFormat: "json",
  timeoutMs: 120_000,
  maxRetries: 1,
  rateLimitPerMinute: 5,
  legalUse: ["Passive DNS enumeration", "Defensive attack surface mapping", "Public asset discovery"],
  blockedUse: ["Active reconnaissance", "Brute-force DNS resolution", "Zone transfer attempts"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const subfinderManifest = buildManifest({
  toolId: "subfinder",
  name: "ProjectDiscovery Subfinder",
  version: "2.6.6",
  repository: "https://github.com/projectdiscovery/subfinder",
  license: "MIT",
  executionClass: "passive_public",
  targetTypes: ["domain"],
  capabilities: ["passive subdomain enumeration", "multi-source subdomain discovery"],
  workerRuntime: "go",
  cliCommand: "subfinder",
  outputFormat: "json",
  timeoutMs: 90_000,
  maxRetries: 1,
  rateLimitPerMinute: 8,
  legalUse: ["Passive subdomain enumeration", "Defensive asset inventory", "Public infrastructure mapping"],
  blockedUse: ["Active probing", "Brute-force enumeration", "Port scanning"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const maigretManifest = buildManifest({
  toolId: "maigret",
  name: "Maigret",
  version: "0.6.6",
  repository: "https://github.com/soxoj/maigret",
  license: "MIT",
  executionClass: "passive_public",
  targetTypes: ["username"],
  capabilities: ["public username presence discovery", "cross-site profile URL discovery"],
  workerRuntime: "python",
  cliCommand: "identity-osint-adapter.py maigret",
  outputFormat: "json",
  timeoutMs: 120_000,
  maxRetries: 0,
  rateLimitPerMinute: 3,
  legalUse: ["Authorized identity investigation", "Public account discovery", "Consented background research"],
  blockedUse: ["Stalking", "Harassment", "Unauthorized personal surveillance"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const holeheManifest = buildManifest({
  toolId: "holehe",
  name: "Holehe",
  version: "1.61",
  repository: "https://github.com/megadose/holehe",
  license: "GPL-3.0",
  executionClass: "passive_public",
  targetTypes: ["email"],
  capabilities: ["bounded public account-presence checks", "email service correlation"],
  workerRuntime: "python",
  cliCommand: "identity-osint-adapter.py holehe",
  outputFormat: "json",
  timeoutMs: 90_000,
  maxRetries: 0,
  rateLimitPerMinute: 2,
  legalUse: ["Authorized email investigation", "Account inventory for an address the operator is authorized to investigate"],
  blockedUse: ["Password recovery abuse", "Credential attacks", "Harassment", "Unauthorized personal surveillance"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const instaloaderManifest = buildManifest({
  toolId: "instaloader",
  name: "Instaloader",
  version: "4.15.3",
  repository: "https://github.com/instaloader/instaloader",
  license: "MIT",
  executionClass: "passive_public",
  targetTypes: ["instagram_username"],
  capabilities: ["public Instagram profile metadata", "public profile URL verification"],
  workerRuntime: "python",
  cliCommand: "identity-osint-adapter.py instagram",
  outputFormat: "json",
  timeoutMs: 45_000,
  maxRetries: 0,
  rateLimitPerMinute: 4,
  legalUse: ["Public profile research", "Authorized social-media investigation"],
  blockedUse: ["Private-account bypass", "Session theft", "Follower scraping without authorization"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const telegramPublicManifest = buildManifest({
  toolId: "telegram-public",
  name: "Telegram Public Metadata",
  version: "1.45.0",
  repository: "https://github.com/LonamiWebs/Telethon",
  license: "MIT",
  executionClass: "credentialed_public_api",
  targetTypes: ["telegram_username"],
  capabilities: ["public Telegram username resolution", "public user/channel metadata"],
  workerRuntime: "python",
  cliCommand: "identity-osint-adapter.py telegram",
  outputFormat: "json",
  timeoutMs: 45_000,
  maxRetries: 0,
  rateLimitPerMinute: 4,
  legalUse: ["Public Telegram profile/channel research", "Authorized investigations using an operator-owned Telegram API session"],
  blockedUse: ["Private chat access", "Private group bypass", "Participant harvesting", "Credential attacks"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const reconNgManifest = buildManifest({
  toolId: "recon-ng",
  name: "Recon-ng",
  version: "5.1.2",
  repository: "https://github.com/lanmaster53/recon-ng",
  license: "GPL-3.0",
  executionClass: "passive_public",
  targetTypes: ["domain"],
  capabilities: ["allowlisted public domain-to-host discovery", "certificate transparency enrichment"],
  passiveModuleAllowlist: [
    "recon/domains-hosts/certificate_transparency",
    "recon/domains-hosts/hackertarget",
    "recon/domains-hosts/threatminer"
  ],
  blockedModules: ["marketplace auto-install", "brute-force modules", "credential modules", "active scanning modules"],
  workerRuntime: "python",
  cliCommand: "recon-ng-adapter.py",
  outputFormat: "json",
  timeoutMs: 120_000,
  maxRetries: 0,
  rateLimitPerMinute: 4,
  legalUse: ["Public domain intelligence", "Certificate transparency lookup", "Defensive asset inventory"],
  blockedUse: ["Credential discovery", "Brute-force enumeration", "Active scanning", "Arbitrary marketplace module execution"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const photonManifest = buildManifest({
  toolId: "photon",
  name: "Photon",
  version: "1.3.2",
  repository: "https://github.com/s0md3v/Photon",
  license: "GPL-3.0",
  executionClass: "active_recon",
  targetTypes: ["domain"],
  capabilities: ["bounded same-site public URL discovery"],
  workerRuntime: "python",
  cliCommand: "photon.py",
  outputFormat: "json",
  timeoutMs: 90_000,
  maxRetries: 0,
  rateLimitPerMinute: 2,
  legalUse: ["Explicitly authorized public website crawling", "Defensive web inventory"],
  blockedUse: ["Secret-key extraction", "Site cloning", "DNS enumeration", "Private content access", "Unbounded crawling"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const userScannerManifest = buildManifest({
  toolId: "user-scanner",
  name: "User Scanner",
  version: "2.1.0",
  repository: "https://github.com/kaifcodec/user-scanner",
  license: "GPL-3.0",
  executionClass: "passive_public",
  targetTypes: ["email", "username"],
  capabilities: ["2-in-1 email and username OSINT suite", "MCP support", "2720+ scan vectors"],
  workerRuntime: "python",
  cliCommand: "user-scanner",
  outputFormat: "json",
  timeoutMs: 90_000,
  maxRetries: 0,
  rateLimitPerMinute: 4,
  legalUse: ["Authorized identity investigation", "Consented digital footprinting", "Defensive security research"],
  blockedUse: ["Stalking", "Harassment", "Covert tracking"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const toutatisManifest = buildManifest({
  toolId: "toutatis",
  name: "Toutatis",
  version: "1.3",
  repository: "https://github.com/megadose/toutatis",
  license: "GPL-3.0",
  executionClass: "passive_public",
  targetTypes: ["username", "instagram_username"],
  capabilities: ["Instagram OSINT", "phone and email hint extraction", "account metadata"],
  workerRuntime: "python",
  cliCommand: "identity-osint-adapter.py toutatis",
  outputFormat: "json",
  timeoutMs: 60_000,
  maxRetries: 0,
  rateLimitPerMinute: 3,
  legalUse: ["Authorized social media investigation", "Account verification"],
  blockedUse: ["Mass scraping", "Harassment", "Surveillance"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const mrHolmesManifest = buildManifest({
  toolId: "mrholmes",
  name: "Mr. Holmes",
  version: "1.5.0",
  repository: "https://github.com/Lucksi/Mr.Holmes",
  license: "GPL-3.0",
  executionClass: "passive_public",
  targetTypes: ["username", "domain", "phone_number"],
  capabilities: ["Comprehensive multi-source OSINT", "cross-platform footprinting", "domain recon"],
  workerRuntime: "python",
  cliCommand: "identity-osint-adapter.py mrholmes",
  outputFormat: "json",
  timeoutMs: 90_000,
  maxRetries: 0,
  rateLimitPerMinute: 4,
  legalUse: ["Authorized OSINT research", "Defensive threat intelligence"],
  blockedUse: ["Unauthorized surveillance", "Harassment"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const onionSearchManifest = buildManifest({
  toolId: "onionsearch",
  name: "OnionSearch",
  version: "2.0.0",
  repository: "https://github.com/megadose/OnionSearch",
  license: "GPL-3.0",
  executionClass: "passive_public",
  targetTypes: ["topic", "domain"],
  capabilities: ["Dark web .onion engine search", "hidden service discovery", "cross-engine correlation"],
  workerRuntime: "python",
  cliCommand: "onionsearch",
  outputFormat: "json",
  timeoutMs: 120_000,
  maxRetries: 0,
  rateLimitPerMinute: 2,
  legalUse: ["Defensive threat research", "Brand abuse in dark web forums", "Cyber threat intelligence"],
  blockedUse: ["Illicit material acquisition", "Marketplace abuse"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const xurlfind3rManifest = buildManifest({
  toolId: "xurlfind3r",
  name: "xurlfind3r",
  version: "0.3.0",
  repository: "https://github.com/hueristiq/xurlfind3r",
  license: "MIT",
  executionClass: "passive_public",
  targetTypes: ["domain"],
  capabilities: ["Passive URL discovery", "Wayback/CommonCrawl/OTX aggregation", "historical endpoint collection"],
  workerRuntime: "go",
  cliCommand: "xurlfind3r",
  outputFormat: "json",
  timeoutMs: 60_000,
  maxRetries: 1,
  rateLimitPerMinute: 10,
  legalUse: ["Passive attack surface mapping", "Historical endpoint discovery", "Defensive inventory"],
  blockedUse: ["Active exploitation", "DDoS attacks"],
  commandInjectionGuard: SHELL_INJECTION_GUARD,
});

export const astra6ToolManifests: DishaToolManifest[] = [
  phoneInfogaManifest,
  maigretManifest,
  holeheManifest,
  instaloaderManifest,
  telegramPublicManifest,
  sherlockManifest,
  theHarvesterManifest,
  spiderfootManifest,
  amassManifest,
  subfinderManifest,
  reconNgManifest,
  photonManifest,
  userScannerManifest,
  toutatisManifest,
  mrHolmesManifest,
  onionSearchManifest,
  xurlfind3rManifest,
];

export function getAstra6ToolManifest(toolId: string): DishaToolManifest | undefined {
  return astra6ToolManifests.find((m) => m.toolId === toolId);
}

export function listAstra6ToolManifests(): DishaToolManifest[] {
  return astra6ToolManifests.map((m) => ({ ...m }));
}

export function getAstra6Summary() {
  return {
    total: astra6ToolManifests.length,
    byRuntime: {
      python: astra6ToolManifests.filter((m) => m.workerRuntime === "python").length,
      go: astra6ToolManifests.filter((m) => m.workerRuntime === "go").length,
      node: astra6ToolManifests.filter((m) => m.workerRuntime === "node").length,
    },
    targetTypes: [...new Set(astra6ToolManifests.flatMap((m) => m.targetTypes))],
    rule: "ASTRA 6 tools execute via CLI workers outside the Next.js request boundary. Command injection is blocked at the manifest level. Identity enumeration tools require explicit policy approval.",
  };
}
