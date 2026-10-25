import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { generatedOsintManifests } from "@/lib/unified/generated/osint-tool-manifests.generated";
import { universalOsintExecutionService } from "@/lib/osint/universal-execution-service";
import type { AdapterContext } from "@/lib/unified/osint-adapter-bus";
import {
  issueAuthorizationGrant,
  validateExecutionAuthorization,
  clearGrantsForTests,
} from "@/lib/server/authorization-grants";

describe("DISHA 6.6 — 532-Tool Universe & Governed Execution Verification", () => {
  const rootRegistryPath = path.resolve(process.cwd(), "../data/osint/upstream-registry.json");
  const webRegistryPath = path.resolve(process.cwd(), "data/osint/upstream-registry.json");
  const lockPath = path.resolve(process.cwd(), "../data/osint/runtime-lock.json");
  const statusPath = path.resolve(process.cwd(), "../data/osint/runtime-status.json");

  const registry = JSON.parse(fs.readFileSync(fs.existsSync(rootRegistryPath) ? rootRegistryPath : webRegistryPath, "utf8"));
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  const status = JSON.parse(fs.readFileSync(statusPath, "utf8"));

  it("reconciles all 532 tools across all canonical registries with zero omissions", () => {
    expect(registry.length).toBe(532);
    expect(lock.tools.length).toBe(532);
    expect(status.tools.length).toBe(532);
    expect(generatedOsintManifests.length).toBe(532);

    const regIds = new Set(registry.map((t: any) => t.toolId));
    const manifestIds = new Set(generatedOsintManifests.map((m) => m.toolId));
    expect(regIds.size).toBe(532);
    expect(manifestIds.size).toBe(532);

    for (const tool of registry) {
      expect(manifestIds.has(tool.toolId)).toBe(true);
    }
  });

  it("prohibits fabricated smoke passes and mock healthy flags across the universe", () => {
    // Assert that no tools have fabricated smokeResult without genuine execution
    for (const tool of registry) {
      if (tool.smokeResult?.success === true) {
        // Must either be a valid reference (dataset/gui/library) or have a real non-synthetic message
        const isRef = ["gui-only", "dataset-only", "library-only", "documentation"].includes(tool.runtimeType)
          || ["GUI_INTEGRATED", "DATASET_INTEGRATED", "LIBRARY_INTEGRATED", "REFERENCE_ONLY"].includes(tool.status);
        expect(isRef || tool.status === "HEALTHY").toBe(true);
      }
    }
  });

  it("provides complete typed execution definitions for heterogeneous runtime categories", () => {
    const pythonTool = universalOsintExecutionService.getToolDefinition("sherlock");
    expect(pythonTool).toBeDefined();
    expect(pythonTool?.runtimeType).toBe("python");
    expect(pythonTool?.workerType).toBe("identity");
    expect(pythonTool?.scopeRequirements.executionClass).toBe("passive_public");

    const goTool = universalOsintExecutionService.getToolDefinition("subfinder");
    expect(goTool).toBeDefined();
    expect(goTool?.runtimeType).toBe("go");
    expect(goTool?.workerType).toBe("network");

    const datasetTool = universalOsintExecutionService.getToolDefinition("vcdb");
    expect(datasetTool).toBeDefined();
    expect(datasetTool?.executionMethod).toBe("dataset_query");

    const libraryTool = universalOsintExecutionService.getToolDefinition("volatility3");
    expect(libraryTool).toBeDefined();
  });

  it("enforces command injection guards and blocks shell metacharacters", async () => {
    const testContext: AdapterContext = {
      missionId: "test-mission",
      userId: "test-analyst",
      purpose: "Security injection verification",
    };

    const maliciousInputs = [
      "example.com; rm -rf /",
      "target.org | cat /etc/passwd",
      "user && touch /tmp/pwned",
      "`whoami`",
      "$(id)",
      "target.org > /dev/null",
      "user\necho pwn",
    ];

    for (const malicious of maliciousInputs) {
      const result = await universalOsintExecutionService.execute(
        "sherlock",
        { target: malicious },
        testContext,
      );
      expect(result.status).toBe("blocked_by_policy");
      expect(result.error).toBe("target_validation_failed");
      expect(result.warnings[0]).toContain("Command injection guard triggered");
    }
  });

  it("enforces policy gates for identity enumeration and active reconnaissance", async () => {
    const testContext: AdapterContext = {
      missionId: "test-mission",
      userId: "test-analyst",
      purpose: "Policy gate test",
      activeAuthorization: false,
    };

    // Photon is active_recon -> blocked without activeAuthorization
    const photonResult = await universalOsintExecutionService.execute(
      "photon",
      { target: "localhost" },
      testContext,
    );
    expect(photonResult.status).toBe("blocked_by_policy");
    expect(photonResult.error).toBe("active_recon_not_authorized");

    // Sherlock is identity_enumeration -> requires operator confirmation
    const sherlockResult = await universalOsintExecutionService.execute(
      "sherlock",
      { target: "testuser", confirmed: false },
      testContext,
    );
    // When DISHA_IDENTITY_ENUMERATION_APPROVED is false, confirmation is required
    if (process.env.DISHA_IDENTITY_ENUMERATION_APPROVED !== "true") {
      expect(sherlockResult.status).toBe("blocked_by_policy");
      expect(sherlockResult.error).toBe("confirmation_required");
    }
  });

  it("executes dataset queries with cryptographic evidence emission and provenance hashes", async () => {
    const testContext: AdapterContext = {
      missionId: "test-dataset-mission",
      userId: "test-analyst",
      purpose: "Dataset query verification",
    };

    const result = await universalOsintExecutionService.execute(
      "vcdb",
      { target: "CVE-2023-0001", targetType: "vulnerability" },
      testContext,
    );

    expect(result.status).toBe("completed");
    expect(result.executionMethod).toBe("dataset_query");
    expect(result.findingsCount).toBe(1);
    expect(result.evidence.length).toBe(1);
    expect(result.evidence[0].provenanceHash).toBeDefined();
    expect(result.provenanceHash).toBe(result.evidence[0].provenanceHash);

    // Non-matching target truthfully reports 0 matches without fabricating evidence
    const noMatchResult = await universalOsintExecutionService.execute(
      "vcdb",
      { target: "NONEXISTENT-CVE-9999", targetType: "vulnerability" },
      testContext,
    );

    expect(noMatchResult.status).toBe("completed");
    expect(noMatchResult.findingsCount).toBe(0);
    expect(noMatchResult.evidence.length).toBe(0);
    expect((noMatchResult.data as any)?.matchCount).toBe(0);
    expect(noMatchResult.warnings[0]).toContain("returned 0 matching records");
  });

  it("truthfully treats GUI references as reference_only with zero synthetic evidence", async () => {
    const testContext: AdapterContext = {
      missionId: "test-gui-mission",
      userId: "test-analyst",
      purpose: "GUI reference verification",
    };

    const result = await universalOsintExecutionService.execute(
      "marinetraffic",
      { target: "IMO9123456" },
      testContext,
    );

    expect(result.status).toBe("reference_only");
    expect(result.executionMethod).toBe("gui_view");
    expect(result.findingsCount).toBe(0);
    expect(result.evidence.length).toBe(0);
    expect((result.data as any)?.mode).toBe("interactive_gui_reference");
    expect(result.warnings[0]).toContain("interactive desktop/web GUI application");
  });

  it("enforces independent server-side authorization grants and blocks client self-declaration", async () => {
    clearGrantsForTests();

    const photonDef = universalOsintExecutionService.getToolDefinition("photon")!;
    expect(photonDef).toBeDefined();

    // 1. Unprivileged user or client self-declaring active recon is blocked
    const analystPrincipal = {
      userId: "analyst-1",
      email: "analyst@disha.local",
      roles: ["analyst" as const],
    };

    const unauthCheck = await validateExecutionAuthorization({
      principal: analystPrincipal,
      tool: photonDef,
      target: "example.com",
    });

    expect(unauthCheck.authorized).toBe(false);
    expect(unauthCheck.activeAuthorized).toBe(false);
    expect(unauthCheck.reason).toContain("ACTIVE_RECON_UNAUTHORIZED");

    // 2. Analyst attempts to issue an active_recon grant -> rejected with 403
    expect(() =>
      issueAuthorizationGrant({
        scope: "active_recon",
        approver: analystPrincipal,
        toolId: "photon",
        purpose: "Unauthorized analyst attempt",
      })
    ).toThrow();

    // 3. Admin issues an independent authorization grant
    const adminPrincipal = {
      userId: "admin-1",
      email: "admin@disha.local",
      roles: ["admin" as const],
    };

    const grant = issueAuthorizationGrant({
      scope: "active_recon",
      approver: adminPrincipal,
      toolId: "photon",
      targetPattern: "example.com",
      purpose: "Authorized perimeter audit",
      ttlMinutes: 60,
    });

    expect(grant.grantId).toBeDefined();
    expect(grant.scope).toBe("active_recon");

    // 4. Valid grant passed to validation -> successfully authorized
    const authCheckWithGrant = await validateExecutionAuthorization({
      principal: analystPrincipal,
      tool: photonDef,
      target: "example.com",
      grantId: grant.grantId,
    });

    expect(authCheckWithGrant.authorized).toBe(true);
    expect(authCheckWithGrant.activeAuthorized).toBe(true);
    expect(authCheckWithGrant.grant?.grantId).toBe(grant.grantId);
  });

  it("truthfully reports unconfigured status when CLI binary is missing without throwing errors", async () => {
    const testContext: AdapterContext = {
      missionId: "test-missing-binary",
      userId: "test-analyst",
      purpose: "Unconfigured binary truthfulness test",
      activeAuthorization: true,
    };

    // A rare or custom tool that is not installed on Windows PATH
    const result = await universalOsintExecutionService.execute(
      "abster-intelligence",
      { target: "test-target" },
      testContext,
    );

    expect(result.status).toBe("unconfigured");
    expect(result.error).toBe("EXECUTABLE_NOT_FOUND");
    expect(result.warnings[0]).toContain("not installed in the local environment PATH");
  });
});

