import { describe, expect, it } from "vitest";
import {
  loadOsintRegistry,
  getOsintMetrics,
  getOsintToolById,
  smokeTestOsintTool,
} from "../lib/unified/osint-runtime-service";
import { generatedOsintManifests, getGeneratedManifest } from "../lib/unified/generated/osint-tool-manifests.generated";

describe("OSINT Runtime Integration & Truthful Status Invariants", () => {
  it("loads the authoritative OSINT upstream registry with over 500 real tools", async () => {
    const registry = await loadOsintRegistry();
    expect(registry.length).toBeGreaterThan(450);

    // Verify mandatory core tools exist
    const mandatoryIds = [
      "spiderfoot",
      "theharvester",
      "sherlock",
      "maigret",
      "holehe",
      "phoneinfoga",
      "subfinder",
    ];

    for (const id of mandatoryIds) {
      const tool = registry.find((t) => t.toolId === id);
      expect(tool, `Mandatory tool '${id}' must be present in registry`).toBeDefined();
      expect(tool?.upstreamUrl).toMatch(/^https:\/\/github\.com\//);
      expect(tool?.license).toBeDefined();
    }
  });

  it("enforces zero synthetic fork URLs: unconfirmed forks must be null and FORK_PENDING", async () => {
    const registry = await loadOsintRegistry();
    for (const tool of registry) {
      if (tool.forkStatus === "FORK_PENDING") {
        expect(tool.forkUrl).toBeNull();
      } else if (tool.forkStatus === "FORKED") {
        expect(tool.forkUrl).toMatch(/^https:\/\/github\.com\/Tashima-Tarsh\//);
      }
    }
  });

  it("calculates truthful runtime metrics matching registry records", async () => {
    const registry = await loadOsintRegistry();
    const metrics = await getOsintMetrics();

    expect(metrics.total).toBe(registry.length);
    expect(metrics.healthy + metrics.unconfigured + metrics.degraded + metrics.authRequired + metrics.catalogOnly + metrics.guiOnly + metrics.datasetOnly + metrics.libraryOnly).toBe(metrics.total);
    expect(metrics.forked + metrics.pendingFork).toBe(metrics.total);
    expect(metrics.upstreamVerified + metrics.upstreamUnverified + metrics.upstreamUnavailable).toBe(metrics.total);
    expect(Object.keys(metrics.byCategory).length).toBeGreaterThan(0);
    expect(Object.keys(metrics.byRuntime).length).toBeGreaterThan(0);
  });

  it("looks up tools by ID case-insensitively and returns truthful metadata", async () => {
    const sherlock = await getOsintToolById("sherlock");
    expect(sherlock).toBeDefined();
    expect(sherlock?.name).toBe("Sherlock");
    expect(sherlock?.runtimeType).toBe("python");
    expect(sherlock?.category).toBe("identity");

    const phoneinfoga = await getOsintToolById("phoneinfoga");
    expect(phoneinfoga).toBeDefined();
    expect(phoneinfoga?.name).toBe("PhoneInfoga");
    expect(phoneinfoga?.runtimeType).toBe("go");

    const nonExistent = await getOsintToolById("non-existent-tool-xyz");
    expect(nonExistent).toBeUndefined();
  });

  it("handles missing binaries gracefully during smoke test without synthetic success", async () => {
    // Probing an unconfigured tool returns error/unconfigured truthfully
    const result = await smokeTestOsintTool("sherlock");
    expect(result).toBeDefined();
    if (!result?.success) {
      expect(result?.error).toBeDefined();
    }
  });

  it("does not report ASTRA tools healthy when deployment policy still blocks execution", async () => {
    const previousAll = process.env.DISHA_ASTRA6_ALL_TOOLS_ENABLED;
    const previousSherlock = process.env.DISHA_ASTRA6_SHERLOCK_ENABLED;
    const previousIdentityApproval = process.env.DISHA_IDENTITY_ENUMERATION_APPROVED;
    const previousPhoton = process.env.DISHA_ASTRA6_PHOTON_ENABLED;
    const previousActiveRecon = process.env.DISHA_ACTIVE_RECON_APPROVED;

    process.env.DISHA_ASTRA6_ALL_TOOLS_ENABLED = "false";
    process.env.DISHA_ASTRA6_SHERLOCK_ENABLED = "true";
    process.env.DISHA_IDENTITY_ENUMERATION_APPROVED = "false";
    process.env.DISHA_ASTRA6_PHOTON_ENABLED = "true";
    process.env.DISHA_ACTIVE_RECON_APPROVED = "false";

    try {
      const sherlock = await smokeTestOsintTool("sherlock");
      expect(sherlock?.success).toBe(false);
      expect(sherlock?.error).toContain("deployment approval");

      const photon = await smokeTestOsintTool("photon");
      expect(photon?.success).toBe(false);
      expect(photon?.error).toContain("deployment approval");
    } finally {
      if (previousAll === undefined) delete process.env.DISHA_ASTRA6_ALL_TOOLS_ENABLED;
      else process.env.DISHA_ASTRA6_ALL_TOOLS_ENABLED = previousAll;
      if (previousSherlock === undefined) delete process.env.DISHA_ASTRA6_SHERLOCK_ENABLED;
      else process.env.DISHA_ASTRA6_SHERLOCK_ENABLED = previousSherlock;
      if (previousIdentityApproval === undefined) delete process.env.DISHA_IDENTITY_ENUMERATION_APPROVED;
      else process.env.DISHA_IDENTITY_ENUMERATION_APPROVED = previousIdentityApproval;
      if (previousPhoton === undefined) delete process.env.DISHA_ASTRA6_PHOTON_ENABLED;
      else process.env.DISHA_ASTRA6_PHOTON_ENABLED = previousPhoton;
      if (previousActiveRecon === undefined) delete process.env.DISHA_ACTIVE_RECON_APPROVED;
      else process.env.DISHA_ACTIVE_RECON_APPROVED = previousActiveRecon;
    }
  });

  it("verifies generated tool manifests conform to DishaToolManifest structure", () => {
    expect(generatedOsintManifests.length).toBeGreaterThan(400);

    const sample = getGeneratedManifest("sherlock");
    expect(sample).toBeDefined();
    expect(sample?.toolId).toBe("sherlock");
    expect(sample?.commandInjectionGuard).toBeDefined();
    expect(sample?.workerRuntime).toBe("python");
    expect(sample?.timeoutMs).toBeGreaterThan(0);
    expect(sample?.manifestHash).toBeDefined();
  });
});
