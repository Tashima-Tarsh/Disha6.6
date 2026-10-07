import { afterEach, describe, expect, it, vi } from "vitest";
import { createIntelOwlServiceAdapter, createOpenCtiServiceAdapter } from "../lib/unified/osint-service-connectors";

const context = { missionId: "m1", userId: "u1", purpose: "defensive research" };

afterEach(() => {
  delete process.env.OPENCTI_BASE_URL;
  delete process.env.OPENCTI_TOKEN;
  delete process.env.INTELOWL_BASE_URL;
  delete process.env.INTELOWL_API_KEY;
  delete process.env.INTELOWL_ANALYZERS;
  delete process.env.INTELOWL_ANALYZERS_ALLOWLIST;
});

describe("canonical OSINT service connectors", () => {
  it("normalizes OpenCTI stixCoreObjects search results", async () => {
    process.env.OPENCTI_BASE_URL = "https://opencti.example";
    process.env.OPENCTI_TOKEN = "token";
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (String(body.query).includes("DishaOpenCtiHealth")) {
        return new Response(JSON.stringify({ data: { about: { version: "7" } } }), { status: 200 });
      }
      return new Response(JSON.stringify({
        data: {
          stixCoreObjects: {
            edges: [{
              node: {
                id: "indicator--1",
                standard_id: "indicator--1",
                entity_type: "Indicator",
                representative: { main: "example.org", secondary: "domain-name" },
                created_at: "2026-10-07T00:00:00Z",
                updated_at: "2026-10-07T00:00:00Z",
              },
            }],
            pageInfo: { globalCount: 1 },
          },
        },
      }), { status: 200 });
    }) as unknown as typeof fetch;

    const adapter = createOpenCtiServiceAdapter(fetcher as any);
    expect((await adapter.health()).status).toBe("healthy");
    const result = await adapter.execute({ query: "example.org" }, context);
    expect(result.data.records).toHaveLength(1);
    expect(result.data.records[0]?.id).toBe("indicator--1");
  });

  it("runs only the configured IntelOwl analyzer allowlist", async () => {
    process.env.INTELOWL_BASE_URL = "https://intelowl.example";
    process.env.INTELOWL_API_KEY = "token";
    process.env.INTELOWL_ANALYZERS = "Classic_DNS,WhoIs_RipeDB_Search";
    let submitted: Record<string, unknown> | undefined;
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/jobs?limit=1") || url.includes("/api/healthcheck")) {
        return new Response(JSON.stringify({ results: [] }), { status: 200 });
      }
      if (url.endsWith("/api/analyze_observable")) {
        submitted = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        return new Response(JSON.stringify({ job_id: 42, status: "running" }), { status: 200 });
      }
      return new Response(JSON.stringify({
        id: 42,
        status: "reported_without_fails",
        analyzer_reports: [{ name: "Classic_DNS", status: "success", report: { answers: ["1.2.3.4"] } }],
      }), { status: 200 });
    }) as unknown as typeof fetch;

    const adapter = createIntelOwlServiceAdapter(fetcher as any);
    expect((await adapter.health()).status).toBe("healthy");
    const result = await adapter.execute({ observable: "example.org" }, context);
    expect(submitted?.analyzers_requested).toEqual(["Classic_DNS", "WhoIs_RipeDB_Search"]);
    expect(result.data.records[0]?.name).toBe("Classic_DNS");
  });
});
