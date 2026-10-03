export type UniversalTargetType =
  | "domain"
  | "url"
  | "ip"
  | "asn"
  | "cve"
  | "email"
  | "phone"
  | "username"
  | "person"
  | "organization"
  | "vehicle_identifier"
  | "document"
  | "file_hash"
  | "certificate"
  | "repository"
  | "location"
  | "ioc"
  | "unknown";

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
const IPV4_RE = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6_RE = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$/;
const ASN_RE = /^AS\d{1,10}$/i;
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,63}$/;
const PHONE_RE = /^\\+?[1-9]\d{1,14}$/;
const MD5_RE = /^[a-fA-F0-9]{32}$/;
const SHA1_RE = /^[a-fA-F0-9]{40}$/;
const SHA256_RE = /^[a-fA-F0-9]{64}$/;
const DOMAIN_RE = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\\.[a-zA-Z0-9-]{1,63}(?<!-))*\\.[a-zA-Z]{2,63}$/;
const REPOSITORY_RE = /^(?:https?:\/\/)?(?:www\.)?(?:github\.com|gitlab\.com|bitbucket\.org)\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/i;
const VEHICLE_IN_RE = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/i; // Indian VAHAN format e.g. DL01AB1234
const CERT_SHA1_FINGERPRINT = /^([0-9a-fA-F]{2}:){19}[0-9a-fA-F]{2}$/;

export function classifyUniversalTarget(input: string): TargetClassification {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // 1. CVE Identifier
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

  // 2. ASN (Autonomous System Number)
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

  // 3. IP Address (IPv4 / IPv6)
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

  // 4. File Hashes (MD5, SHA1, SHA256)
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

  // 5. Certificate Fingerprint
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

  // 6. Public Repository URL
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

  // 7. General URL
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

  // 8. Email Address
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

  // 9. Phone Number (E.164 or international standard)
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

  // 10. Vehicle Registration Identifier (e.g. Indian VAHAN format)
  const vehicleNormalized = trimmed.replace(/[\s-]/g, "").toUpperCase();
  if (VEHICLE_IN_RE.test(vehicleNormalized)) {
    return {
      rawInput: trimmed,
      normalizedValue: vehicleNormalized,
      primaryType: "vehicle_identifier",
      confidence: 0.9,
      candidateTypes: ["vehicle_identifier"],
      metadata: { statePrefix: vehicleNormalized.slice(0, 2), registrySystem: "VAHAN" },
    };
  }

  // 11. Domain Name
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

  // 12. Username Handle (@handle or alphanumeric identifier without spaces)
  if (trimmed.startsWith("@") || (/^[a-zA-Z0-9_.]{3,32}$/.test(trimmed) && !trimmed.includes("."))) {
    const handle = trimmed.replace(/^@/, "");
    return {
      rawInput: trimmed,
      normalizedValue: handle.toLowerCase(),
      primaryType: "username",
      confidence: 0.85,
      candidateTypes: ["username", "person"],
      ambiguityWarning: "Single word token could represent a username, person alias, or organization.",
      metadata: { handle },
    };
  }

  // 13. Multi-word Name / Organization / Document
  if (trimmed.includes(" ")) {
    const isOrg = /(inc|corp|ltd|llc|gmbh|pvt|foundation|ministry|department|bureau|council)\b/i.test(trimmed);
    return {
      rawInput: trimmed,
      normalizedValue: trimmed,
      primaryType: isOrg ? "organization" : "person",
      confidence: 0.75,
      candidateTypes: [isOrg ? "organization" : "person", "unknown"],
      ambiguityWarning: "Multi-word text requires corroborating identity or corporate registry verification.",
      metadata: { wordCount: trimmed.split(/\s+/).length, organizationKeywordFound: isOrg },
    };
  }

  // Fallback: Unknown
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
