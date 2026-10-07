interface Env {
  DISHA_ORIGIN?: string;
}

function configuredOrigin(env: Env): URL {
  const raw = env.DISHA_ORIGIN?.trim();
  if (!raw) throw new Error("DISHA_ORIGIN is not configured");

  const origin = new URL(raw);
  if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password) {
    throw new Error("DISHA_ORIGIN must be a credential-free HTTP(S) origin");
  }

  origin.pathname = "/";
  origin.search = "";
  origin.hash = "";
  return origin;
}

function rewriteLocation(location: string, origin: URL, publicUrl: URL): string {
  try {
    const redirectUrl = new URL(location, origin);
    if (redirectUrl.origin !== origin.origin) return location;

    redirectUrl.protocol = publicUrl.protocol;
    redirectUrl.host = publicUrl.host;
    return redirectUrl.toString();
  } catch {
    return location;
  }
}

const proxy = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const publicUrl = new URL(request.url);

    let origin: URL;
    try {
      origin = configuredOrigin(env);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Edge origin is not configured.",
          detail: error instanceof Error ? error.message : "Invalid edge origin configuration",
        }),
        {
          status: 503,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
            "x-disha-edge": "configuration-error",
          },
        },
      );
    }

    const upstreamUrl = new URL(publicUrl.pathname + publicUrl.search, origin);
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.set("x-forwarded-host", publicUrl.host);
    headers.set("x-forwarded-proto", publicUrl.protocol.replace(":", ""));
    headers.set("x-disha-public-origin", publicUrl.origin);

    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    let upstream: Response;
    try {
      upstream = await fetch(upstreamUrl, init);
    } catch {
      return new Response(
        JSON.stringify({ error: "Production origin is unavailable." }),
        {
          status: 502,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
            "x-disha-edge": "origin-unavailable",
          },
        },
      );
    }

    const responseHeaders = new Headers(upstream.headers);
    const location = responseHeaders.get("location");
    if (location) {
      responseHeaders.set("location", rewriteLocation(location, origin, publicUrl));
    }

    responseHeaders.set("x-disha-edge", "cloudflare-origin-proxy");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  },
};

export default proxy;
