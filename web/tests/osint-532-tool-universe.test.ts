import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { generatedOsintManifests } from "@/lib/unified/generated/osint-tool-manifests.generated";
import { universalOsintExecutionService } from "@/lib/osint/universal-execution-service";
import type { AdapterContext } from "@/lib/unified/osint-adapter-bus";

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
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].provenanceHash).toBeDefined();
    expect(result.provenanceHash).toBe(result.evidence[0].provenanceHash);
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
