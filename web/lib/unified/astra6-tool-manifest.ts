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
  workerRuntime: "python" | "go" | "node";
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
const SHELL_INJECTION_GUARD = /[;&|`$(){}\\[\\]<>!\\n\\r\\\\"']/;

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
  timeoutMs: 60_000,
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
  targetTypes: ["domain", "ip", "email", "phone_number", "username"],
  capabilities: ["multi-source OSINT", "correlation", "passive intelligence gathering"],
  passiveModuleAllowlist: [
    "sfp_abusech", "sfp_alienvaultoxt", "sfp_archiveorg", "sfp_bgpview", "sfp_blockchain",
    "sfp_certspotter", "sfp_crt", "sfp_cybercrimetracker", "sfp_dnsbrute", "sfp_dnsresolve",
    "sfp_dnszonexfer", "sfp_emailformat", "sfp_grep_app", "sfp_hackertarget", "sfp_ipinfo",
    "sfp_maltiverse", "sfp_nameapi", "sfp_onyphe", "sfp_opensource", "sfp_opnicwhois",
    "sfp_projectdiscovery", "sfp_ripe", "sfp_robtex", "sfp_securitytrails", "sfp_shodan",
    "sfp_similar", "sfp_threatcrowd", "sfp_threatminer", "sfp_urlscan", "sfp_viewdns",
    "sfp_virustotal", "sfp_whoisology", "sfp_whoxy"
  ],
  blockedModules: ["sfp_portscan_tcp", "sfp_portscan_udp", "sfp_spider", "sfp_crawlnow", "sfp_sslcert"],
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

export const astra6ToolManifests: DishaToolManifest[] = [
  phoneInfogaManifest,
  sherlockManifest,
  theHarvesterManifest,
  spiderfootManifest,
  amassManifest,
  subfinderManifest,
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
