import { hashValue } from "./hash";

export type VulnerabilityRecord = {
  cveId: string;
  source: "NVD" | "CVE_ORG" | "CISA_KEV";
  technology: string;
  version: string;
  cvssScore: number;
  inCisaKev: boolean;
  epssScore?: number;
  description: string;
  remediationGuidance: string;
  publishedDate: string;
  calculatedRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

export type AttackSurfaceNode = {
  id: string;
  type: "ORGANIZATION" | "DOMAIN" | "SUBDOMAIN" | "IP" | "CERTIFICATE" | "SERVICE" | "CLOUD_ASSET";
  value: string;
  parentEntityId?: string;
  discoveredVia: string;
  isExposed: boolean;
  firstSeen: string;
  lastSeen: string;
  vulnerabilities: VulnerabilityRecord[];
  provenanceHash: string;
};

export type SecretExposureFinding = {
  id: string;
  secretType: "GCP_API_KEY" | "AWS_KEY" | "GITHUB_PAT" | "PRIVATE_KEY" | "DATABASE_URL";
  maskedValue: string;
  location: string;
  severity: "HIGH" | "CRITICAL";
  remediation: string;
  detectedAt: string;
};

export type LookAlikeDomainCandidate = {
  originalDomain: string;
  lookAlikeDomain: string;
  variationType: "omission" | "repetition" | "hyphenation" | "replacement" | "tld_swap";
  riskDescription: string;
};

// Masking helper: Never expose plaintext secrets (Task 30, 31)
export function maskSensitiveToken(token: string): string {
  const trimmed = token.trim();
  if (trimmed.length <= 8) return "********";
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`;
}

// 1. Secret Exposure Detector for Authorized Audits (Task 31)
const SECRET_PATTERNS: Array<{
  type: SecretExposureFinding["secretType"];
  regex: RegExp;
  severity: "HIGH" | "CRITICAL";
  remediation: string;
}> = [
  {
    type: "GCP_API_KEY",
    regex: /AIza[0-9A-Za-z\\-_]{35}/g,
    severity: "HIGH",
    remediation: "Revoke and restrict API key via Google Cloud Console credentials page.",
  },
  {
    type: "AWS_KEY",
    regex: /AKIA[0-9A-Z]{16}/g,
    severity: "CRITICAL",
    remediation: "Immediately deactivate and rotate IAM Access Key in AWS IAM console.",
  },
  {
    type: "GITHUB_PAT",
    regex: /ghp_[0-9a-zA-Z]{36}/g,
    severity: "CRITICAL",
    remediation: "Revoke token immediately in GitHub Developer Settings -> Personal Access Tokens.",
  },
  {
    type: "PRIVATE_KEY",
    regex: /-----BEGIN (?:RSA|EC|OPENSSH|PGP) PRIVATE KEY-----/g,
    severity: "CRITICAL",
    remediation: "Rotate private key pair and remove key from source control history.",
  },
  {
    type: "DATABASE_URL",
    regex: /(?:postgres|mysql|mongodb):\/\/[^:\s]+:([^@\s]+)@[^/\s]+/g,
    severity: "CRITICAL",
    remediation: "Rotate database user password and inject connection strings via Secret Manager.",
  },
];

export function scanCodeForSecretExposure(content: string, sourcePath: string): SecretExposureFinding[] {
  const findings: SecretExposureFinding[] = [];

  for (const pattern of SECRET_PATTERNS) {
    const matches = content.match(pattern.regex);
    if (matches) {
      for (const match of matches) {
        findings.push({
          id: hashValue({ path: sourcePath, type: pattern.type, match: match.slice(0, 10) }),
          secretType: pattern.type,
          maskedValue: maskSensitiveToken(match),
          location: sourcePath,
          severity: pattern.severity,
          remediation: pattern.remediation,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }

  return findings;
}

// 2. Vulnerability Risk Prioritizer (Service -> Tech -> Version -> CVE -> KEV -> Risk) (Task 17)
export function computeVulnerabilityRisk(input: {
  cvssScore: number;
  inCisaKev: boolean;
  epssScore?: number;
}): VulnerabilityRecord["calculatedRisk"] {
  // If actively exploited in the wild (CISA KEV), automatically bump to at least HIGH or CRITICAL
  if (input.inCisaKev) {
    return input.cvssScore >= 7.0 ? "CRITICAL" : "HIGH";
  }

  const epss = input.epssScore ?? 0.0;
  if (input.cvssScore >= 9.0 || (input.cvssScore >= 7.5 && epss > 0.4)) {
    return "CRITICAL";
  }
  if (input.cvssScore >= 7.0 || epss > 0.2) {
    return "HIGH";
  }
  if (input.cvssScore >= 4.0) {
    return "MEDIUM";
  }
  return "LOW";
}

// 3. Look-alike / Typosquatting Domain Generator (Task 16)
export function generateLookAlikeDomains(domain: string): LookAlikeDomainCandidate[] {
  const parts = domain.toLowerCase().split(".");
  if (parts.length < 2) return [];

  const sld = parts[0] ?? "";
  const tld = parts.slice(1).join(".");
  const candidates: LookAlikeDomainCandidate[] = [];

  // Omission (e.g. example -> exmple)
  for (let i = 1; i < sld.length - 1; i++) {
    const omitted = sld.slice(0, i) + sld.slice(i + 1);
    candidates.push({
      originalDomain: domain,
      lookAlikeDomain: `${omitted}.${tld}`,
      variationType: "omission",
      riskDescription: `Character omitted at position ${i} to trick distracted users.`,
    });
  }

  // Hyphenation (e.g. example -> ex-ample)
  for (let i = 1; i < sld.length; i++) {
    const hyphenated = `${sld.slice(0, i)}-${sld.slice(i)}`;
    candidates.push({
      originalDomain: domain,
      lookAlikeDomain: `${hyphenated}.${tld}`,
      variationType: "hyphenation",
      riskDescription: "Hyphen insertion commonly used in brand impersonation phishing.",
    });
  }

  // Common TLD swaps
  const alternateTlds = ["co", "net", "org", "info", "xyz", "live"];
  for (const altTld of alternateTlds) {
    if (altTld !== tld) {
      candidates.push({
        originalDomain: domain,
        lookAlikeDomain: `${sld}.${altTld}`,
        variationType: "tld_swap",
        riskDescription: `TLD swap from .${tld} to .${altTld} used for credential harvesting.`,
      });
    }
  }

  return candidates.slice(0, 15);
}
