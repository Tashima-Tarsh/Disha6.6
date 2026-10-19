import { afterEach, describe, expect, it, vi } from "vitest";
import { openosintClient, OpenOsintMcpClient } from "../lib/server/openosint-mcp-client";
import {
  createOpenOsintBreachAdapter,
  createOpenOsintDnsAdapter,
  createOpenOsintDorksAdapter,
  createOpenOsintGithubAdapter,
  createOpenOsintIpAdapter,
  createOpenOsintMcpAdapter,
  createOpenOsintRdapAdapter,
  createOpenOsintWhoisAdapter,
} from "../lib/unified/openosint-adapters";
import {
  listOsintServiceConnectors,
  probeOsintServiceConnector,
} from "../lib/unified/osint-service-connectors";
import { buildTargetRoutePlan } from "../lib/unified/target-route-registry";
import { normalizeRecords } from "../services/investigation/normalize";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("OpenOSINT MCP Integration", () => {
  it("registers OpenOSINT in service connectors with configured_live execution posture", () => {
    const connectors = listOsintServiceConnectors();
    const openosint = connectors.find((c) => c.id === "openosint");
    expect(openosint).toBeDefined();
    expect(openosint?.executionState).toBe("configured_live");
    expect(openosint?.configured).toBe(true);
    expect(openosint?.canRunTargetSearch).toBe(true);
    expect(openosint?.canProbe).toBe(true);
    expect(openosint?.upstream).toBe("https://github.com/OpenOSINT/OpenOSINT");
    expect(openosint?.license).toBe("MIT");
  });

  it("checks OpenOSINT MCP health and discovers available tools", async () => {
    const health = await openosintClient.checkHealth();
    expect(health).toHaveProperty("available");
    expect(health).toHaveProperty("transport");
    expect(typeof (health.toolsAvailable ?? health.toolCount)).toBe("number");
    if (health.available) {
      expect(health.toolsAvailable ?? health.toolCount).toBeGreaterThan(0);
      const tools = await openosintClient.listTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain("generate_dorks");
      expect(toolNames).toContain("search_dns");
    }
  }, 20000);

  it("probes OpenOSINT via service connector probe interface", async () => {
    const probe = await probeOsintServiceConnector("openosint");
    expect(probe.connectorId).toBe("openosint");
    expect(["ok", "failed"]).toContain(probe.status);
    expect(probe.detail).toContain("OpenOSINT MCP");
  }, 20000);

  it("generates search dorks through governed openosint-dorks adapter", async () => {
    const adapter = createOpenOsintDorksAdapter(openosintClient);
    const health = await adapter.health();
    if (health.status === "unavailable") {
      // If Python runtime is not active in this test runner, skip execution test
      return;
    }

    const result = await adapter.execute(
      { target: "example.com" },
      { missionId: "m-test", userId: "u-test", purpose: "defensive footprinting" },
    );

    expect(result.data.status).toBe("SUCCESS");
    expect(result.data.records.length).toBeGreaterThan(0);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].sourceId).toBe("openosint-dorks");
  }, 20000);

  it("resolves DNS through governed openosint-dns adapter", async () => {
    const adapter = createOpenOsintDnsAdapter(openosintClient);
    const health = await adapter.health();
    if (health.status === "unavailable") return;

    const result = await adapter.execute(
      { domain: "example.com" },
      { missionId: "m-test", userId: "u-test", purpose: "defensive DNS audit" },
    );

    expect(result.data.status).toBe("SUCCESS");
    expect(result.data.records.length).toBeGreaterThan(0);
    expect(result.evidence.length).toBeGreaterThan(0);
  }, 20000);

  it("blocks identity-oriented tools when identity authorization is absent", async () => {
    const adapter = createOpenOsintMcpAdapter(openosintClient);
    await expect(
      adapter.execute(
        { tool: "search_username", arguments: { username: "johndoe" } },
        { missionId: "m-test", userId: "u-test", purpose: "testing auth", identityAuthorization: false },
      ),
    ).rejects.toThrow("identity_authorization_required");
  });

  it("requires investigation purpose on every execution", async () => {
    const adapter = createOpenOsintMcpAdapter(openosintClient);
    await expect(
      adapter.execute(
        { tool: "generate_dorks", arguments: { target: "example.com" } },
        { missionId: "m-test", userId: "u-test", purpose: "" },
      ),
    ).rejects.toThrow("purpose_required");
  });

  it("detects missing API credentials accurately without claiming false data", async () => {
    const previousKey = process.env.HIBP_API_KEY;
    delete process.env.HIBP_API_KEY;

    try {
      const adapter = createOpenOsintBreachAdapter(openosintClient);
      const health = await adapter.health();
      expect(health.status).toBe("not_configured");
      expect(health.detail).toContain("HIBP_API_KEY is required");

      await expect(
        adapter.execute(
          { email: "test@example.com" },
          { missionId: "m-test", userId: "u-test", purpose: "defensive breach check" },
        ),
      ).rejects.toThrow("key_required: HIBP_API_KEY");
    } finally {
      if (previousKey !== undefined) process.env.HIBP_API_KEY = previousKey;
    }
  });

  it("normalizes OpenOSINT results into governed evidence with deterministic content and provenance hashes", () => {
    const plan = {
      adapterId: "openosint-dns",
      sourceName: "OpenOSINT DNS",
      input: { domain: "example.com" },
      reason: "DNS review",
    };

    const mockResult = {
      data: {
        tool: "search_dns",
        status: "SUCCESS" as const,
        records: [
          { record_type: "A", address: "93.184.216.34", host: "example.com" },
          { record_type: "TXT", text: "v=spf1 -all", host: "example.com" },
        ],
        rawText: "A: 93.184.216.34",
        warnings: [],
      },
      evidence: [
        {
          sourceId: "openosint-dns",
          sourceName: "OpenOSINT DNS",
          sourceUrl: "https://github.com/OpenOSINT/OpenOSINT",
          summary: "DNS records",
          retrievedAt: "2026-10-13T10:00:00.000Z",
        },
      ],
      warnings: [],
      status: "completed" as const,
    };

    const normalized = normalizeRecords(plan, mockResult);
    expect(normalized).toHaveLength(2);
    expect(normalized[0].sourceId).toBe("openosint-dns");
    expect(normalized[0].sourceName).toBe("OpenOSINT DNS");
    expect(normalized[0].contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(normalized[0].provenanceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(normalized[0].corroborationState).toBe("unverified");
    expect(normalized[0].contradictionState).toBe("not_assessed");
    expect(normalized[0].fields).toEqual({ record_type: "A", address: "93.184.216.34", host: "example.com" });
  });

  it("routes target domains to OpenOSINT tools in target route registry", () => {
    const plan = buildTargetRoutePlan("example.com", "domain");
    const adapterIds = plan.map((p) => p.adapterId);

    expect(adapterIds).toContain("openosint-dns");
    expect(adapterIds).toContain("openosint-rdap");
    expect(adapterIds).toContain("openosint-whois");
    expect(adapterIds).toContain("openosint-dorks");

    const dnsItem = plan.find((p) => p.adapterId === "openosint-dns");
    expect(dnsItem?.input).toEqual({ domain: "example.com" });
    expect(dnsItem?.initialStatus).toBeUndefined();
  });

  it("routes IP targets to OpenOSINT IP tool", () => {
    const plan = buildTargetRoutePlan("192.0.2.1", "ip");
    const adapterIds = plan.map((p) => p.adapterId);
    expect(adapterIds).toContain("openosint-ip");

    const ipItem = plan.find((p) => p.adapterId === "openosint-ip");
    expect(ipItem?.input).toEqual({ ip: "192.0.2.1" });
  });

  it("routes repository targets to OpenOSINT GitHub tool", () => {
    const plan = buildTargetRoutePlan("octocat/Spoon-Knife", "repository");
    const adapterIds = plan.map((p) => p.adapterId);
    expect(adapterIds).toContain("openosint-github");

    const ghItem = plan.find((p) => p.adapterId === "openosint-github");
    expect(ghItem?.input).toEqual({ query: "octocat/Spoon-Knife" });
  });

  it("handles explicit tool selection for OpenOSINT tools", () => {
    const plan = buildTargetRoutePlan("example.com", "domain", {
      selectedToolIds: ["openosint-dns", "openosint-dorks"],
    });
    const adapterIds = plan.map((p) => p.adapterId);
    expect(adapterIds).toContain("openosint-dns");
    expect(adapterIds).toContain("openosint-dorks");
  });
});
