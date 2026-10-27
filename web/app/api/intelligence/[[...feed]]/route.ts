import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/server/env";
import { requirePrincipal } from "@/lib/server/auth";

/**
 * Server-side proxy for OSIRIS intelligence feeds.
 *
 * Only a fixed, hard-coded allowlist of upstream paths is proxied. The
 * upstream host is fixed (OSIRIS_BASE_URL, default http://127.0.0.1:3005) and
 * is never derived from user input, so there is no SSRF surface. This is the
 * governed path through which DISHA surfaces real OSIRIS observations
 * (flights, earthquakes, fires, CCTV, maritime, satellites, weather, news,
 * GDELT, OSINT) to the intelligence map and analysis panel.
 *
 * Requests are authenticated via DISHA's session cookie (requirePrincipal).
 */

const OSIRIS_BASE_URL = getEnv().OSIRIS_BASE_URL ?? "http://127.0.0.1:3005";

const ALLOWED_FEEDS = new Set([
  "flights",
  "earthquakes",
  "fires",
  "maritime",
  "satellites",
  "weather",
  "cctv",
  "news",
  "gdelt",
  "gdelt-events",
  "osint",
  "stats",
  "health",
  "scanner",
  "aircraft",
]);

function isAllowed(path: string): boolean {
  const top = path.split("/")[0] ?? "";
  return ALLOWED_FEEDS.has(top) && !path.includes("..");
}

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feed: string[] }> },
) {
  const principal = await requirePrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const { feed } = await params;
  const feedPath = Array.isArray(feed) ? feed.join("/") : (feed ?? "");
  if (!feedPath || !isAllowed(feedPath)) {
    return NextResponse.json({ error: "feed_not_available" }, { status: 404 });
  }

  const url = new URL(`/api/${feedPath}`, OSIRIS_BASE_URL);
  url.search = request.nextUrl.search;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const upstream = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json, */*",
        "X-Request-ID": principal.userId,
        "X-Forwarded-For": "127.0.0.1",
        "X-Forwarded-Host": request.nextUrl.host,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const body = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "application/json";
    return new NextResponse(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: {
        "content-type": contentType,
        "access-control-allow-origin": request.nextUrl.origin,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "upstream_unavailable", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ feed: string[] }> },
) {
  const principal = await requirePrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const { feed } = await params;
  const feedPath = Array.isArray(feed) ? feed.join("/") : (feed ?? "");
  if (!feedPath || !isAllowed(feedPath)) {
    return NextResponse.json({ error: "feed_not_available" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, feed: feedPath }, { status: 200 });
}
