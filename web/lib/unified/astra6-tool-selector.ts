import { astra6ToolManifests, type DishaToolManifest } from "./astra6-tool-manifest";

export type Astra6TargetType = "domain" | "ip" | "email" | "phone_number" | "username";

export type Astra6SelectionPlan = {
  target: string;
  targetType: Astra6TargetType;
  selectedTools: DishaToolManifest[];
  blockedTools: Array<{ toolId: string; reason: string }>;
  autoSelected: boolean;
};

const DOMAIN_RE = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i;
const IPV4_RE = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s\-()]{6,20}$/;
const USERNAME_RE = /^@?[A-Za-z0-9_.]{2,64}$/;

export function classifyAstra6Target(input: string): Astra6TargetType {
  const trimmed = input.trim();
  if (IPV4_RE.test(trimmed)) return "ip";
  if (EMAIL_RE.test(trimmed)) return "email";
  if (PHONE_RE.test(trimmed)) return "phone_number";
  if (trimmed.startsWith("@") || USERNAME_RE.test(trimmed)) {
    if (!DOMAIN_RE.test(trimmed.replace(/^@/, ""))) return "username";
  }
  if (DOMAIN_RE.test(trimmed)) return "domain";
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (DOMAIN_RE.test(url.hostname)) return "domain";
  } catch { /* not a URL */ }
  return "username";
}

export function selectAstra6Tools(
  target: string,
  targetType?: Astra6TargetType,
  options?: { identityApproved?: boolean },
): Astra6SelectionPlan {
  const resolvedType = targetType ?? classifyAstra6Target(target);
  const identityApproved = options?.identityApproved ?? process.env.DISHA_IDENTITY_ENUMERATION_APPROVED === "true";
  const selectedTools: DishaToolManifest[] = [];
  const blockedTools: Array<{ toolId: string; reason: string }> = [];

  for (const manifest of astra6ToolManifests) {
    if (!manifest.targetTypes.includes(resolvedType)) continue;
    const isIdentityTool = ["sherlock", "maigret", "holehe", "phoneinfoga"].includes(manifest.toolId);
    if (isIdentityTool && !identityApproved) {
      blockedTools.push({ toolId: manifest.toolId, reason: "Identity enumeration requires explicit policy approval (DISHA_IDENTITY_ENUMERATION_APPROVED=true)." });
      continue;
    }
    if (manifest.executionClass === "active_recon" && process.env.DISHA_ACTIVE_RECON_APPROVED !== "true") {
      blockedTools.push({ toolId: manifest.toolId, reason: "Active reconnaissance requires explicit deployment approval (DISHA_ACTIVE_RECON_APPROVED=true)." });
      continue;
    }
    selectedTools.push(manifest);
  }

  return {
    target: target.trim(),
    targetType: resolvedType,
    selectedTools,
    blockedTools,
    autoSelected: !targetType,
  };
}
