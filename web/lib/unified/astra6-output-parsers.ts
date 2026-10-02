import { hashValue } from "./hash";
import { buildAdapterEvidence, type AdapterEvidence } from "./osint-adapter-bus";

export type PhoneInfogaResult = {
  number: string;
  valid: boolean;
  carrier?: string;
  lineType?: string;
  country?: string;
  countryCode?: string;
  localFormat?: string;
  internationalFormat?: string;
  reputation?: Array<{ source: string; score?: number; details?: string }>;
};

export type SherlockResult = {
  username: string;
  found: Array<{ site: string; url: string; httpStatus?: number }>;
  notFound: string[];
  errors: string[];
};

export type TheHarvesterResult = {
  domain: string;
  emails: string[];
  hosts: string[];
  ips: string[];
  subdomains: string[];
  urls: string[];
  sources: string[];
};

export type SpiderfootResult = {
  target: string;
  targetType: string;
  modules: string[];
  events: Array<{
    module: string;
    eventType: string;
    data: string;
    sourceEvent?: string;
    confidence?: number;
  }>;
};

export type AmassResult = {
  domain: string;
  subdomains: Array<{ name: string; sources: string[]; addresses?: Array<{ ip: string; cidr?: string; asn?: number; desc?: string }> }>;
};

export type SubfinderResult = {
  domain: string;
  subdomains: Array<{ host: string; source: string; input?: string }>;
};

export function parsePhoneInfogaOutput(raw: string, inputNumber: string): { data: PhoneInfogaResult; evidence: AdapterEvidence[] } {
  const lines = raw.trim().split("\\n").filter(Boolean);
  const jsonLines = lines.flatMap((line) => {
    try { return [JSON.parse(line) as Record<string, unknown>]; } catch { return []; }
  });
  const scanResult = jsonLines.find((j) => typeof j.number === "string" || typeof j.valid === "boolean") ?? {};
  const reputation = jsonLines
    .filter((j) => typeof j.source === "string" && j.source !== "")
    .map((j) => ({
      source: String(j.source),
      score: typeof j.score === "number" ? j.score : undefined,
      details: typeof j.details === "string" ? j.details : undefined,
    }));
  const data: PhoneInfogaResult = {
    number: typeof scanResult.number === "string" ? scanResult.number : inputNumber,
    valid: scanResult.valid === true,
    carrier: typeof scanResult.carrier === "string" ? scanResult.carrier : undefined,
    lineType: typeof scanResult.lineType === "string" ? scanResult.lineType : undefined,
    country: typeof scanResult.country === "string" ? scanResult.country : undefined,
    countryCode: typeof scanResult.countryCode === "string" ? scanResult.countryCode : undefined,
    localFormat: typeof scanResult.localFormat === "string" ? scanResult.localFormat : undefined,
    internationalFormat: typeof scanResult.internationalFormat === "string" ? scanResult.internationalFormat : undefined,
    reputation,
  };
  return {
    data,
    evidence: [buildAdapterEvidence({ sourceId: "phoneinfoga", sourceName: "PhoneInfoga", summary: `Phone scan completed for ${inputNumber}: valid=${data.valid}, carrier=${data.carrier ?? "unknown"}, ${reputation.length} reputation source(s).` })],
  };
}

export function parseSherlockOutput(raw: string, inputUsername: string): { data: SherlockResult; evidence: AdapterEvidence[] } {
  const lines = raw.trim().split("\\n").filter(Boolean);
  const jsonLines = lines.flatMap((line) => {
    try { return [JSON.parse(line) as Record<string, unknown>]; } catch { return []; }
  });
  const found: SherlockResult["found"] = [];
  const notFound: string[] = [];
  const errors: string[] = [];
  for (const entry of jsonLines) {
    const site = typeof entry.site === "string" ? entry.site : typeof entry.name === "string" ? entry.name : "";
    const status = typeof entry.status === "string" ? entry.status.toLowerCase() : "";
    if (status === "claimed" || status === "found" || entry.exists === true) {
      found.push({
        site,
        url: typeof entry.url_user === "string" ? entry.url_user : typeof entry.url === "string" ? entry.url : "",
        httpStatus: typeof entry.http_status === "number" ? entry.http_status : undefined,
      });
    } else if (status === "available" || status === "not found" || entry.exists === false) {
      notFound.push(site);
    } else if (status === "error" || status === "illegal") {
      errors.push(site);
    }
  }
  const data: SherlockResult = { username: inputUsername, found, notFound, errors };
  return {
    data,
    evidence: [buildAdapterEvidence({ sourceId: "sherlock", sourceName: "Sherlock", summary: `Username '${inputUsername}' found on ${found.length} site(s), absent from ${notFound.length}, ${errors.length} error(s).` })],
  };
}

