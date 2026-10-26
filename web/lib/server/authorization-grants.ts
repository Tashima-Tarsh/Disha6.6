import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Principal, Role } from "./types";
import { signJson, verifySignedJson } from "./crypto";
import { authSigningSecret } from "./auth";
import type { UniversalToolDefinition } from "../osint/universal-execution-service";
import { validateTargetAgainstAssetInventory, type AssessmentTier } from "./asset-inventory";
import { getDbPool } from "./db";

export type AuthorizationScope =
  | "active_recon"
  | "identity_enumeration"
  | "high_risk_execution"
  | "vulnerability_scan"
  | "internal_lab_assessment";

export interface AuthorizationGrant {
  grantId: string;
  scope: AuthorizationScope;
  toolId?: string; // specific toolId or "*"
  targetPattern?: string; // target string, wildcard (*.domain.com), or "*"
  grantedTo: string; // principal userId who can execute this grant
  approvedBy: string; // principal userId who issued/approved this grant
  approverRole: Role;
  purpose: string;
  createdAt: string;
  expiresAt: string;
  revoked?: boolean;
  signature?: string;
}

// Durable grant store backed by memory cache, PostgreSQL, and atomic disk backup
const grantStore = new Map<string, AuthorizationGrant>();

const GRANTS_FILE_PRIMARY = path.resolve(process.cwd(), "data/authorization-grants.json");
const GRANTS_FILE_FALLBACK = path.resolve(process.cwd(), "../data/authorization-grants.json");

function resolveGrantsFilePath(): string {
  try {
    const dir = path.dirname(GRANTS_FILE_PRIMARY);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return GRANTS_FILE_PRIMARY;
  } catch {
    const dir2 = path.dirname(GRANTS_FILE_FALLBACK);
    if (!fs.existsSync(dir2)) fs.mkdirSync(dir2, { recursive: true });
    return GRANTS_FILE_FALLBACK;
  }
}

function persistGrantsToDisk(): void {
  try {
    const filePath = resolveGrantsFilePath();
    const list = Array.from(grantStore.values());
    const tmp = `${filePath}.tmp.${Date.now()}`;
    fs.promises.writeFile(tmp, JSON.stringify(list, null, 2), "utf8")
      .then(() => fs.promises.rename(tmp, filePath))
      .catch(() => {
        // Non-blocking disk persist fallback
      });
  } catch {
    // Non-blocking disk persist fallback
  }
}

function loadGrantsFromDisk(): void {
  try {
    const paths = [GRANTS_FILE_PRIMARY, GRANTS_FILE_FALLBACK];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const now = Date.now();
          for (const item of list) {
            if (item && item.grantId && !item.revoked && new Date(item.expiresAt).getTime() > now) {
              grantStore.set(item.grantId, item);
            }
          }
          break;
        }
      }
    }
  } catch {
    // Ignore initial missing file
  }
}

// Initial load on module execution
loadGrantsFromDisk();

export function normalizeHostOrUrl(raw: string): string {
  let cleaned = raw.trim().toLowerCase();
  // Strip protocol
  if (cleaned.startsWith("https://")) cleaned = cleaned.slice(8);
  if (cleaned.startsWith("http://")) cleaned = cleaned.slice(7);
  // Strip trailing path/query/fragment
  cleaned = cleaned.split("/")[0].split("?")[0].split("#")[0];
  // Strip port
  cleaned = cleaned.split(":")[0];
  return cleaned;
}

export function isPrivateOrLocalAddress(hostOrIp: string): boolean {
  let h = normalizeHostOrUrl(hostOrIp);
  if (h.startsWith("::ffff:")) h = h.slice(7);
  if (h === "localhost" || h === "::1" || h === "0.0.0.0") return true;
  if (h.startsWith("127.")) return true; // Entire 127.0.0.0/8 loopback block
  if (h === "169.254.169.254" || h.startsWith("169.254.")) return true; // Cloud metadata
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (h.endsWith(".internal") || h.endsWith(".local") || h.endsWith(".lan")) return true;
  return false;
}

