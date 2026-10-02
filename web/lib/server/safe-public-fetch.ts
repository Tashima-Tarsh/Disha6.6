import dns from "node:dns/promises";
import { Agent } from "undici";
import ipaddr from "ipaddr.js";

const MAX_BYTES = 10 * 1024 * 1024;
export function isPublicAddress(address: string): boolean {
  try { return ipaddr.process(address.replace(/^\[|\]$/g, "")).range() === "unicast"; }
  catch { return false; }
}

/** Resolve once, reject private ranges, and pin the approved addresses at connection time. */
export async function safePublicFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
  const signal = AbortSignal.any([...(init.signal ? [init.signal] : []), AbortSignal.timeout(12_000)]);
  let url = new URL(input);
  let headers = new Headers(init.headers);
  let method = (init.method ?? "GET").toUpperCase();
  let body = init.body;
  for (let depth = 0; depth <= 5; depth++) {
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("unsupported_public_url");
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const records = await new Promise<{ address: string; family: number }[]>((resolve, reject) => {
      const abort = () => reject(signal.reason);
      signal.throwIfAborted();
      signal.addEventListener("abort", abort, { once: true });
      dns.lookup(hostname, { all: true, verbatim: true }).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
    });
    if (!records.length || records.some((record) => !isPublicAddress(record.address))) throw new Error("private_network_target_blocked");
    signal.throwIfAborted();
    const dispatcher = new Agent({ connect: {
      lookup: (_host, options, callback) => {
        if (options.all) callback(null, records);
        else callback(null, records[0].address, records[0].family);
      },
    } });
    try {
      const response = await fetch(url, { ...init, method, body, headers, redirect: "manual", signal, dispatcher } as RequestInit);
      if (response.status >= 300 && response.status < 400 && response.headers.has("location")) {
        await response.body?.cancel();
        const next = new URL(response.headers.get("location")!, url);
        if (next.origin !== url.origin) {
          headers = new Headers(headers);
          for (const key of ["authorization", "cookie", "proxy-authorization", "x-api-key"]) headers.delete(key);
        }
        if (response.status === 303 || ((response.status === 301 || response.status === 302) && method === "POST")) {
          method = "GET"; body = undefined; headers.delete("content-type"); headers.delete("content-length");
        }
        url = next;
        continue;
      }
      if (Number(response.headers.get("content-length")) > MAX_BYTES) {
        await response.body?.cancel(); throw new Error("public_response_too_large");
      }
      const chunks: Uint8Array[] = []; let size = 0;
      const reader = response.body?.getReader();
      if (reader) {
        try {
          for (;;) {
            const { done, value } = await reader.read(); if (done) break;
            size += value.byteLength;
            if (size > MAX_BYTES) { await reader.cancel(); throw new Error("public_response_too_large"); }
            chunks.push(value);
          }
        } finally { reader.releaseLock(); }
      }
      const outputHeaders = new Headers(response.headers);
      outputHeaders.delete("content-encoding"); outputHeaders.delete("content-length");
      return new Response([204, 205, 304].includes(response.status) || method === "HEAD" ? null : Buffer.concat(chunks), { status: response.status, statusText: response.statusText, headers: outputHeaders });
    } finally { await dispatcher.close(); }
  }
  throw new Error("too_many_redirects");
}
