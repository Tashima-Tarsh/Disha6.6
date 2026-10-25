import crypto from "node:crypto";
import type { Principal } from "./types";

export type AssessmentTier =
  | "passive_intel"
  | "tls_config_audit"
  | "active_service_probe"
  | "vulnerability_scan"
  | "source_code_audit";

export interface ApprovedAsset {
  assetId: string;
  target: string; // domain, host, ip, or repo
  assetType: "domain" | "subdomain" | "ip" | "cidr" | "url" | "repository";
  owner: string; // organization or team identifier
  verifiedBy: string; // admin userId
  verificationMethod: "dns_txt_record" | "http_token_probe" | "administrative_declaration";
  allowedTiers: AssessmentTier[];
  createdAt: string;
  expiresAt: string;
  active: boolean;
}

// In-memory registry with persistent initial baseline
const assetRegistry = new Map<string, ApprovedAsset>();

function normalizeTarget(raw: string): string {
  let cleaned = raw.trim().toLowerCase();
  // Strip protocol if present
  if (cleaned.startsWith("https://")) cleaned = cleaned.slice(8);
  if (cleaned.startsWith("http://")) cleaned = cleaned.slice(7);
  // Strip trailing path/slash
  cleaned = cleaned.split("/")[0].split(":")[0];
  return cleaned;
}

// Initialize controlled test / lab assets
const INITIAL_ASSETS: ApprovedAsset[] = [
  {
    assetId: "asset-lab-localhost",
    target: "localhost",
    assetType: "domain",
    owner: "DISHA-Lab-Infrastructure",
    verifiedBy: "system-admin",
    verificationMethod: "administrative_declaration",
    allowedTiers: [
      "passive_intel",
      "tls_config_audit",
      "active_service_probe",
      "vulnerability_scan",
      "source_code_audit",
    ],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
  },
  {
    assetId: "asset-lab-loopback-ip",
    target: "127.0.0.1",
    assetType: "ip",
    owner: "DISHA-Lab-Infrastructure",
    verifiedBy: "system-admin",
    verificationMethod: "administrative_declaration",
    allowedTiers: [
      "passive_intel",
      "tls_config_audit",
      "active_service_probe",
      "vulnerability_scan",
      "source_code_audit",
    ],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
  },
  {
    assetId: "asset-disha-local",
    target: "disha.local",
    assetType: "domain",
    owner: "DISHA-Production-Domain",
    verifiedBy: "system-admin",
    verificationMethod: "administrative_declaration",
    allowedTiers: [
      "passive_intel",
      "tls_config_audit",
      "active_service_probe",
      "vulnerability_scan",
    ],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
  },
];

for (const a of INITIAL_ASSETS) {
  assetRegistry.set(a.assetId, a);
}

export function registerApprovedAsset(input: {
  target: string;
  assetType: ApprovedAsset["assetType"];
  owner: string;
  adminPrincipal: Principal;
  verificationMethod?: ApprovedAsset["verificationMethod"];
  allowedTiers?: AssessmentTier[];
  validDays?: number;
}): ApprovedAsset {
  if (!input.adminPrincipal.roles.includes("admin")) {
    throw Object.assign(new Error("Only administrators can register approved assets into inventory."), {
      status: 403,
    });
  }

  const assetId = `asset-${crypto.randomUUID()}`;
  const now = Date.now();
  const validDays = input.validDays ?? 90;
  const expiresAt = new Date(now + validDays * 24 * 60 * 60 * 1000).toISOString();

  const asset: ApprovedAsset = {
    assetId,
    target: normalizeTarget(input.target),
    assetType: input.assetType,
    owner: input.owner,
    verifiedBy: input.adminPrincipal.userId,
    verificationMethod: input.verificationMethod ?? "administrative_declaration",
    allowedTiers: input.allowedTiers ?? ["passive_intel", "tls_config_audit"],
    createdAt: new Date(now).toISOString(),
    expiresAt,
    active: true,
  };

  assetRegistry.set(assetId, asset);
  return asset;
}

export function getApprovedAsset(assetId: string): ApprovedAsset | null {
  const asset = assetRegistry.get(assetId);
  if (!asset || !asset.active) return null;
  if (new Date(asset.expiresAt).getTime() < Date.now()) {
    asset.active = false;
    return null;
  }
  return asset;
}

export function listApprovedAssets(): ApprovedAsset[] {
  const now = Date.now();
  return [...assetRegistry.values()].filter(
    (a) => a.active && new Date(a.expiresAt).getTime() >= now
  );
}

export function validateTargetAgainstAssetInventory(
  target: string,
  requiredTier: AssessmentTier = "passive_intel"
): {
  approved: boolean;
  asset?: ApprovedAsset;
  reason?: string;
} {
  const normalized = normalizeTarget(target);
  const now = Date.now();

  for (const asset of assetRegistry.values()) {
    if (!asset.active) continue;
    if (new Date(asset.expiresAt).getTime() < now) continue;

    let isMatch = false;

    if (asset.target === normalized) {
      isMatch = true;
    } else if (asset.target.startsWith("*.")) {
      const rootDomain = asset.target.slice(2);
      if (normalized === rootDomain || normalized.endsWith(`.${rootDomain}`)) {
        isMatch = true;
      }
    } else if (normalized.endsWith(`.${asset.target}`)) {
      // Subdomain of approved domain
      isMatch = true;
    }

    if (isMatch) {
      if (!asset.allowedTiers.includes(requiredTier)) {
        return {
          approved: false,
          asset,
          reason: `Asset '${asset.target}' is in inventory, but tier '${requiredTier}' is not authorized. Allowed tiers: [${asset.allowedTiers.join(", ")}].`,
        };
      }
      return { approved: true, asset };
    }
  }

  return {
    approved: false,
    reason: `Target '${target}' is not registered in the server-side approved asset inventory.`,
  };
}

export function clearAssetInventoryForTests(): void {
  assetRegistry.clear();
  for (const a of INITIAL_ASSETS) {
    assetRegistry.set(a.assetId, { ...a });
  }
}
