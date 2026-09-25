const ORIGIN = "https://disha-v6-web.onrender.com";

const proxy = {
  async fetch(request: Request): Promise<Response> {
    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, ORIGIN);

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.set("x-forwarded-host", incomingUrl.host);
    headers.set("x-forwarded-proto", "https");
    headers.set("x-disha-public-origin", incomingUrl.origin);

    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    const upstream = await fetch(upstreamUrl, init);
    const responseHeaders = new Headers(upstream.headers);

    const location = responseHeaders.get("location");
    if (location) {
      try {
        const redirectUrl = new URL(location, ORIGIN);
        if (redirectUrl.origin === ORIGIN) {
          redirectUrl.protocol = incomingUrl.protocol;
          redirectUrl.host = incomingUrl.host;
          responseHeaders.set("location", redirectUrl.toString());
        }
      } catch {
        // Relative redirects already stay on the public custom domain.
      }
    }

    responseHeaders.set("x-disha-edge", "cloudflare-render-proxy");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  },
};

export default proxy;
