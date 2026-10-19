/**
 * DISHA 6.6 Target Classifier
 * Deterministically classifies search queries into one of the 12 primary intelligence target types.
 */

export type ClassifiedTargetType =
  | "person_name"
  | "username"
  | "phone"
  | "email"
  | "domain"
  | "ip"
  | "hash"
  | "crypto"
  | "vehicle_identifier"
  | "geo"
  | "social"
  | "company";

export interface TargetClassification {
  type: ClassifiedTargetType;
  label: string;
  confidence: number;
  normalizedValue: string;
  suggestedTools: string[];
}

export function classifyIntelligenceTarget(rawInput: string): TargetClassification {
  const input = rawInput.trim();
  if (!input) {
    return {
      type: "person_name",
      label: "Person Name",
      confidence: 0,
      normalizedValue: "",
      suggestedTools: [],
    };
  }

  // 1. IP Address (IPv4 / IPv6)
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:3[0-2]|[12]?[0-9]))?$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  if (ipv4Regex.test(input) || ipv6Regex.test(input)) {
    return {
      type: "ip",
      label: "IP Address / CIDR",
      confidence: 0.98,
      normalizedValue: input,
      suggestedTools: ["shodan", "greynoise", "alienvault-otx", "ipinfo"],
    };
  }

  // 2. Email Address
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  if (emailRegex.test(input)) {
    return {
      type: "email",
      label: "Email Address",
      confidence: 0.99,
      normalizedValue: input.toLowerCase(),
      suggestedTools: ["holehe", "ghunt", "email2phonenumber", "hibp"],
    };
  }

  // 3. Cryptographic Hash (MD5: 32, SHA1: 40, SHA256: 64 hex characters)
  const hashRegex = /^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/;
  if (hashRegex.test(input)) {
    return {
      type: "hash",
      label: "File Hash (SHA/MD5)",
      confidence: 0.95,
      normalizedValue: input.toLowerCase(),
      suggestedTools: ["virustotal", "malwarebazaar", "threatfox", "hybrid-analysis"],
    };
  }

  // 4. Crypto Wallet (BTC, ETH, Solana)
  const btcRegex = /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})$/;
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  if (ethRegex.test(input) || btcRegex.test(input)) {
    return {
      type: "crypto",
      label: "Crypto Wallet Address",
      confidence: 0.96,
      normalizedValue: input,
      suggestedTools: ["blockchain-explorer", "etherscan", "chainalysis-public", "cryptoscamdb"],
    };
  }

  // 5. Geospatial Coordinates (e.g. 28.6139, 77.2090)
  const geoRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
  if (geoRegex.test(input)) {
    return {
      type: "geo",
      label: "Geospatial Coordinates",
      confidence: 0.97,
      normalizedValue: input.replace(/\s+/g, ""),
      suggestedTools: ["postgis-spatial", "osm-overpass", "bhuvan-satellite", "sentinel-hub"],
    };
  }

  // 6. Social URL
  const socialUrlRegex = /^(https?:\/\/)?(www\.)?(instagram\.com|t\.me|telegram\.me|twitter\.com|x\.com|facebook\.com|linkedin\.com|github\.com)\/.+$/i;
  if (socialUrlRegex.test(input)) {
    return {
      type: "social",
      label: "Social Media Profile",
      confidence: 0.95,
      normalizedValue: input,
      suggestedTools: ["instaloader", "telegram-public", "sherlock", "socialscan"],
    };
  }

  // 7. Domain Name or URL
  const domainRegex = /^(https?:\/\/)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?::\d+)?(?:\/.*)?$/;
  if (domainRegex.test(input) && !input.includes(" ")) {
    const cleanDomain = input.replace(/^https?:\/\//, "").split("/")[0].split(":")[0].toLowerCase();
    return {
      type: "domain",
      label: "Domain Name / URL",
      confidence: 0.92,
      normalizedValue: cleanDomain,
      suggestedTools: ["sublist3r", "amass", "crtsh", "securitytrails", "whois"],
    };
  }

  // 8. Phone Number (E.164 or common formats)
  const phoneClean = input.replace(/[\s()-]/g, "");
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  if (phoneRegex.test(phoneClean)) {
    return {
      type: "phone",
      label: "Phone Number",
      confidence: 0.9,
      normalizedValue: phoneClean,
      suggestedTools: ["phoneinfoga", "truecaller-gateway", "numverify"],
    };
  }

  // 9. Vehicle Identifier (e.g. DL01AB1234 or 17-char VIN)
  const indVehicleRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/i;
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;
  if (indVehicleRegex.test(phoneClean) || vinRegex.test(phoneClean)) {
    return {
      type: "vehicle_identifier",
      label: "Vehicle Identifier / Plate",
      confidence: 0.94,
      normalizedValue: phoneClean.toUpperCase(),
      suggestedTools: ["vahan-registry", "nic-transport", "vin-decoder"],
    };
  }

  // 10. Handle / Username (starts with @ or single word with special characters)
  if (input.startsWith("@") || (/^[a-zA-Z0-9_.-]{3,30}$/.test(input) && !input.includes(" "))) {
    const cleanHandle = input.replace(/^@/, "");
    return {
      type: "username",
      label: "Username / Handle",
      confidence: 0.85,
      normalizedValue: cleanHandle,
      suggestedTools: ["sherlock", "maigret", "blackbird", "whatsmyname"],
    };
  }

  // 11. Corporate / Legal Entity
  const companyKeywords = /\b(pvt|ltd|limited|corp|corporation|inc|llc|gmbh|enterprise|industries|holdings|private)\b/i;
  if (companyKeywords.test(input)) {
    return {
      type: "company",
      label: "Corporate / Legal Entity",
      confidence: 0.88,
      normalizedValue: input,
      suggestedTools: ["mca-registry", "opencorporates", "zaubacorp", "crunchbase"],
    };
  }

  // 12. Default to Person Name
  return {
    type: "person_name",
    label: "Person Name",
    confidence: 0.75,
    normalizedValue: input,
    suggestedTools: ["judiciary-records", "electoral-roll", "gazette-archive", "social-graph"],
  };
}
