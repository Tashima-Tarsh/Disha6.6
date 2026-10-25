import { describe, expect, it, vi } from "vitest";
import proxy, { getApprovedOrigin } from "../cloudflare-proxy";

describe("P0.1 — Cloudflare Origin and Search Integrity", () => {
  it("resolves dynamic origin from environment variables with fallback", () => {
    expect(getApprovedOrigin({ UPSTREAM_ORIGIN: "https://disha-app.internal:3000/" })).toBe(
      "https://disha-app.internal:3000"
    );
    expect(getApprovedOrigin({ DISHA_APP_ORIGIN: "https://secure.disha.gov.in" })).toBe(
      "https://secure.disha.gov.in"
    );
    expect(getApprovedOrigin({})).toBe("http://127.0.0.1:3000");
  });

  it("handles empty edge OSINT search query with HTTP 400", async () => {
    const req = new Request("http://localhost/api/v1/surveillance/osint-search", {
      method: "GET",
    });
    const res = await proxy.fetch(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Query parameter is required");
    expect(body.runs).toEqual([]);
  });

  it("never fabricates success when edge upstream DNS or CT fails", async () => {
    // Mock global fetch to simulate failure on external services
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("dns.google")) {
        return Promise.resolve(new Response("Service Unavailable", { status: 503 }));
      }
      if (urlStr.includes("crt.sh")) {
        return Promise.reject(new Error("Connection reset by peer"));
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true })));
    });

    globalThis.fetch = fetchMock;

    try {
      const req = new Request(
        "http://localhost/api/v1/surveillance/osint-search?q=failed-target.test",
        { method: "GET" }
      );
      const res = await proxy.fetch(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.executedAdapters).toEqual([
        "public-dns-google",
        "public-certificate-transparency",
      ]);
      // Neither should claim "completed" or fabricate evidence
      const dnsRun = data.runs.find((r: any) => r.adapterId === "public-dns-google");
      const ctRun = data.runs.find((r: any) => r.adapterId === "public-certificate-transparency");

      expect(dnsRun.status).toBe("failed");
      expect(dnsRun.evidenceCount).toBe(0);
      expect(ctRun.status).toBe("failed");
      expect(ctRun.evidenceCount).toBe(0);
      expect(data.healthSummary.healthy).toBe(0);
      expect(data.healthSummary.failed).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("accurately reports successful DNS and CT records when real results exist", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("dns.google")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              Answer: [{ name: "example.com.", type: 1, TTL: 300, data: "93.184.216.34" }],
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          )
        );
      }
      if (urlStr.includes("crt.sh")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { issuer_name: "DigiCert", common_name: "example.com", name_value: "example.com" },
            ]),
            { status: 200, headers: { "content-type": "application/json" } }
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true })));
    });

    globalThis.fetch = fetchMock;

    try {
      const req = new Request(
        "http://localhost/api/v1/surveillance/osint-search?q=example.com",
        { method: "GET" }
      );
      const res = await proxy.fetch(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      const dnsRun = data.runs.find((r: any) => r.adapterId === "public-dns-google");
      const ctRun = data.runs.find((r: any) => r.adapterId === "public-certificate-transparency");

      expect(dnsRun.status).toBe("completed");
      expect(dnsRun.evidenceCount).toBe(1);
      expect(ctRun.status).toBe("completed");
      expect(ctRun.evidenceCount).toBe(1);
      expect(data.healthSummary.healthy).toBe(2);
      expect(data.healthSummary.failed).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
