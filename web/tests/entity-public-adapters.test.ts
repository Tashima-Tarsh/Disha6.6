import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createOpenCorporatesAdapter,
  createOpenSanctionsAdapter,
} from "../lib/unified/entity-public-adapters";

afterEach(() => vi.unstubAllEnvs());

describe("public entity OSINT adapters", () => {
  it("keeps OpenSanctions unconfigured without an API key", async () => {
    vi.stubEnv("OPENSANCTIONS_API_KEY", "");
    const adapter = createOpenSanctionsAdapter(async () => new Response("{}"));
    expect(await adapter.health()).toMatchObject({ status: "not_configured" });
  });

  it("searches OpenSanctions without treating search rank as identity confidence", async () => {
    vi.stubEnv("OPENSANCTIONS_API_KEY", "test-key");
    const fetcher = vi.fn(async (input: string | URL, init: RequestInit = {}) => {
      const url = new URL(input.toString());
      expect(url.pathname).toBe("/search/default");
      expect(url.searchParams.get("q")).toBe("Example Person");
      expect(url.searchParams.get("schema")).toBe("Person");
      expect(new Headers(init.headers).get("authorization")).toBe("ApiKey test-key");
      return new Response(JSON.stringify({
        results: [{ id: "entity-1", caption: "Example Person", schema: "Person", score: 4.2 }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    });

    const adapter = createOpenSanctionsAdapter(fetcher);
    const output = await adapter.execute(
      { query: "Example Person", schema: "Person" },
      { missionId: "m1", userId: "u1", purpose: "public entity discovery" },
    );

    expect(output.data.records).toHaveLength(1);
    expect(output.data.records[0]).toMatchObject({ id: "entity-1", schema: "Person" });
    expect(output.warnings[0]).toMatch(/not proof/i);
  });

  it("uses the OpenCorporates company endpoint and never exposes the API token in evidence", async () => {
    vi.stubEnv("OPENCORPORATES_API_TOKEN", "secret-token");
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = new URL(input.toString());
      expect(url.pathname).toBe("/v0.4/companies/search");
      expect(url.searchParams.get("q")).toBe("Example Ltd");
      expect(url.searchParams.get("api_token")).toBe("secret-token");
      return new Response(JSON.stringify({
        results: {
          companies: [{
            company: {
              name: "Example Ltd",
              company_number: "123456",
              jurisdiction_code: "gb",
              opencorporates_url: "https://opencorporates.com/companies/gb/123456",
            },
          }],
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    });

    const adapter = createOpenCorporatesAdapter(fetcher);
    const output = await adapter.execute(
      { query: "Example Ltd", kind: "company" },
      { missionId: "m1", userId: "u1", purpose: "public company discovery" },
    );

    expect(output.data.records[0]).toMatchObject({ company_number: "123456", jurisdiction_code: "gb" });
    expect(output.evidence[0]?.sourceUrl).toBe("https://opencorporates.com/");
    expect(JSON.stringify(output.evidence)).not.toContain("secret-token");
  });

  it("uses the OpenCorporates officer endpoint for name investigations", async () => {
    vi.stubEnv("OPENCORPORATES_API_TOKEN", "test-token");
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = new URL(input.toString());
      expect(url.pathname).toBe("/v0.4/officers/search");
      return new Response(JSON.stringify({
        results: {
          officers: [{
            officer: {
              id: 42,
              name: "Example Person",
              position: "director",
              company: { name: "Example Ltd", company_number: "123456" },
            },
          }],
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    });

    const adapter = createOpenCorporatesAdapter(fetcher);
    const output = await adapter.execute(
      { query: "Example Person", kind: "officer" },
      { missionId: "m1", userId: "u1", purpose: "public officer discovery" },
    );

    expect(output.data.records[0]).toMatchObject({ name: "Example Person", position: "director" });
  });
});
