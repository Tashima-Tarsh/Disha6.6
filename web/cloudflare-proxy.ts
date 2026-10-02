/** Transport only. Authentication, policy, evidence and HTML belong to the origin. */
export type EdgeEnv = { DISHA_ORIGIN_URL?: string };

const proxy = {
  async fetch(request: Request, env: EdgeEnv = {}): Promise<Response> {
    const incoming = new URL(request.url);
    let origin: URL;
    try {
      origin = new URL(env.DISHA_ORIGIN_URL ?? "");
      if (origin.protocol !== "https:" || origin.origin === incoming.origin || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) throw new Error("invalid_origin");
    } catch {
      return Response.json({ error: "Production origin is not configured" }, { status: 503, headers: { "cache-control": "no-store" } });
    }
    // Assign path explicitly: a leading // must never replace the configured host.
    const upstreamUrl = new URL(origin);
    upstreamUrl.pathname = incoming.pathname;
    upstreamUrl.search = incoming.search;
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("forwarded");
    headers.set("x-forwarded-for", request.headers.get("cf-connecting-ip") ?? "unknown");
    headers.set("x-forwarded-host", incoming.host);
    headers.set("x-forwarded-proto", "https");
    headers.set("x-disha-public-origin", incoming.origin);
    try {
      const upstream = await fetch(new Request(upstreamUrl, {
        method: request.method, headers, redirect: "manual",
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
        // Node-based regression tests require duplex; Workers accepts streaming requests.
        ...(request.body ? { duplex: "half" } : {}),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(60_000)]),
      }));
      const responseHeaders = new Headers(upstream.headers);
      const location = responseHeaders.get("location");
      if (location) {
        const redirect = new URL(location, origin);
        if (redirect.origin === origin.origin) {
          redirect.protocol = incoming.protocol;
          redirect.host = incoming.host;
          responseHeaders.set("location", redirect.toString());
        }
      }
      responseHeaders.set("x-disha-edge", "cloudflare-origin-proxy");
      return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
    } catch {
      return Response.json({ error: "Production origin is unavailable" }, { status: 502, headers: { "cache-control": "no-store" } });
    }
  },
};
export default proxy;
