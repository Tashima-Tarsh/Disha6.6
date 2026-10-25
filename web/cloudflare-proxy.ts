/**
 * DISHA 6.6 — Cloudflare Edge Proxy & Origin Routing
 * 
 * Constitutional Edge Router ensuring:
 * - Dynamic upstream origin binding via environment / secrets
 * - Preservation of headers, cookies, redirects and security context
 * - Zero fabricated telemetry or synthetic success claims on edge queries
 * - Full CSP and security policy preservation without fragile HTML injection
 */

export interface CloudflareEnv {
  UPSTREAM_ORIGIN?: string;
  DISHA_APP_ORIGIN?: string;
  NEXT_PUBLIC_APP_URL?: string;
  [key: string]: string | undefined;
}

export function getApprovedOrigin(env?: CloudflareEnv): string {
  const origin =
    env?.UPSTREAM_ORIGIN ||
    env?.DISHA_APP_ORIGIN ||
    env?.NEXT_PUBLIC_APP_URL ||
    (typeof process !== "undefined" &&
      (process.env?.UPSTREAM_ORIGIN ||
        process.env?.DISHA_APP_ORIGIN ||
        process.env?.NEXT_PUBLIC_APP_URL)) ||
    "http://127.0.0.1:3000";

  return origin.replace(/\/+$/, "");
}

export interface EdgeOsintRunResult {
  adapterId: string;
  status: "completed" | "partial" | "failed";
  durationMs: number;
  evidenceCount: number;
  sample: string;
}

const proxy = {
  async fetch(request: Request, env?: CloudflareEnv): Promise<Response> {
    const origin = getApprovedOrigin(env);
    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, origin);

    // 1. Edge-native OSINT search handler (real public queries without synthetic telemetry)
    if (incomingUrl.pathname === "/api/v1/surveillance/osint-search") {
      const q = incomingUrl.searchParams.get("q") ?? incomingUrl.searchParams.get("query") ?? "";
      const targetQuery = q.trim();

      if (!targetQuery) {
        return new Response(
          JSON.stringify({
            generatedAt: new Date().toISOString(),
            query: "",
            error: "Query parameter is required",
            executedAdapters: [],
            runs: [],
            healthSummary: { total: 0, healthy: 0, failed: 0 },
          }),
          {
            status: 400,
            headers: {
              "content-type": "application/json",
              "x-disha-edge": "cloudflare-edge-proxy",
            },
          }
        );
      }

      const dnsStart = Date.now();
      const dnsPromise: Promise<EdgeOsintRunResult> = fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(targetQuery)}&type=A`,
        {
          headers: { Accept: "application/dns-json" },
          signal: AbortSignal.timeout(5000),
        }
      )
        .then(async (r) => {
          const durationMs = Date.now() - dnsStart;
          if (!r.ok) {
            return {
              adapterId: "public-dns-google",
              status: "failed" as const,
              durationMs,
              evidenceCount: 0,
              sample: `DNS query failed with HTTP ${r.status}`,
            };
          }
          const data = (await r.json()) as { Answer?: unknown[] };
          const count = data.Answer?.length ?? 0;
          return {
            adapterId: "public-dns-google",
            status: count > 0 ? ("completed" as const) : ("partial" as const),
            durationMs,
            evidenceCount: count > 0 ? 1 : 0,
            sample:
              count > 0
                ? `A lookup returned ${count} public DNS answer(s) for ${targetQuery}.`
                : `No public DNS A-records found for ${targetQuery}.`,
          };
        })
        .catch((err: unknown) => ({
          adapterId: "public-dns-google",
          status: "failed" as const,
          durationMs: Date.now() - dnsStart,
          evidenceCount: 0,
          sample: `DNS query error: ${err instanceof Error ? err.message : String(err)}`,
        }));

      const ctStart = Date.now();
      const ctPromise: Promise<EdgeOsintRunResult> = fetch(
        `https://crt.sh/?q=${encodeURIComponent(targetQuery)}&output=json`,
        {
          signal: AbortSignal.timeout(8000),
        }
      )
        .then(async (r) => {
          const durationMs = Date.now() - ctStart;
          if (!r.ok) {
            return {
              adapterId: "public-certificate-transparency",
              status: "failed" as const,
              durationMs,
              evidenceCount: 0,
              sample: `Certificate transparency query returned HTTP ${r.status}`,
            };
          }
          const list = (await r.json()) as unknown[];
          const count = Array.isArray(list) ? list.length : 0;
          return {
            adapterId: "public-certificate-transparency",
            status: count > 0 ? ("completed" as const) : ("partial" as const),
            durationMs,
            evidenceCount: count > 0 ? 1 : 0,
            sample:
              count > 0
                ? `Public CT query returned ${count} certificate record(s) for ${targetQuery}.`
                : `No public certificate transparency records found for ${targetQuery}.`,
          };
        })
        .catch((err: unknown) => ({
          adapterId: "public-certificate-transparency",
          status: "failed" as const,
          durationMs: Date.now() - ctStart,
          evidenceCount: 0,
          sample: `Certificate transparency error: ${err instanceof Error ? err.message : String(err)}`,
        }));

      const runs = await Promise.all([dnsPromise, ctPromise]);
      const healthyCount = runs.filter((r) => r.status === "completed").length;
      const failedCount = runs.filter((r) => r.status === "failed").length;

      return new Response(
        JSON.stringify({
          generatedAt: new Date().toISOString(),
          query: targetQuery,
          kind: "domain",
          executedAdapters: ["public-dns-google", "public-certificate-transparency"],
          runs,
          healthSummary: {
            total: runs.length,
            healthy: healthyCount,
            failed: failedCount,
          },
        }),
        {
          headers: {
            "content-type": "application/json",
            "x-disha-edge": "cloudflare-edge-proxy",
            "access-control-allow-origin": "*",
          },
        }
      );
    }

    // 2. Upstream Proxy Dispatch
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.set("x-forwarded-host", incomingUrl.host);
    headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));
    headers.set("x-disha-public-origin", incomingUrl.origin);

    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    try {
      const upstream = await fetch(upstreamUrl, init);
      const responseHeaders = new Headers(upstream.headers);

      // Rewrite upstream redirect location back to public domain if matching origin
      const location = responseHeaders.get("location");
      if (location) {
        try {
          const redirectUrl = new URL(location, origin);
          if (redirectUrl.origin === origin) {
            redirectUrl.protocol = incomingUrl.protocol;
            redirectUrl.host = incomingUrl.host;
            responseHeaders.set("location", redirectUrl.toString());
          }
        } catch {
          // Relative redirects already remain on custom public domain
        }
      }

      responseHeaders.set("x-disha-edge", "cloudflare-edge-proxy");

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      });
    } catch (err: unknown) {
      return new Response(
        JSON.stringify({
          error: "Upstream origin connection failed",
          detail: err instanceof Error ? err.message : String(err),
          origin,
        }),
        {
          status: 502,
          headers: {
            "content-type": "application/json",
            "x-disha-edge": "cloudflare-edge-proxy",
          },
        }
      );
    }
  },
};

export default proxy;