export function isTargetMatchingPattern(target: string, pattern: string): boolean {
  if (!pattern || pattern === "*") return true;

  const normTarget = normalizeHostOrUrl(target);
  const normPattern = normalizeHostOrUrl(pattern);

  if (normTarget === normPattern) return true;

  // Wildcard pattern: *.domain.com
  if (normPattern.startsWith("*.")) {
    const root = normPattern.slice(2);
    // Must be either exact root or end with .root (ensuring domain boundary)
    return normTarget === root || normTarget.endsWith(`.${root}`);
  }

  // Exact domain root: pattern domain.com matches sub.domain.com, but NOT evildomain.com or domain.com.evil.com
  if (normTarget.endsWith(`.${normPattern}`)) {
    return true;
  }

  return false;
}

export function issueAuthorizationGrant(params: {
  scope: AuthorizationScope;
  approver: Principal;
  grantedTo?: string;
  toolId?: string;
  targetPattern?: string;
  purpose: string;
  ttlMinutes?: number;
}): AuthorizationGrant {
  const isApproverAdmin = params.approver.roles.includes("admin");
  const isApproverOperator = params.approver.roles.includes("operator");

  if (
    params.scope === "active_recon" ||
    params.scope === "high_risk_execution" ||
    params.scope === "vulnerability_scan" ||
    params.scope === "internal_lab_assessment"
  ) {
    if (!isApproverAdmin) {
      throw Object.assign(
        new Error(`Grant creation denied: Only users with 'admin' role can approve '${params.scope}'.`),
        { status: 403 }
      );
    }
  } else if (params.scope === "identity_enumeration") {
    if (!isApproverAdmin && !isApproverOperator) {
      throw Object.assign(
        new Error(
          `Grant creation denied: Users must have 'admin' or 'operator' role to approve 'identity_enumeration'.`
        ),
        { status: 403 }
      );
    }
  }

  const grantId = `grant_${crypto.randomUUID()}`;
  const now = Date.now();
  const ttlMs = Math.min(Math.max(params.ttlMinutes || 30, 1), 240) * 60 * 1000;
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + ttlMs).toISOString();
  const grantedTo = params.grantedTo?.trim() || params.approver.userId;

  const grantPayload: Record<string, unknown> = {
    grantId,
    scope: params.scope,
    toolId: params.toolId || "*",
    targetPattern: params.targetPattern || "*",
    grantedTo,
    approvedBy: params.approver.userId,
    approverRole: isApproverAdmin ? "admin" : "operator",
    purpose: params.purpose,
    createdAt,
    expiresAt,
    exp: Math.floor((now + ttlMs) / 1000),
  };

  function getGrantSecret(): string {
    try {
      return authSigningSecret();
    } catch {
      const envSecret = process.env.DISHA_JWT_SECRET || process.env.DISHA_GRANT_SECRET;
      if (envSecret) return envSecret;
      if (process.env.NODE_ENV !== "production") {
        return "disha-development-secret-minimum-32-chars-long";
      }
      throw new Error("FATAL: DISHA_JWT_SECRET is required to sign or verify authorization grants in production");
    }
  }

  const secret = getGrantSecret();
  const signature = signJson(grantPayload, secret);

  const grant: AuthorizationGrant = {
    grantId,
    scope: params.scope,
    toolId: params.toolId || "*",
    targetPattern: params.targetPattern || "*",
    grantedTo,
    approvedBy: params.approver.userId,
    approverRole: (isApproverAdmin ? "admin" : "operator") as Role,
    purpose: params.purpose,
    createdAt,
    expiresAt,
    revoked: false,
    signature,
  };

  grantStore.set(grantId, grant);
  persistGrantsToDisk();

  try {
    const pool = getDbPool();
    if (pool) {
      pool
        .query(
          `INSERT INTO authorization_grants (grant_id, scope, tool_id, target_pattern, granted_to, approved_by, approver_role, purpose, created_at, expires_at, revoked, signature)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (grant_id) DO UPDATE SET revoked = EXCLUDED.revoked`,
          [
            grant.grantId,
            grant.scope,
            grant.toolId,
            grant.targetPattern,
            grant.grantedTo,
            grant.approvedBy,
            grant.approverRole,
            grant.purpose,
            grant.createdAt,
            grant.expiresAt,
            grant.revoked ?? false,
            grant.signature,
          ]
        )
        .catch(() => {});
    }
  } catch {
    // Non-blocking PG sync
  }

  return grant;
}

