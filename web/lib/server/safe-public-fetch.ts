import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set(["localhost", "localhost.localdomain"]);
const DEFAULT_FETCH_TIMEOUT_MS = 12_000;

export async function safePublicFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
  return fetchPublicChecked(input, init, 0);
}

async function fetchPublicChecked(input: string | URL, init: RequestInit, redirectDepth: number): Promise<Response> {
  if (redirectDepth > 5) throw new Error("too_many_redirects");
  const url = input instanceof URL ? new URL(input.toString()) : new URL(input);
  if (url.username || url.password) throw new Error("url_credentials_blocked");
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("unsupported_url_scheme");
  if (BLOCKED_HOSTS.has(url.hostname.toLowerCase())) throw new Error("private_network_target_blocked");
  await assertPublicHost(url.hostname);

  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    redirect: "manual",
    signal: init.signal ?? AbortSignal.timeout(DEFAULT_FETCH_TIMEOUT_MS),
  });
  if (response.status >= 300 && response.status < 400) {
    if (init.redirect === "error") { await response.body?.cancel(); throw new Error("provider_redirect_blocked"); }
    const location = response.headers.get("location");
    if (!location) return response;
    const next = new URL(location, url);
    await assertPublicHost(next.hostname);
    await response.body?.cancel();
    const nextInit = { ...init };
    if (next.origin !== url.origin) {
      const headers = new Headers(init.headers);
      for (const name of ["authorization", "cookie", "x-goog-api-key", "x-subscription-token", "api-key", "x-api-key", "auth-key"]) headers.delete(name);
      nextInit.headers = headers;
    }
    return fetchPublicChecked(next, nextInit, redirectDepth + 1);
  }
  return response;
}

async function assertPublicHost(hostname: string): Promise<void> {
  const ipVersion = net.isIP(hostname);
  if (ipVersion) {
    if (isPrivateIp(hostname)) throw new Error("private_network_target_blocked");
    return;
  }
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length) throw new Error("unresolved_public_host");
  if (records.some((record) => isPrivateIp(record.address))) throw new Error("private_network_target_blocked");
}

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const normalized = ip.toLowerCase();
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("::ffff:127.") || normalized.startsWith("::ffff:10.") || normalized.startsWith("::ffff:192.168.");
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
