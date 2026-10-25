import { describe, expect, it, beforeEach } from "vitest";
import {
  clearGrantsForTests,
  issueAuthorizationGrant,
  getAuthorizationGrant,
  revokeAuthorizationGrant,
} from "../lib/server/authorization-grants";
import type { Principal } from "../lib/server/types";

describe("Phase 5 — Durable Transactional Authorization Grants", () => {
  const adminPrincipal: Principal = {
    userId: "admin-sec-lead",
    roles: ["admin", "analyst"],
    token: "valid-admin-token",
  };

  const analystPrincipal: Principal = {
    userId: "analyst-field-1",
    roles: ["analyst"],
    token: "valid-analyst-token",
  };

  beforeEach(() => {
    clearGrantsForTests();
  });

  it("issues a grant, writes to durable storage, and retrieves active grant", () => {
    const grant = issueAuthorizationGrant({
      scope: "active_recon",
      approver: adminPrincipal,
      grantedTo: "analyst-field-1",
      targetPattern: "*.lab.internal",
      purpose: "Authorized penetration test against staging",
      ttlMinutes: 60,
    });

    expect(grant.grantId).toBeDefined();
    expect(grant.scope).toBe("active_recon");
    expect(grant.grantedTo).toBe("analyst-field-1");

    const retrieved = getAuthorizationGrant(grant.grantId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.grantId).toBe(grant.grantId);
    expect(retrieved?.purpose).toContain("staging");
  });

  it("durably enforces revocation and prevents access", () => {
    const grant = issueAuthorizationGrant({
      scope: "vulnerability_scan",
      approver: adminPrincipal,
      grantedTo: "analyst-field-1",
      targetPattern: "target.lab.internal",
      purpose: "Vulnerability scan grant",
      ttlMinutes: 60,
    });

    expect(getAuthorizationGrant(grant.grantId)).not.toBeNull();

    // Revoke grant
    const revoked = revokeAuthorizationGrant(grant.grantId, adminPrincipal);
    expect(revoked).toBe(true);

    // After revocation, getAuthorizationGrant must return null
    expect(getAuthorizationGrant(grant.grantId)).toBeNull();
  });

  it("prevents unauthorized analysts from issuing admin grants", () => {
    expect(() =>
      issueAuthorizationGrant({
        scope: "active_recon",
        approver: analystPrincipal,
        grantedTo: "analyst-field-1",
        purpose: "Self-issued active recon",
      })
    ).toThrow(/Grant creation denied/);
  });
});

