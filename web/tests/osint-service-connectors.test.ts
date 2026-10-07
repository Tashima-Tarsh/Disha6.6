import { describe, expect, it } from "vitest";
import {
  createIntelOwlServiceAdapter,
  createOpenCtiServiceAdapter,
  getOsintServiceConnectorSummary,
  listOsintServiceConnectors,
  probeOsintServiceConnector,
} from "../lib/unified/osint-service-connectors";
import { createDefaultOsintBus } from "../lib/unified/osint-default-bus";


describe("OSINT service connectors", () => {
  it("reports service-backed and ASTRA-backed runtime posture", () => {
    const connectors = listOsintServiceConnectors();
    expect(connectors.map((connector) => connector.id)).toEqual(["opencti", "intelowl", "spiderfoot", "sherlock", "maigret"]);
    expect(connectors.find((connector) => connector.id === "opencti")?.executionState).toBe("configured_live");
    expect(connectors.find((connector) => connector.id === "intelowl")?.executionState).toBe("configured_live");
    expect(connectors.find((connector) => connector.id === "spiderfoot")?.executionState).toBe("astra_worker");
    expect(connectors.find((connector) => connector.id === "sherlock")?.executionState).toBe("astra_worker");
    expect(connectors.find((connector) => connector.id === "maigret")?.executionState).toBe("astra_worker");
  });

  it("does not expose secret values in connector posture", () => {
    const previousToken = process.env.OPENCTI_TOKEN;
    process.env.OPENCTI_TOKEN = "secret-token-value";
    try {
      const serialized = JSON.stringify(listOsintServiceConnectors());
      expect(serialized).not.toContain("secret-token-value");
      expect(serialized).toContain("OPENCTI_TOKEN");
    } finally {
      if (previousToken === undefined) delete process.env.OPENCTI_TOKEN;
      else process.env.OPENCTI_TOKEN = previousToken;
    }
  });

  it("reports SpiderFoot as an ASTRA worker when configured", async () => {
    const previousDb = process.env.DATABASE_URL;
    const previousFlag = process.env.DISHA_ASTRA6_SPIDERFOOT_ENABLED;
    process.env.DATABASE_URL = "postgresql://example.invalid/disha";
    process.env.DISHA_ASTRA6_SPIDERFOOT_ENABLED = "true";
    try {
      await expect(probeOsintServiceConnector("spiderfoot")).resolves.toMatchObject({ status: "ok" });
    } finally {
      if (previousDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDb;
      if (previousFlag === undefined) delete process.env.DISHA_ASTRA6_SPIDERFOOT_ENABLED;
      else process.env.DISHA_ASTRA6_SPIDERFOOT_ENABLED = previousFlag;
    }
  });

  it("allows OpenCTI and IntelOwl probes only when explicitly configured", async () => {
    const previousOpenCtiUrl = process.env.OPENCTI_BASE_URL;
    const previousOpenCtiToken = process.env.OPENCTI_TOKEN;
    const previousIntelOwlUrl = process.env.INTELOWL_BASE_URL;
    const previousIntelOwlKey = process.env.INTELOWL_API_KEY;
    const previousIntelOwlAllowlist = process.env.INTELOWL_ANALYZERS_ALLOWLIST;

    process.env.OPENCTI_BASE_URL = "https://opencti.example";
    process.env.OPENCTI_TOKEN = "token";
    process.env.INTELOWL_BASE_URL = "https://intelowl.example";
    process.env.INTELOWL_API_KEY = "key";
    process.env.INTELOWL_ANALYZERS_ALLOWLIST = "PassiveDns";

    const fetcher = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });
    try {
      await expect(probeOsintServiceConnector("opencti", fetcher)).resolves.toMatchObject({ status: "ok", httpStatus: 200 });
      await expect(probeOsintServiceConnector("intelowl", fetcher)).resolves.toMatchObject({ status: "ok", httpStatus: 200 });
    } finally {
      if (previousOpenCtiUrl === undefined) delete process.env.OPENCTI_BASE_URL;
      else process.env.OPENCTI_BASE_URL = previousOpenCtiUrl;
      if (previousOpenCtiToken === undefined) delete process.env.OPENCTI_TOKEN;
      else process.env.OPENCTI_TOKEN = previousOpenCtiToken;
      if (previousIntelOwlUrl === undefined) delete process.env.INTELOWL_BASE_URL;
      else process.env.INTELOWL_BASE_URL = previousIntelOwlUrl;
      if (previousIntelOwlKey === undefined) delete process.env.INTELOWL_API_KEY;
      else process.env.INTELOWL_API_KEY = previousIntelOwlKey;
      if (previousIntelOwlAllowlist === undefined) delete process.env.INTELOWL_ANALYZERS_ALLOWLIST;
      else process.env.INTELOWL_ANALYZERS_ALLOWLIST = previousIntelOwlAllowlist;
    }
  });

  it("executes bounded read-only OpenCTI search through the governed adapter", async () => {
    const previousUrl = process.env.OPENCTI_BASE_URL;
    const previousToken = process.env.OPENCTI_TOKEN;
    process.env.OPENCTI_BASE_URL = "https://opencti.example";
    process.env.OPENCTI_TOKEN = "token";
    const requests: Array<{ input: string; init?: RequestInit }> = [];
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      requests.push({ input: String(input), init });
      return new Response(JSON.stringify({
        data: {
          stixCoreObjects: {
            edges: [{ node: { id: "identity--1", standard_id: "identity--1", entity_type: "Organization", representative: { main: "Example" } } }],
            pageInfo: { globalCount: 1 },
          },
        },
      }), { status: 200 });
    };
    try {
      const adapter = createOpenCtiServiceAdapter(fetcher);
      const result = await adapter.execute({ query: "example" }, {
        missionId: "m1", userId: "u1", purpose: "defensive CTI lookup",
      });
      expect(result.data.records).toHaveLength(1);
      expect(result.data.total).toBe(1);
      expect(requests[0].input).toBe("https://opencti.example/graphql");
      expect(requests[0].init?.method).toBe("POST");
      expect(String(requests[0].init?.body)).toContain("DishaOpenCtiSearch");
      expect(String(requests[0].init?.body)).not.toContain("mutation");
    } finally {
      if (previousUrl === undefined) delete process.env.OPENCTI_BASE_URL;
      else process.env.OPENCTI_BASE_URL = previousUrl;
      if (previousToken === undefined) delete process.env.OPENCTI_TOKEN;
      else process.env.OPENCTI_TOKEN = previousToken;
    }
  });

  it("runs only allowlisted IntelOwl analyzers and normalizes RestJobSerializer reports", async () => {
    const previousUrl = process.env.INTELOWL_BASE_URL;
    const previousKey = process.env.INTELOWL_API_KEY;
    const previousAllowlist = process.env.INTELOWL_ANALYZERS_ALLOWLIST;
    process.env.INTELOWL_BASE_URL = "https://intelowl.example";
    process.env.INTELOWL_API_KEY = "key";
    process.env.INTELOWL_ANALYZERS_ALLOWLIST = "PassiveDns,Whois";
    const requests: Array<{ input: string; init?: RequestInit }> = [];
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      requests.push({ input: String(input), init });
      if (String(input).endsWith("/api/analyze_observable")) {
        return new Response(JSON.stringify({ job_id: 42, status: "accepted" }), { status: 200 });
      }
      return new Response(JSON.stringify({
        id: 42,
        status: "reported_without_fails",
        analyzer_reports: [{ name: "PassiveDns", report: { domains: ["example.com"] } }],
        data_model: { evaluation: "trusted" },
        warnings: [],
        errors: [],
      }), { status: 200 });
    };
    try {
      const adapter = createIntelOwlServiceAdapter(fetcher);
      const result = await adapter.execute({ observable: "example.com", analyzers: ["PassiveDns"] }, {
        missionId: "m2", userId: "u2", purpose: "defensive IOC enrichment",
      });
      expect(result.data).toMatchObject({ jobId: 42, status: "reported_without_fails" });
      expect(result.data.records).toHaveLength(1);
      const createBody = JSON.parse(String(requests[0].init?.body)) as Record<string, unknown>;
      expect(createBody).toMatchObject({
        observable_name: "example.com",
        analyzers_requested: ["PassiveDns"],
        connectors_requested: [],
        tlp: "CLEAR",
      });
      expect(createBody).not.toHaveProperty("playbook_requested");
      expect(createBody).not.toHaveProperty("runtime_configuration");
    } finally {
      if (previousUrl === undefined) delete process.env.INTELOWL_BASE_URL;
      else process.env.INTELOWL_BASE_URL = previousUrl;
      if (previousKey === undefined) delete process.env.INTELOWL_API_KEY;
      else process.env.INTELOWL_API_KEY = previousKey;
      if (previousAllowlist === undefined) delete process.env.INTELOWL_ANALYZERS_ALLOWLIST;
      else process.env.INTELOWL_ANALYZERS_ALLOWLIST = previousAllowlist;
    }
  });

  it("rejects non-allowlisted IntelOwl analyzers before any service request", async () => {
    const previousUrl = process.env.INTELOWL_BASE_URL;
    const previousKey = process.env.INTELOWL_API_KEY;
    const previousAllowlist = process.env.INTELOWL_ANALYZERS_ALLOWLIST;
    process.env.INTELOWL_BASE_URL = "https://intelowl.example";
    process.env.INTELOWL_API_KEY = "key";
    process.env.INTELOWL_ANALYZERS_ALLOWLIST = "PassiveDns";
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return new Response("{}", { status: 200 });
    };
    try {
      const adapter = createIntelOwlServiceAdapter(fetcher);
      await expect(adapter.execute({ observable: "example.com", analyzers: ["UnreviewedAnalyzer"] }, {
        missionId: "m3", userId: "u3", purpose: "defensive IOC enrichment",
      })).rejects.toThrow("intelowl_analyzer_not_allowlisted");
      expect(calls).toBe(0);
    } finally {
      if (previousUrl === undefined) delete process.env.INTELOWL_BASE_URL;
      else process.env.INTELOWL_BASE_URL = previousUrl;
      if (previousKey === undefined) delete process.env.INTELOWL_API_KEY;
      else process.env.INTELOWL_API_KEY = previousKey;
      if (previousAllowlist === undefined) delete process.env.INTELOWL_ANALYZERS_ALLOWLIST;
      else process.env.INTELOWL_ANALYZERS_ALLOWLIST = previousAllowlist;
    }
  });

  it("registers configured CTI service adapters on the default bus", () => {
    const ids = createDefaultOsintBus().list().map((adapter) => adapter.id);
    expect(ids).toContain("service-opencti");
    expect(ids).toContain("service-intelowl");
  });

  it("summarizes live services and ASTRA workers", () => {
    const summary = getOsintServiceConnectorSummary();
    expect(summary.total).toBe(5);
    expect(summary.astraWorkers).toBe(3);
    expect(summary.blockedByPolicy).toBe(0);
  });
});
