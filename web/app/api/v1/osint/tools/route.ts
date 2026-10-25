import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { loadOsintRuntimeRegistry, type OsintToolRecord } from "@/lib/unified/osint-runtime-service";

import { getOsintBackendUrl } from "@/lib/server/osint-backend-client";

const BACKEND = getOsintBackendUrl();

export const dynamic = "force-dynamic";

// Canonical mapping between upstream toolId and backend collector exact name
const CANONICAL_BACKEND_MAP: Record<string, string> = {
  "xposedornot": "XposedOrNot breach",
  "hibp": "Pwned Password (HIBP)",
  "emailrep": "emailrep.io",
  "gravatar": "Gravatar",
  "github": "GitHub",
  "gitlab": "GitLab",
  "reddit": "Reddit",
  "keybase": "Keybase",
  "hackernews": "HackerNews",
  "npm": "npm",
  "dockerhub": "DockerHub",
  "pypi": "PyPI",
  "telegram": "Telegram",
  "holehe": "Holehe",
  "sherlock": "Sherlock",
  "maigret": "Maigret",
  "phoneinfoga": "PhoneInfoga",
  "username-candidates": "Username candidates",
  "india-phone": "India: mobile carrier+circle",
  "india-vehicle-format": "India: vehicle RC parse",
  "vahan-registry": "India: vehicle RC parse",
  "echallan": "India: vehicle RC parse",
  "india-epic": "India: EPIC validator",
  "india-pan": "India: PAN validator",
  "india-aadhaar": "India: Aadhaar validator (Verhoeff)",
  "india-breach": "India: breach corpus reference",
  "flights-india": "Live: flights over India",
  "earthquakes-india": "Live: earthquakes India",
  "active-satellites": "Live: active satellites",
  "gdelt-india": "Live: GDELT India news",
  "ip-lookup": "IP lookup (ipapi.co)",
  "ipinfo": "IP lookup (ipinfo.io)",
  "crtsh": "crt.sh certs",
  "wayback": "Wayback availability",
  "subdomain-enum": "Subdomain enum (crt.sh)",
  "dns-lookup": "DNS lookup",
  "http-headers": "HTTP headers",
  "port-scan": "Port scan (common)",
};

// Built-in verified in-process TypeScript adapters in packages/adapters
const VERIFIED_BUILTIN_ADAPTERS = new Set([
  "crtsh",
  "dns",
  "dns-lookup",
  "github-repo",
  "github-user",
  "http-headers",
  "ip-lookup",
  "rdap-domain",
  "rdap",
  "wayback",
]);

