import { describe, expect, it } from "vitest";
import {
  TOOL_RECIPES,
  universalOsintExecutionService,
} from "../lib/osint/universal-execution-service";

describe("P0.4 & P0.5 — Universal OSINT Execution Recipes & Result Semantics", () => {
  it("defines explicit, versioned recipes for core upstreams", () => {
    expect(TOOL_RECIPES.subfinder).toBeDefined();
    expect(TOOL_RECIPES.amass).toBeDefined();
    expect(TOOL_RECIPES.sherlock).toBeDefined();
    expect(TOOL_RECIPES.maigret).toBeDefined();
    expect(TOOL_RECIPES.holehe).toBeDefined();
    expect(TOOL_RECIPES.phoneinfoga).toBeDefined();
    expect(TOOL_RECIPES.theharvester).toBeDefined();
    expect(TOOL_RECIPES.spiderfoot).toBeDefined();
    expect(TOOL_RECIPES.photon).toBeDefined();
    expect(TOOL_RECIPES.nuclei).toBeDefined();
  });

  it("subfinder recipe builds correct arguments and parses JSON lines into unique subdomains", () => {
    const recipe = TOOL_RECIPES.subfinder;
    expect(recipe.buildArgs("example.com")).toEqual(["-d", "example.com", "-silent", "-json"]);

    const mockStdout = `{"host":"api.example.com"}\n{"host":"admin.example.com"}\n{"host":"api.example.com"}\n`;
    const parsed = recipe.parseOutput(mockStdout, "", "example.com");

    expect(parsed.findingsCount).toBe(2);
    expect((parsed.parsedData as any).subdomains).toEqual(["api.example.com", "admin.example.com"]);
  });

  it("holehe recipe counts only validated confirmed accounts", () => {
    const recipe = TOOL_RECIPES.holehe;
    expect(recipe.buildArgs("target@example.com")).toEqual(["target@example.com", "--only-used", "--no-color"]);

    const mockStdout = `
    [+] twitter.com
    [+] github.com
    [-] instagram.com
    [!] ratelimit
    `;
    const parsed = recipe.parseOutput(mockStdout, "", "target@example.com");
    expect(parsed.findingsCount).toBe(2);
    expect((parsed.parsedData as any).registeredSites).toEqual(["twitter.com", "github.com"]);
  });

  it("phoneinfoga recipe correctly distinguishes valid numbers from invalid without fabricating findings", () => {
    const recipe = TOOL_RECIPES.phoneinfoga;
    expect(recipe.buildArgs("+1234567890")).toEqual(["scan", "-n", "+1234567890", "-o", "json"]);

    const validJson = JSON.stringify({ valid: true, carrier: "TestCarrier" });
    const invalidJson = JSON.stringify({ valid: false, error: "Number invalid" });

    expect(recipe.parseOutput(validJson, "", "+1234567890").findingsCount).toBe(1);
    expect(recipe.parseOutput(invalidJson, "", "+1234567890").findingsCount).toBe(0);
  });

  it("standardizes status to NOT_INSTALLED when CLI binary is missing", async () => {
    const res = await universalOsintExecutionService.execute(
      "abster-intelligence",
      { target: "test-target" },
      {
        missionId: "test-mission",
        userId: "analyst-1",
        purpose: "Testing missing binary semantics",
      }
    );

    expect(res.status).toBe("unconfigured");
    expect(res.standardStatus).toBe("NOT_INSTALLED");
    expect(res.findingsCount).toBe(0);
    expect(res.evidence).toEqual([]);
    expect(res.error).toBe("EXECUTABLE_NOT_FOUND");
  });

  it("standardizes status to BLOCKED_BY_POLICY on shell injection attempt", async () => {
    const res = await universalOsintExecutionService.execute(
      "vcdb",
      { target: "test; rm -rf /" },
      {
        missionId: "test-mission",
        userId: "analyst-1",
        purpose: "Testing shell injection guard",
      }
    );

    expect(res.status).toBe("blocked_by_policy");
    expect(res.standardStatus).toBe("BLOCKED_BY_POLICY");
    expect(res.findingsCount).toBe(0);
  });

  it("standardizes dataset queries to COMPLETED_WITH_FINDINGS and COMPLETED_NO_FINDINGS truthfully", async () => {
    const matchRes = await universalOsintExecutionService.execute(
      "vcdb",
      { target: "CVE-2023-0001" },
      {
        missionId: "test-mission",
        userId: "analyst-1",
        purpose: "Testing dataset match semantics",
      }
    );
    expect(matchRes.status).toBe("completed");
    expect(matchRes.standardStatus).toBe("COMPLETED_WITH_FINDINGS");
    expect(matchRes.findingsCount).toBeGreaterThan(0);
    expect(matchRes.evidence.length).toBeGreaterThan(0);

    const noMatchRes = await universalOsintExecutionService.execute(
      "vcdb",
      { target: "NONEXISTENT_QUERY_RECORD_9999999" },
      {
        missionId: "test-mission",
        userId: "analyst-1",
        purpose: "Testing dataset zero match semantics",
      }
    );
    expect(noMatchRes.status).toBe("completed");
    expect(noMatchRes.standardStatus).toBe("COMPLETED_NO_FINDINGS");
    expect(noMatchRes.findingsCount).toBe(0);
    expect(noMatchRes.evidence).toEqual([]);
  });
});
