import type { SearchTargetType } from "./search-targets";

export type UniversalTargetType = SearchTargetType | "unknown";

export type TargetClassification = {
  rawInput: string;
  normalizedValue: string;
  primaryType: UniversalTargetType;
  confidence: number;
  candidateTypes: UniversalTargetType[];
  ambiguityWarning?: string;
  metadata: Record<string, string | number | boolean>;
};

// Strict, high-precision detection patterns
const CVE_RE = /^CVE-\d{4}-\d{4,8}$/i;
const NORAD_RE = /^(?:NORAD|CATNR|CATALOG)\s*[:#-]?\s*(\d{1,9})$/i;
const IPV4_RE = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6_RE = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$/;
const ASN_RE = /^AS\d{1,10}$/i;
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
const PHONE_RE = /^\+?[1-9]\d{1,14}$/;
const MD5_RE = /^[a-fA-F0-9]{32}$/;
const SHA1_RE = /^[a-fA-F0-9]{40}$/;
const SHA256_RE = /^[a-fA-F0-9]{64}$/;
const DOMAIN_RE = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63}(?<!-))*\.[a-zA-Z]{2,63}$/;
const REPOSITORY_RE = /^(?:https?:\/\/)?(?:www\.)?(?:github\.com|gitlab\.com|bitbucket\.org)\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/i;
const VEHICLE_IN_RE = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/i; // State/UT format e.g. DL01AB1234
const VEHICLE_BH_RE = /^\d{2}BH\d{4}[A-Z]{1,2}$/i; // Bharat Series e.g. 22BH1234AA
const CERT_SHA1_FINGERPRINT = /^([0-9a-fA-F]{2}:){19}[0-9a-fA-F]{2}$/;