export function verifyGrantSignature(grant: AuthorizationGrant): boolean {
  if (!grant.signature) return false;
  try {
    let secret: string;
    try {
      secret = authSigningSecret();
    } catch {
      secret =
        process.env.DISHA_JWT_SECRET ||
        process.env.DISHA_GRANT_SECRET ||
        "disha-development-secret-minimum-32-chars-long";
    }
    const payload = verifySignedJson(grant.signature, secret);
    return payload.grantId === grant.grantId && payload.scope === grant.scope;
  } catch {
    return false;
  }
}

export function getAuthorizationGrant(grantId: string): AuthorizationGrant | null {
  const grant = grantStore.get(grantId);
  if (!grant) return null;
  if (grant.revoked) return null;
  if (new Date(grant.expiresAt).getTime() < Date.now()) {
    grantStore.delete(grantId);
    persistGrantsToDisk();
    return null;
  }

  // Cryptographic signature check — reject tampered grants
  if (!verifyGrantSignature(grant)) {
    console.warn(`[authorization-grants] Signature verification failed for grant '${grantId}'. Rejecting.`);
    return null;
  }

  return grant;
}

export function verifyAuthorizationGrant(params: {
  grantId: string;
  caller?: Principal;
  requiredScope: AuthorizationScope;
  target?: string;
  toolId?: string;
}): { authorized: boolean; reason?: string; grant?: AuthorizationGrant } {
  const grant = getAuthorizationGrant(params.grantId);
  if (!grant) {
    return {
      authorized: false,
      reason: `INVALID_GRANT: Grant '${params.grantId}' does not exist, signature verification failed, expired, or was revoked.`,
    };
  }

  // Cross-user reuse check: Caller must match grantedTo unless caller is admin
  if (params.caller && grant.grantedTo !== params.caller.userId && !params.caller.roles.includes("admin")) {
    return {
      authorized: false,
      reason: `CROSS_USER_GRANT_REUSE_BLOCKED: Grant was issued to '${grant.grantedTo}', but requested by '${params.caller.userId}'.`,
    };
  }

  // Scope check
  if (grant.scope !== params.requiredScope && grant.scope !== "high_risk_execution") {
    return {
      authorized: false,
      reason: `SCOPE_MISMATCH: Grant authorizes scope '${grant.scope}', but '${params.requiredScope}' is required.`,
    };
  }

  // Tool check
  if (params.toolId && grant.toolId && grant.toolId !== "*" && grant.toolId.toLowerCase() !== params.toolId.toLowerCase()) {
    return {
      authorized: false,
      reason: `GRANT_TOOL_MISMATCH: Grant '${params.grantId}' authorizes tool '${grant.toolId}', but was invoked with '${params.toolId}'.`,
    };
  }

  // Target pattern check
  if (params.target && grant.targetPattern && grant.targetPattern !== "*") {
    if (!isTargetMatchingPattern(params.target, grant.targetPattern)) {
      return {
        authorized: false,
        reason: `OUT_OF_SCOPE_TARGET: Target '${params.target}' does not match authorized pattern '${grant.targetPattern}'.`,
      };
    }
  }

  return { authorized: true, grant };
}

export function revokeAuthorizationGrant(grantId: string, principal: Principal): boolean {
  const grant = grantStore.get(grantId);
  if (!grant) return false;
  if (!principal.roles.includes("admin") && grant.approvedBy !== principal.userId) {
    throw Object.assign(new Error("Cannot revoke grant issued by another principal"), { status: 403 });
  }
  grant.revoked = true;
  grantStore.set(grantId, grant);
  persistGrantsToDisk();

  try {
    const pool = getDbPool();
    if (pool) {
      pool
        .query(
          `UPDATE authorization_grants SET revoked = TRUE, revoked_at = NOW() WHERE grant_id = $1`,
          [grantId]
        )
        .catch(() => {});
    }
  } catch {
    // Non-blocking PG sync
  }

  return true;
}