const UNIVERSE_COMPATIBLE_TOOLS: Record<string, string[]> = {
  domain: ["theharvester", "owasp-amass", "amass", "subfinder", "spiderfoot", "recon-ng", "photon", "shodan", "dns-lookup", "rdap", "crtsh", "wayback", "openosint"],
  person: ["sherlock", "maigret", "opensanctions", "opencorporates", "wikidata", "gdelt", "gravatar", "username-candidates"],
  email: ["holehe", "xposedornot", "gravatar", "emailrep"],
  phone: ["phoneinfoga", "india-phone"],
  company: ["opencorporates", "opensanctions", "sec-edgar", "wikidata"],
  vehicle: ["india-vehicle-format", "vahan-registry", "echallan"],
  cyber: ["cisa-kev", "nvd-cve", "epss", "threatfox", "malwarebazaar", "opencti", "shodan", "owasp-amass", "subfinder"],
};

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    // Probe the live FastAPI backend collector registry
    let backendTools: any[] = [];
    try {
      const res = await fetch(`${BACKEND}/tools`, {
        signal: req.signal,
        next: { revalidate: 0 },
      });
      if (res.ok) {
        const payload = await res.json();
        backendTools = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.collectors)
            ? payload.collectors
            : [];
      }
    } catch {
      backendTools = [];
    }

    const registry = await loadOsintRuntimeRegistry();
    const url = new URL(req.url);

    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status");
    const runtime = url.searchParams.get("runtime");
    const search = url.searchParams.get("search")?.toLowerCase();
    const runnableOnly = url.searchParams.get("runnable") === "true";
    const universe = url.searchParams.get("universe")?.toLowerCase();
    const limit = Math.min(600, Math.max(1, parseInt(url.searchParams.get("limit") || "100", 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));

    let filtered = registry;

    if (universe && UNIVERSE_COMPATIBLE_TOOLS[universe]) {
      const allowed = new Set(UNIVERSE_COMPATIBLE_TOOLS[universe].map((id) => id.toLowerCase()));
      filtered = filtered.filter((t: OsintToolRecord) => allowed.has(t.toolId.toLowerCase()));
    }

    if (category) {
      filtered = filtered.filter((t: OsintToolRecord) => t.category.toLowerCase() === category.toLowerCase());
    }

    if (status) {
      filtered = filtered.filter((t: OsintToolRecord) => t.status.toLowerCase() === status.toLowerCase());
    }

    if (runtime) {
      filtered = filtered.filter((t: OsintToolRecord) => t.runtimeType.toLowerCase() === runtime.toLowerCase());
    }

    if (search) {
      filtered = filtered.filter((t: OsintToolRecord) =>
        t.name.toLowerCase().includes(search) ||
        t.toolId.toLowerCase().includes(search) ||
        t.fullName.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search),
      );
    }

    const total = filtered.length;

    // Truthful runtime resolution without heuristic assumptions
    const paginated = filtered.slice(offset, offset + limit).map((t: OsintToolRecord) => {
      const toolIdLower = t.toolId.toLowerCase();
      const expectedBackendName = CANONICAL_BACKEND_MAP[toolIdLower];

      let backendMatch: any = null;
      if (expectedBackendName) {
        backendMatch = backendTools.find((b: any) => b.name === expectedBackendName);
      } else {
        // Strict exact match only
        backendMatch = backendTools.find((b: any) =>
          b.name.toLowerCase() === toolIdLower ||
          b.name.toLowerCase() === t.name.toLowerCase()
        );
      }

      let runtimeState: string = "CATALOGED";
      let selectable = false;
      let installHint: string | null = null;

      if (backendMatch) {
        if (backendMatch.status === "ready" && backendMatch.executable) {
          runtimeState = "HEALTHY (backend live)";
          selectable = true;
        } else if (backendMatch.status === "not_installed" || !backendMatch.executable) {
          runtimeState = "NOT_INSTALLED";
          selectable = false;
          installHint = backendMatch.installHint || `Binary required for ${backendMatch.name}`;
        } else {
          runtimeState = backendMatch.status || "DEGRADED";
          selectable = false;
        }
      } else if (VERIFIED_BUILTIN_ADAPTERS.has(toolIdLower)) {
        runtimeState = "ADAPTER_READY";
        selectable = true;
      } else if (t.requiresApiKey && Array.isArray(t.apiKeys) && t.apiKeys.length > 0) {
        const hasKey = t.apiKeys.some((k: string) => Boolean(process.env[k]));
        if (hasKey) {
          runtimeState = "CONFIGURED";
          selectable = true;
        } else {
          runtimeState = "AUTH_REQUIRED";
          selectable = false;
          installHint = `API key required: ${t.apiKeys.join(", ")}`;
        }
      } else if (t.status === "CONFIGURED_LIVE" || t.status === "INSTALLED") {
        runtimeState = "CONFIGURED";
        selectable = true;
      } else {
        runtimeState = t.status || "CATALOGED";
        selectable = false;
      }

      return {
        ...t,
        selectable,
        runtimeState,
        installHint,
        backendCollector: backendMatch
          ? { name: backendMatch.name, category: backendMatch.category, inputs: backendMatch.inputs, status: backendMatch.status }
          : null,
      };
    });

    const finalTools = runnableOnly ? paginated.filter((t) => t.selectable) : paginated;

    return NextResponse.json({
      total,
      limit,
      offset,
      tools: finalTools,
      backendCollectors: backendTools,
      truthfulInvariant: "Real Data or No Data. Missing tools render with UNCONFIGURED, DEGRADED, or NOT_INSTALLED. Backend live collectors return real data.",
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
