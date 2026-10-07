import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authorizeQueuedJob } from "../scripts/astra6-worker.mjs";

describe("Photon / Active Recon End-to-End Worker Authorization", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.DISHA_ASTRA6_PHOTON_ENABLED = "true";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("blocks execution when tool manifest is disabled", () => {
    process.env.DISHA_ACTIVE_RECON_APPROVED = "true";
    const job = {
      tool_id: "photon",
      target: "example.com",
      target_type: "domain",
      manifest_enabled: false,
      dispatch_input: { activeAuthorization: true },
    };
    const result = authorizeQueuedJob(job);
    expect(result.allowed).toBe(false);
    expect(result.error).toBe("policy_denied_tool_disabled");
  });

  it("blocks execution when deployment tool flag is disabled", () => {
    process.env.DISHA_ASTRA6_PHOTON_ENABLED = "false";
    delete process.env.DISHA_ASTRA6_ALL_TOOLS_ENABLED;
    process.env.DISHA_ACTIVE_RECON_APPROVED = "true";
    const job = {
      tool_id: "photon",
      target: "example.com",
      target_type: "domain",
      manifest_enabled: true,
      dispatch_input: { activeAuthorization: true },
    };
    const result = authorizeQueuedJob(job);
    expect(result.allowed).toBe(false);
    expect(result.error).toBe("policy_denied_tool_disabled");
  });

  it("blocks execution when DISHA_ACTIVE_RECON_APPROVED is false/missing", () => {
    delete process.env.DISHA_ACTIVE_RECON_APPROVED;
    const job = {
      tool_id: "photon",
      target: "example.com",
      target_type: "domain",
      manifest_enabled: true,
      dispatch_input: { activeAuthorization: true },
    };
    const result = authorizeQueuedJob(job);
    expect(result.allowed).toBe(false);
    expect(result.error).toBe("policy_denied_active_deployment");
  });

  it("blocks execution when queued job lacks explicit activeAuthorization", () => {
    process.env.DISHA_ACTIVE_RECON_APPROVED = "true";
    const job = {
      tool_id: "photon",
      target: "example.com",
      target_type: "domain",
      manifest_enabled: true,
      dispatch_input: { options: {} },
    };
    const result = authorizeQueuedJob(job);
    expect(result.allowed).toBe(false);
    expect(result.error).toBe("policy_denied_active_request");
  });

  it("allows execution only when manifest, deployment flag, approval, and request authorization are all true", () => {
    process.env.DISHA_ACTIVE_RECON_APPROVED = "true";
    const job = {
      tool_id: "photon",
      target: "example.com",
      target_type: "domain",
      manifest_enabled: true,
      dispatch_input: { activeAuthorization: true },
    };
    const result = authorizeQueuedJob(job);
    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("supports nested authorization.activeRecon format", () => {
    process.env.DISHA_ACTIVE_RECON_APPROVED = "true";
    const job = {
      tool_id: "photon",
      target: "example.com",
      target_type: "domain",
      manifest_enabled: true,
      dispatch_input: { authorization: { activeRecon: true } },
    };
    const result = authorizeQueuedJob(job);
    expect(result.allowed).toBe(true);
  });

  it("fails closed if authorization is revoked after dispatch", () => {
    process.env.DISHA_ACTIVE_RECON_APPROVED = "true";
    const job = {
      tool_id: "photon",
      target: "example.com",
      target_type: "domain",
      manifest_enabled: true,
      dispatch_input: { activeAuthorization: true },
    };
    expect(authorizeQueuedJob(job).allowed).toBe(true);

    // Deployment approval revoked
    process.env.DISHA_ACTIVE_RECON_APPROVED = "false";
    expect(authorizeQueuedJob(job).allowed).toBe(false);
    expect(authorizeQueuedJob(job).error).toBe("policy_denied_active_deployment");

    // Request authorization altered/stripped in database
    process.env.DISHA_ACTIVE_RECON_APPROVED = "true";
    job.dispatch_input = { activeAuthorization: false };
    expect(authorizeQueuedJob(job).allowed).toBe(false);
    expect(authorizeQueuedJob(job).error).toBe("policy_denied_active_request");
  });
});
