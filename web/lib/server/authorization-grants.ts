import crypto from "node:crypto";
import type { Principal, Role } from "./types";
import { signJson, verifySignedJson } from "./crypto";
import { authSigningSecret } from "./auth";
import type { UniversalToolDefinition } from "../osint/universal-execution-service";

export type AuthorizationScope = "active_recon" | "identity_enumeration" | "high_risk_execution";

export interface AuthorizationGrant {
  grantId: string;
  scope: AuthorizationScope;
  toolId?: string; // specific toolId or "*"
  targetPattern?: string; // target string or regex pattern or "*"
  approvedBy: string; // principal userId
  approverRole: Role;
  purpose: string;
  createdAt: string;
  expiresAt: string;
  revoked?: boolean;
  signature?: string;
}

// In-memory grant store for durable runtime authorization
const grantStore = new Map<string, AuthorizationGrant>();

export function issueAuthorizationGrant(params: {
  scope: AuthorizationScope;
  approver: Principal;
  toolId?: string;
  targetPattern?: string;
  purpose: string;
  ttlMinutes?: number;
}): AuthorizationGrant {
  // Authorization policy enforcement
  const isApproverAdmin = params.approver.roles.includes("admin");
  const isApproverOperator = params.approver.roles.includes("operator");

  if (params.scope === "active_recon" || params.scope === "high_risk_execution") {
    if (!isApproverAdmin) {
      throw Object.assign(
        new Error(`Grant creation denied: Only users with 'admin' role can approve '${params.scope}'.`),
        { status: 403 }
      );
    }
  } else if (params.scope === "identity_enumeration") {
    if (!isApproverAdmin && !isApproverOperator) {
      throw Object.assign(
        new Error(`Grant creation denied: Users must have 'admin' or 'operator' role to approve 'identity_enumeration'.`),
        { status: 403 }
      );
    }
  }

  const grantId = `grant_${crypto.randomUUID()}`;
  const now = Date.now();
  const ttlMs = Math.min(Math.max(params.ttlMinutes || 30, 1), 240) * 60 * 1000;
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + ttlMs).toISOString();

  const grantPayload: Record<string, unknown> = {
    grantId,
    scope: params.scope,
    toolId: params.toolId || "*",
    targetPattern: params.targetPattern || "*",
    approvedBy: params.approver.userId,
    approverRole: isApproverAdmin ? "admin" : "operator",
    purpose: params.purpose,
    createdAt,
    expiresAt,
    exp: Math.floor((now + ttlMs) / 1000),
  };

  let signature: string | undefined;
  try {
    signature = signJson(grantPayload, authSigningSecret());
  } catch {
    // If JWT secret is not configured in local test mode, fallback to hash
    signature = crypto
      .createHmac("sha256", "disha-grant-key")
      .update(JSON.stringify(grantPayload))
      .digest("hex");
  }

  const grant: AuthorizationGrant = {
    grantId,
    scope: params.scope,
    toolId: params.toolId || "*",
    targetPattern: params.targetPattern || "*",
    approvedBy: params.approver.userId,
    approverRole: (isApproverAdmin ? "admin" : "operator") as Role,
    purpose: params.purpose,
    createdAt,
    expiresAt,
    revoked: false,
    signature,
  };

  grantStore.set(grantId, grant);
  return grant;
}

export function getAuthorizationGrant(grantId: string): AuthorizationGrant | null {
  const grant = grantStore.get(grantId);
  if (!grant) return null;
  if (grant.revoked) return null;
  if (new Date(grant.expiresAt).getTime() < Date.now()) {
    grantStore.delete(grantId);
    return null;
  }
  return grant;
}

export function revokeAuthorizationGrant(grantId: string, principal: Principal): boolean {
  const grant = grantStore.get(grantId);
  if (!grant) return false;
  if (!principal.roles.includes("admin") && grant.approvedBy !== principal.userId) {
    throw Object.assign(new Error("Cannot revoke grant issued by another principal"), { status: 403 });
  }
  grant.revoked = true;
  grantStore.set(grantId, grant);
  return true;
}

export function clearGrantsForTests(): void {
  grantStore.clear();
}

export interface ExecutionAuthResult {
  authorized: boolean;
  activeAuthorized: boolean;
  identityAuthorized: boolean;
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

  let activeAuthorized = false;
  let identityAuthorized = false;
  let matchedGrant: AuthorizationGrant | undefined;

  // 1. Check if independent approval grant is provided and valid
  if (grantId) {
    const grant = getAuthorizationGrant(grantId);
    if (grant) {
      const toolMatch = !grant.toolId || grant.toolId === "*" || grant.toolId.toLowerCase() === tool.toolId.toLowerCase();
      let targetMatch = !grant.targetPattern || grant.targetPattern === "*";
      if (!targetMatch && grant.targetPattern) {
        targetMatch = target.toLowerCase().includes(grant.targetPattern.toLowerCase());
      }

      if (toolMatch && targetMatch) {
        matchedGrant = grant;
        if (grant.scope === "active_recon" || grant.scope === "high_risk_execution") {
          if (grant.approverRole === "admin") {
            activeAuthorized = true;
          }
        }
        if (grant.scope === "identity_enumeration" || grant.scope === "high_risk_execution") {
          identityAuthorized = true;
        }
      }
    }
  }

  // 2. Active Reconnaissance Authorization Evaluation
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

  // 3. Identity Enumeration Authorization Evaluation
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

  return {
    authorized: true,
    activeAuthorized,
    identityAuthorized,
    grant: matchedGrant,
  };
}