export function parseTheHarvesterOutput(raw: string, inputDomain: string): { data: TheHarvesterResult; evidence: AdapterEvidence[] } {
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(raw) as Record<string, unknown>; } catch {
    const jsonMatch = raw.match(/\\{[\\s\\S]*\\}/);
    if (jsonMatch) try { parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>; } catch { /* raw text fallback */ }
  }
  const toStringArray = (val: unknown): string[] =>
    Array.isArray(val) ? val.filter((v): v is string => typeof v === "string" && v.length > 0) : [];
  const data: TheHarvesterResult = {
    domain: inputDomain,
    emails: toStringArray(parsed.emails),
    hosts: toStringArray(parsed.hosts),
    ips: toStringArray(parsed.ips),
    subdomains: toStringArray(parsed.asns ?? parsed.subdomains),
    urls: toStringArray(parsed.urls ?? parsed.interesting_urls),
    sources: toStringArray(parsed.sources ?? parsed.search_sources),
  };
  return {
    data,
    evidence: [buildAdapterEvidence({ sourceId: "theharvester", sourceName: "theHarvester", summary: `Domain '${inputDomain}': ${data.emails.length} email(s), ${data.hosts.length} host(s), ${data.subdomains.length} subdomain(s), ${data.ips.length} IP(s).` })],
  };
}

export function parseSpiderfootOutput(raw: string, target: string, targetType: string): { data: SpiderfootResult; evidence: AdapterEvidence[] } {
  const lines = raw.trim().split("\\n").filter(Boolean);
  const events: SpiderfootResult["events"] = [];
  const modules = new Set<string>();
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as Record<string, unknown>;
      const mod = typeof entry.module === "string" ? entry.module : typeof entry.type === "string" ? entry.type : "unknown";
      modules.add(mod);
      events.push({
        module: mod,
        eventType: typeof entry.event_type === "string" ? entry.event_type : typeof entry.type === "string" ? entry.type : "unknown",
        data: typeof entry.data === "string" ? entry.data : JSON.stringify(entry.data ?? ""),
        sourceEvent: typeof entry.source_event === "string" ? entry.source_event : undefined,
        confidence: typeof entry.confidence === "number" ? entry.confidence : undefined,
      });
    } catch { /* skip non-JSON lines */ }
  }
  const data: SpiderfootResult = { target, targetType, modules: [...modules], events };
  return {
    data,
    evidence: [buildAdapterEvidence({ sourceId: "spiderfoot", sourceName: "SpiderFoot", summary: `SpiderFoot passive scan of '${target}' (${targetType}): ${events.length} event(s) from ${modules.size} module(s).` })],
  };
}

export function parseAmassOutput(raw: string, inputDomain: string): { data: AmassResult; evidence: AdapterEvidence[] } {
  const lines = raw.trim().split("\\n").filter(Boolean);
  const subdomains: AmassResult["subdomains"] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as Record<string, unknown>;
      const name = typeof entry.name === "string" ? entry.name : "";
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const sources = Array.isArray(entry.sources) ? entry.sources.filter((s): s is string => typeof s === "string") : typeof entry.source === "string" ? [entry.source] : [];
      const addresses = Array.isArray(entry.addresses) ? entry.addresses.slice(0, 50).map((addr) => {
        const a = addr && typeof addr === "object" ? addr as Record<string, unknown> : {};
        return {
          ip: typeof a.ip === "string" ? a.ip : "",
          cidr: typeof a.cidr === "string" ? a.cidr : undefined,
          asn: typeof a.asn === "number" ? a.asn : undefined,
          desc: typeof a.desc === "string" ? a.desc : undefined,
        };
      }) : undefined;
      subdomains.push({ name, sources, addresses });
    } catch { /* skip non-JSON lines */ }
  }
  const data: AmassResult = { domain: inputDomain, subdomains };
  return {
    data,
    evidence: [buildAdapterEvidence({ sourceId: "owasp-amass", sourceName: "OWASP Amass", summary: `Amass passive enumeration of '${inputDomain}': ${subdomains.length} unique subdomain(s).` })],
  };
}

export function parseSubfinderOutput(raw: string, inputDomain: string): { data: SubfinderResult; evidence: AdapterEvidence[] } {
  const lines = raw.trim().split("\\n").filter(Boolean);
  const subdomains: SubfinderResult["subdomains"] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as Record<string, unknown>;
      const host = typeof entry.host === "string" ? entry.host : typeof entry.subdomain === "string" ? entry.subdomain : "";
      if (!host || seen.has(host)) continue;
      seen.add(host);
      subdomains.push({
        host,
        source: typeof entry.source === "string" ? entry.source : typeof entry.sources === "string" ? entry.sources : "subfinder",
        input: typeof entry.input === "string" ? entry.input : undefined,
      });
    } catch {
      const trimmed = line.trim();
      if (trimmed && trimmed.includes(".") && !seen.has(trimmed)) {
        seen.add(trimmed);
        subdomains.push({ host: trimmed, source: "subfinder" });
      }
    }
  }
  const data: SubfinderResult = { domain: inputDomain, subdomains };
  return {
    data,
    evidence: [buildAdapterEvidence({ sourceId: "subfinder", sourceName: "ProjectDiscovery Subfinder", summary: `Subfinder passive enumeration of '${inputDomain}': ${subdomains.length} unique subdomain(s).` })],
  };
}
