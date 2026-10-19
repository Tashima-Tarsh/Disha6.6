import { createDefaultOsintBus } from "../../lib/unified/osint-default-bus";
import { buildAdapterEvidence, type AdapterExecutionResult } from "../../lib/unified/osint-adapter-bus";
import { safePublicFetch } from "../../lib/server/safe-public-fetch";
import type { AdapterPlan } from "../../lib/investigation/types";
import { record, text } from "./normalize";

async function providerJson(url: URL, init: RequestInit): Promise<unknown> {
  // URLs are constructed from fixed provider origins; no target URL is fetched.
  const response = await safePublicFetch(url, { ...init, cache: "no-store", redirect: "error" });
  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("provider_empty_body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 3 * 1024 * 1024) throw new Error("provider_response_too_large");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
export async function executeProvider(plan: AdapterPlan, userId: string, investigationId: string, signal: AbortSignal, _image?: Buffer | null): Promise<AdapterExecutionResult<unknown>> {
  const started = Date.now();
  const base = { signal, headers: { accept: "application/json" } };
  let rows: Record<string, unknown>[];
  let sourceUrl: string;
  let health: string | undefined;
  if (plan.adapterId === "passive-shodan") {
    const key = process.env.SHODAN_API_KEY;
    if (!key) return missing(plan.adapterId);
    const infoUrl = new URL("https://api.shodan.io/api-info");
    infoUrl.searchParams.set("key", key);
    const info = record(await providerJson(infoUrl, base));
    const target = String(plan.input.target);
    const ip = plan.input.type === "ip";
    if (!ip && (typeof info.query_credits !== "number" || info.query_credits < 1)) throw new Error("provider_query_credits_exhausted");
    const url = new URL(ip ? `https://api.shodan.io/shodan/host/${encodeURIComponent(target)}` : "https://api.shodan.io/shodan/host/search");
    url.searchParams.set("key", key);
    if (!ip) url.searchParams.set("query", plan.input.type === "asn" ? `asn:${target}` : `hostname:${target}`);
    const body = record(await providerJson(url, base));
    // Keep provider fields; never include key-bearing request URLs in evidence.
    rows = ip ? (text(body.ip_str) ? [body] : []) : (Array.isArray(body.matches) ? body.matches.map(record).slice(0, 50) : []);
    rows = rows.map(row => ({ ...shodanFields(row), sourceUrl: typeof row.ip_str === "string" ? `https://www.shodan.io/host/${encodeURIComponent(row.ip_str)}` : "https://www.shodan.io/" }));
    sourceUrl = "https://www.shodan.io/";
    health = "REST_HEALTHY";
  } else if (plan.adapterId === "public-brave-search") {
    const key = process.env.BRAVE_SEARCH_API_KEY;
    if (!key) return missing(plan.adapterId);
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", String(plan.input.query));
    url.searchParams.set("count", "15");
    const body = record(await providerJson(url, { signal, headers: { accept: "application/json", "X-Subscription-Token": key } }));
    const web = record(body.web);
    rows = Array.isArray(web.results) ? web.results.map(record).map(row => ({ title: row.title, url: row.url, description: row.description })) : [];
    sourceUrl = "https://search.brave.com/";
  } else {
    return createDefaultOsintBus().run(plan.adapterId, plan.input, {
      userId,
      missionId: investigationId,
      purpose: "Ephemeral public-source investigation",
      identityAuthorization: plan.input.identityAuthorization === true,
      activeAuthorization: plan.input.activeAuthorization === true,
      signal,
    });
  }
  return { adapterId: plan.adapterId, status: "completed", data: { records: rows, providerHealth: health }, evidence: [buildAdapterEvidence({ sourceId: plan.adapterId, sourceName: plan.sourceName, sourceUrl, summary: `${rows.length} provider records returned` })], warnings: [], attempts: 1, durationMs: Date.now() - started };
}
function missing(adapterId: string): AdapterExecutionResult<unknown> {
  return { adapterId, status: "failed", evidence: [], warnings: [], attempts: 0, durationMs: 0, error: "not_configured" };
}

function shodanFields(row: Record<string, unknown>): Record<string, unknown> {
  const allowed = ["ip_str", "hostnames", "domains", "org", "isp", "asn", "ports", "last_update", "timestamp", "port", "transport", "product", "version", "os", "location"];
  const fields = Object.fromEntries(allowed.filter(key => row[key] !== undefined).map(key => [key, row[key]]));
  if (Array.isArray(row.data)) fields.services = row.data.slice(0, 100).map(service => { const value = record(service); return Object.fromEntries(["port", "transport", "product", "version", "timestamp"].filter(key => value[key] !== undefined).map(key => [key, value[key]])); });
  return fields;
}