export function clearGrantsForTests(): void {
  grantStore.clear();
  try {
    const filePath = resolveGrantsFilePath();
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}

export interface ExecutionAuthResult {
  authorized: boolean;
  activeAuthorized: boolean;
  identityAuthorized: boolean;
  vulnerabilityScanAuthorized?: boolean;
  reason?: string;
  grant?: AuthorizationGrant;
}

export async function validateExecutionAuthorization(params: {
  principal?: Principal;
  tool: UniversalToolDefinition;
  target: string;
  grantId?: string;
}): Promise<ExecutionAuthResult> {
  const { principal, tool, target, grantId } = params;

  const isActiveRecon =
    tool.scopeRequirements.executionClass === "active_recon" || tool.toolId.toLowerCase() === "photon";
  const isIdentityEnum =
    tool.scopeRequirements.executionClass === "identity_enumeration" ||
    tool.workerType === "identity" ||
    tool.toolId.toLowerCase() === "sherlock";
  const isVulnScan =
    tool.capabilities?.includes("vulnerability") ||
    tool.toolId.toLowerCase() === "nuclei" ||
    tool.toolId.toLowerCase() === "vulnerability-scanner";

  const normTarget = normalizeHostOrUrl(target);
  const isPrivateTarget = isPrivateOrLocalAddress(normTarget);

  let activeAuthorized = false;
  let identityAuthorized = false;
  let vulnerabilityScanAuthorized = false;
  let matchedGrant: AuthorizationGrant | undefined;

  // Check asset inventory first
  const assetCheck = validateTargetAgainstAssetInventory(target, isVulnScan ? "vulnerability_scan" : "passive_intel");
  if (assetCheck.approved) {
    if (isVulnScan) vulnerabilityScanAuthorized = true;
    if (isActiveRecon) activeAuthorized = true;
  }

  // 1. Validate independent approval grant if provided
  if (grantId) {
    const grant = getAuthorizationGrant(grantId);
    if (!grant) {
      return {
        authorized: false,
        activeAuthorized: false,
        identityAuthorized: false,
        reason: `INVALID_GRANT: Authorization grant '${grantId}' does not exist, has expired, or was revoked.`,
      };
    }

    // Cross-user grant reuse check: Grant must belong to caller unless caller is an admin
    if (principal && grant.grantedTo !== principal.userId && !principal.roles.includes("admin")) {
      return {
        authorized: false,
        activeAuthorized: false,
        identityAuthorized: false,
        reason: `CROSS_USER_GRANT_REUSE_BLOCKED: Authorization grant '${grantId}' was issued to user '${grant.grantedTo}', but requested by '${principal.userId}'.`,
      };
    }

    // Precise tool matching
    const toolMatch =
      !grant.toolId ||
      grant.toolId === "*" ||
      grant.toolId.toLowerCase() === tool.toolId.toLowerCase();

    // Precise target scope matching
    const targetMatch = isTargetMatchingPattern(target, grant.targetPattern || "*");

    if (!toolMatch) {
      return {
        authorized: false,
        activeAuthorized: false,
        identityAuthorized: false,
        reason: `GRANT_TOOL_MISMATCH: Grant '${grantId}' authorizes tool '${grant.toolId}', but was invoked with '${tool.toolId}'.`,
      };
    }

    if (!targetMatch) {
      return {
        authorized: false,
        activeAuthorized: false,
        identityAuthorized: false,
        reason: `OUT_OF_SCOPE_TARGET: Target '${target}' does not match authorized scope pattern '${grant.targetPattern}'. Deceptive hostnames and redirects are strictly rejected.`,
      };
    }

    // Private address guard: must be explicitly authorized for internal lab assessment
    if (isPrivateTarget && grant.scope !== "internal_lab_assessment" && grant.targetPattern !== "localhost" && grant.targetPattern !== "127.0.0.1") {
      return {
        authorized: false,
        activeAuthorized: false,
        identityAuthorized: false,
        reason: `PRIVATE_NETWORK_DESTINATION_REJECTED: Target '${target}' resolves to a private or metadata address without explicit internal_lab_assessment grant scope.`,
      };
    }

    matchedGrant = grant;

    if (grant.scope === "active_recon" || grant.scope === "high_risk_execution" || grant.scope === "internal_lab_assessment") {
      if (grant.approverRole === "admin") {
        activeAuthorized = true;
      }
    }
    if (grant.scope === "identity_enumeration" || grant.scope === "high_risk_execution") {
      identityAuthorized = true;
    }
    if (grant.scope === "vulnerability_scan" || grant.scope === "high_risk_execution" || grant.scope === "internal_lab_assessment") {
      vulnerabilityScanAuthorized = true;
    }
  }

  // 2. Private IP / SSRF destination check if no grant matched
  if (isPrivateTarget && !activeAuthorized && !vulnerabilityScanAuthorized) {
    const isDirectAdmin = principal?.roles?.includes("admin") ?? false;
    const isLabAllowed = process.env.DISHA_ALLOW_INTERNAL_LAB_ASSESSMENTS === "true";
    if (!isDirectAdmin || !isLabAllowed) {
      return {
        authorized: false,
        activeAuthorized: false,
        identityAuthorized: false,
        reason: `PRIVATE_NETWORK_DESTINATION_REJECTED: Target '${target}' resolves to private or metadata IP address without internal lab authorization.`,
      };
    }
  }

  // 3. Active Reconnaissance Authorization Evaluation
  if (isActiveRecon && !activeAuthorized) {
    const isAdmin = principal?.roles?.includes("admin") ?? false;
    const isEnvApproved = process.env.DISHA_ACTIVE_RECON_APPROVED === "true";

    // Direct admin execution is permitted ONLY if server environment explicitly authorizes active recon
    if (isAdmin && isEnvApproved) {
      activeAuthorized = true;
    } else {
      return {
        authorized: false,
        activeAuthorized: false,
        identityAuthorized,
        reason:
          "ACTIVE_RECON_UNAUTHORIZED: Active reconnaissance requires an independent administrative approval grant (approvalGrantId) or direct execution by an admin principal with DISHA_ACTIVE_RECON_APPROVED enabled. Client-supplied booleans cannot self-declare authorization.",
      };
    }
  }

  // 4. Identity Enumeration Authorization Evaluation
  if (isIdentityEnum && !identityAuthorized) {
    const isOperatorOrAdmin =
      (principal?.roles?.includes("operator") || principal?.roles?.includes("admin")) ?? false;
    const isEnvApproved = process.env.DISHA_IDENTITY_ENUMERATION_APPROVED === "true";

    if (isOperatorOrAdmin && isEnvApproved) {
      identityAuthorized = true;
    } else {
      return {
        authorized: false,
        activeAuthorized,
        identityAuthorized: false,
        reason:
          "IDENTITY_ENUMERATION_UNAUTHORIZED: Identity enumeration requires an independent operator or admin approval grant (approvalGrantId) or direct execution by an operator/admin with DISHA_IDENTITY_ENUMERATION_APPROVED enabled. Client-supplied booleans cannot self-declare authorization.",
      };
    }
  }

  // 5. Vulnerability Scan Authorization Evaluation
  if (isVulnScan && !vulnerabilityScanAuthorized) {
    // Check if target is an approved asset in asset inventory
    const assetCheck = validateTargetAgainstAssetInventory(target, "vulnerability_scan");
    if (assetCheck.approved) {
      vulnerabilityScanAuthorized = true;
    } else {
      return {
        authorized: false,
        activeAuthorized,
        identityAuthorized,
        vulnerabilityScanAuthorized: false,
        reason:
          `VULNERABILITY_SCAN_UNAUTHORIZED: Target '${target}' is not in approved asset inventory and lacks an independent administrative vulnerability_scan approval grant.`,
      };
    }
  }

  return {
    authorized: true,
    activeAuthorized,
    identityAuthorized,
    vulnerabilityScanAuthorized,
    grant: matchedGrant,
  };
}
