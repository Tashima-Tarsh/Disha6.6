import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createMalwareBazaarAdapter,
  createThreatFoxAdapter,
} from "../lib/unified/abusech-public-adapters";

afterEach(() => vi.unstubAllEnvs());

describe("abuse.ch defensive OSINT adapters", () => {
  it("keeps ThreatFox unconfigured without an Auth-Key", async () => {
    vi.stubEnv("THREATFOX_AUTH_KEY", "");
    const adapter = createThreatFoxAdapter(async () => new Response("{}"));
    expect(await adapter.health()).toMatchObject({ status: "not_configured" });
  });

  it("performs an exact ThreatFox IOC lookup and preserves public evidence", async () => {
    vi.stubEnv("THREATFOX_AUTH_KEY", "test-key");
    const fetcher = vi.fn(async (_input: string | URL, init: RequestInit = {}) => {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      expect(body).toEqual({ query: "search_ioc", search_term: "203.0.113.5", exact_match: true });
      expect(new Headers(init.headers).get("Auth-Key")).toBe("test-key");
      return new Response(JSON.stringify({
        query_status: "ok",
        data: [{ id: "12", ioc: "203.0.113.5:443", threat_type: "botnet_cc" }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    });

    const adapter = createThreatFoxAdapter(fetcher);
    const output = await adapter.execute(
      { value: "203.0.113.5", kind: "ioc" },
      { missionId: "m1", userId: "u1", purpose: "defensive IOC lookup" },
    );

    expect(output.data.records).toHaveLength(1);
    expect(output.data.records[0]).toMatchObject({ id: "12", threat_type: "botnet_cc" });
    expect(output.evidence[0]?.sourceName).toBe("ThreatFox");
  });

  it("does not send unsupported SHA-1 hash searches to ThreatFox", async () => {
    vi.stubEnv("THREATFOX_AUTH_KEY", "test-key");
    const fetcher = vi.fn(async () => new Response("{}"));
    const adapter = createThreatFoxAdapter(fetcher);

    const output = await adapter.execute(
      { value: "a".repeat(40), kind: "file_hash" },
      { missionId: "m1", userId: "u1", purpose: "defensive hash lookup" },
    );

    expect(fetcher).not.toHaveBeenCalled();
    expect(output.data.records).toEqual([]);
    expect(output.warnings[0]).toMatch(/MD5 and SHA-256/);
  });

  it("queries MalwareBazaar metadata by hash and never requests a sample download", async () => {
    vi.stubEnv("MALWAREBAZAAR_AUTH_KEY", "test-key");
    const hash = "b".repeat(64);
    const fetcher = vi.fn(async (_input: string | URL, init: RequestInit = {}) => {
      const form = new URLSearchParams(String(init.body));
      expect(form.get("query")).toBe("get_info");
      expect(form.get("hash")).toBe(hash);
      expect(form.get("query")).not.toBe("get_file");
      expect(new Headers(init.headers).get("Auth-Key")).toBe("test-key");
      return new Response(JSON.stringify({
        query_status: "ok",
        data: [{ sha256_hash: hash, signature: "ExampleFamily", file_type: "exe" }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    });

    const adapter = createMalwareBazaarAdapter(fetcher);
    const output = await adapter.execute(
      { hash },
      { missionId: "m1", userId: "u1", purpose: "defensive hash metadata lookup" },
    );

    expect(output.data.records).toHaveLength(1);
    expect(output.data.records[0]).toMatchObject({ signature: "ExampleFamily" });
    expect(output.evidence[0]?.summary).toMatch(/No sample was downloaded/);
  });
});