export function classifyUniversalTarget(input: string): TargetClassification {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (CVE_RE.test(trimmed)) {
    return {
      rawInput: trimmed,
      normalizedValue: trimmed.toUpperCase(),
      primaryType: "cve",
      confidence: 1.0,
      candidateTypes: ["cve", "ioc"],
      metadata: { standard: "MITRE CVE", year: trimmed.split("-")[1] ?? "" },
    };
  }

  const norad = trimmed.match(NORAD_RE);
  if (norad) {
    return {
      rawInput: trimmed,
      normalizedValue: norad[1],
      primaryType: "norad_id",
      confidence: 1.0,
      candidateTypes: ["norad_id"],
      metadata: { registrySystem: "NORAD", catalogNumber: Number(norad[1]) },
    };
  }

  if (ASN_RE.test(trimmed)) {
    return {
      rawInput: trimmed,
      normalizedValue: trimmed.toUpperCase(),
      primaryType: "asn",
      confidence: 1.0,
      candidateTypes: ["asn"],
      metadata: { asnNumber: parseInt(trimmed.replace(/^AS/i, ""), 10) },
    };
  }

  if (IPV4_RE.test(trimmed)) {
    return {
      rawInput: trimmed,
      normalizedValue: trimmed,
      primaryType: "ip",
      confidence: 1.0,
      candidateTypes: ["ip", "ioc"],
      metadata: { ipVersion: 4 },
    };
  }
  if (IPV6_RE.test(trimmed)) {
    return {
      rawInput: trimmed,
      normalizedValue: lower,
      primaryType: "ip",
      confidence: 1.0,
      candidateTypes: ["ip", "ioc"],
      metadata: { ipVersion: 6 },
    };
  }

  if (SHA256_RE.test(trimmed)) {
    return {
      rawInput: trimmed,
      normalizedValue: lower,
      primaryType: "file_hash",
      confidence: 1.0,
      candidateTypes: ["file_hash", "ioc"],
      metadata: { algorithm: "SHA-256", lengthBits: 256 },
    };
  }
  if (SHA1_RE.test(trimmed)) {
    return {
      rawInput: trimmed,
      normalizedValue: lower,
      primaryType: "file_hash",
      confidence: 0.95,
      candidateTypes: ["file_hash", "ioc"],
      metadata: { algorithm: "SHA-1", lengthBits: 160 },
    };
  }
  if (MD5_RE.test(trimmed)) {
    return {
      rawInput: trimmed,
      normalizedValue: lower,
      primaryType: "file_hash",
      confidence: 0.9,
      candidateTypes: ["file_hash", "ioc"],
      metadata: { algorithm: "MD5", lengthBits: 128 },
    };
  }

  if (CERT_SHA1_FINGERPRINT.test(trimmed)) {
    return {
      rawInput: trimmed,
      normalizedValue: lower.replace(/:/g, ""),
      primaryType: "certificate",
      confidence: 1.0,
      candidateTypes: ["certificate"],
      metadata: { format: "hex_colon_delimited" },
    };
  }

  if (REPOSITORY_RE.test(trimmed)) {
    return {
      rawInput: trimmed,
      normalizedValue: trimmed.toLowerCase().replace(/\/$/, ""),
      primaryType: "repository",
      confidence: 1.0,
      candidateTypes: ["repository", "url"],
      metadata: { scmPlatform: trimmed.includes("github") ? "github" : trimmed.includes("gitlab") ? "gitlab" : "bitbucket" },
    };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return {
        rawInput: trimmed,
        normalizedValue: parsed.toString(),
        primaryType: "url",
        confidence: 1.0,
        candidateTypes: ["url", "ioc"],
        metadata: { hostname: parsed.hostname, protocol: parsed.protocol, path: parsed.pathname },
      };
    } catch {
      // not a valid parseable URL
    }
  }

  if (EMAIL_RE.test(trimmed)) {
    const domainPart = trimmed.split("@")[1]?.toLowerCase() ?? "";
    return {
      rawInput: trimmed,
      normalizedValue: lower,
      primaryType: "email",
      confidence: 1.0,
      candidateTypes: ["email"],
      metadata: { emailDomain: domainPart },
    };
  }

  const digitsOnly = trimmed.replace(/[\s\-().]/g, "");
  if (PHONE_RE.test(digitsOnly) && digitsOnly.length >= 8 && digitsOnly.length <= 15) {
    return {
      rawInput: trimmed,
      normalizedValue: digitsOnly.startsWith("+") ? digitsOnly : `+${digitsOnly}`,
      primaryType: "phone",
      confidence: 0.95,
      candidateTypes: ["phone"],
      metadata: { digitCount: digitsOnly.length },
    };
  }

  const vehicleNormalized = trimmed.replace(/[\s-]/g, "").toUpperCase();
  if (VEHICLE_IN_RE.test(vehicleNormalized) || VEHICLE_BH_RE.test(vehicleNormalized)) {
    return {
      rawInput: trimmed,
      normalizedValue: vehicleNormalized,
      primaryType: "vehicle_identifier",
      confidence: 0.9,
      candidateTypes: ["vehicle_identifier"],
      metadata: { statePrefix: VEHICLE_BH_RE.test(vehicleNormalized) ? "BH" : vehicleNormalized.slice(0, 2), registrySystem: "VAHAN" },
    };
  }

  if (DOMAIN_RE.test(trimmed) && !trimmed.includes(" ")) {
    return {
      rawInput: trimmed,
      normalizedValue: lower,
      primaryType: "domain",
      confidence: 0.98,
      candidateTypes: ["domain", "ioc"],
      metadata: { isSubdomain: trimmed.split(".").length > 2 },
    };
  }

  if (trimmed.startsWith("@") && /^@[a-zA-Z0-9_.]{2,64}$/.test(trimmed)) {
    const handle = trimmed.slice(1);
    return {
      rawInput: trimmed,
      normalizedValue: handle.toLowerCase(),
      primaryType: "username",
      confidence: 0.95,
      candidateTypes: ["username"],
      ambiguityWarning: "Social handle or username token; cross-site identity enumeration requires explicit policy approval.",
      metadata: { handle, explicitHandle: true },
    };
  }

  if (trimmed.includes(" ")) {
    const isOrg = /(inc|corp|corporation|ltd|limited|llc|gmbh|pvt|private|foundation|ministry|department|bureau|council|agency|group|technologies|systems)\b/i.test(trimmed);
    return {
      rawInput: trimmed,
      normalizedValue: trimmed,
      primaryType: isOrg ? "company" : "person_name",
      confidence: 0.75,
      candidateTypes: [isOrg ? "company" : "person_name", "topic"],
      ambiguityWarning: "Multi-word text requires corroborating identity or corporate registry verification.",
      metadata: { wordCount: trimmed.split(/\s+/).length, organizationKeywordFound: isOrg },
    };
  }

  const singleLower = lower;
  const KNOWN_COMPANIES = new Set([
    "openai", "microsoft", "google", "apple", "meta", "amazon", "tata", "infosys", "wipro", "reliance", "ibm", "oracle", "intel"
  ]);
  const KNOWN_LOCATIONS = new Set([
    "delhi", "mumbai", "punjab", "bengaluru", "kolkata", "chennai", "hyderabad", "london", "paris", "tokyo", "beijing", "berlin", "moscow", "washington"
  ]);

  if (KNOWN_COMPANIES.has(singleLower)) {
    return {
      rawInput: trimmed,
      normalizedValue: trimmed,
      primaryType: "company",
      confidence: 0.7,
      candidateTypes: ["company", "topic"],
      metadata: { entityCategory: "known_organization" },
    };
  }

  if (KNOWN_LOCATIONS.has(singleLower)) {
    return {
      rawInput: trimmed,
      normalizedValue: trimmed,
      primaryType: "location",
      confidence: 0.7,
      candidateTypes: ["location", "topic"],
      metadata: { entityCategory: "known_location" },
    };
  }

  if (/^[a-zA-Z0-9_.]{2,64}$/.test(trimmed)) {
    const hasLetters = /[a-zA-Z]/.test(trimmed);
    const hasDigits = /[0-9]/.test(trimmed);
    const isAlphanumericHandle = hasLetters && hasDigits;

    return {
      rawInput: trimmed,
      normalizedValue: trimmed,
      primaryType: isAlphanumericHandle ? "username" : "topic",
      confidence: isAlphanumericHandle ? 0.8 : 0.4,
      candidateTypes: isAlphanumericHandle
        ? ["username", "person_name", "topic"]
        : ["topic", "person_name", "company", "location", "username"],
      ambiguityWarning: isAlphanumericHandle
        ? "Alphanumeric handle detected; cross-referencing public accounts and OSINT footprints."
        : "Natural language token without '@' is ambiguous across topic, person, organization, location, or handle.",
      metadata: { token: trimmed, ambiguous: !isAlphanumericHandle, isAlphanumericHandle },
    };
  }

  return {
    rawInput: trimmed,
    normalizedValue: trimmed,
    primaryType: "unknown",
    confidence: 0.2,
    candidateTypes: ["unknown"],
    ambiguityWarning: "Target format does not match any primary high-confidence schema.",
    metadata: {},
  };
}
