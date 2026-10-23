import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { loadOsintRuntimeRegistry, type OsintToolRecord } from "@/lib/unified/osint-runtime-service";

const BACKEND = process.env.NEXT_PUBLIC_OSINT_BACKEND ?? "http://localhost:8000";

export const dynamic = "force-dynamic";

const RUNNABLE_TOOL_IDS = new Set([
  "theharvester", "owasp-amass", "amass", "subfinder", "spiderfoot", "sherlock", "maigret",
  "holehe", "phoneinfoga", "recon-ng", "photon", "instaloader", "telegram-public",
  "opencti", "intelowl", "shodan", "dns-google", "rdap", "cisa-kev", "nvd-cve", "epss",
  "sec-edgar", "noaa-space-weather", "ripestat-whois", "celestrak-gp", "opensanctions",
  "opencorporates", "wikidata", "openalex", "reliefweb", "threatfox", "malwarebazaar",
  "wayback", "common-crawl", "gdelt", "brave-search", "github-repository",
  "india-vehicle-format", "vahan-registry", "echallan", "certificate-transparency",
  "openosint", "openosint-dns", "openosint-rdap", "openosint-whois", "openosint-dorks", "openosint-ip", "openosint-github", "openosint-breach",
  "xposedornot", "hibp", "gravatar", "github", "gitlab", "reddit", "keybase",
  "hackernews", "npm", "dockerhub", "pypi", "telegram",
]);

const UNIVERSE_COMPATIBLE_TOOLS: Record<string, string[]> = {
  domain: ["theharvester", "owasp-amass", "amass", "subfinder", "spiderfoot", "recon-ng", "photon", "shodan", "dns-google", "rdap", "certificate-transparency", "wayback", "common-crawl", "gdelt", "brave-search", "openosint", "openosint-dns", "openosint-rdap", "openosint-whois", "openosint-dorks"],
  person: ["sherlock", "maigret", "opensanctions", "opencorporates", "wikidata", "gdelt", "brave-search", "instaloader", "telegram-public", "openosint-dorks", "openosint-github"],
  email: ["holehe", "gdelt", "brave-search", "openosint-breach", "xposedornot", "gravatar"],
  phone: ["phoneinfoga", "gdelt", "brave-search"],
  company: ["opencorporates", "opensanctions", "sec-edgar", "wikidata", "gdelt", "brave-search"],
  location: ["reliefweb", "wikidata", "gdelt", "brave-search"],
  vehicle: ["india-vehicle-format", "vahan-registry", "echallan"],
  cyber: ["cisa-kev", "nvd-cve", "epss", "threatfox", "malwarebazaar", "opencti", "intelowl", "shodan", "owasp-amass", "subfinder", "openosint", "openosint-ip", "openosint-dns", "openosint-rdap"],
  government: ["cisa-kev", "nvd-cve", "sec-edgar", "noaa-space-weather", "india-vehicle-format", "vahan-registry", "echallan", "opensanctions", "wikidata"],
  document: ["openalex", "wikidata", "gdelt", "brave-search"],
  osint: Array.from(RUNNABLE_TOOL_IDS),
  universal: Array.from(RUNNABLE_TOOL_IDS),
};

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    // Merge the Disha runtime registry with the live FastAPI backend collector registry.
    let backendTools: any[] = [];
    try {
      const res = await fetch(`${BACKEND}/tools`, { signal: req.signal });
      if (res.ok) {
        const parsed: unknown = await res.json();
        backendTools = Array.isArray(parsed) ? parsed : [];
      }
    } catch { backendTools = []; }

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

    if (runnableOnly) {
      filtered = filtered.filter((t: OsintToolRecord) => RUNNABLE_TOOL_IDS.has(t.toolId.toLowerCase()));
    }

    if (universe && UNIVERSE_COMPATIBLE_TOOLS[universe]) {
      const allowed = new Set(UNIVERSE_COMPATIBLE_TOOLS[universe].map(id => id.toLowerCase()));
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

    // Only verified runtime evidence qualifies as runnable; a static tool ID allowlist is insufficient.
    if (runnableOnly) filtered = filtered.filter((t: OsintToolRecord) => Boolean(t.lastSmokeTested && t.smokeResult?.success === true));
    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit).map((t: OsintToolRecord) => {
      const isRunnable = RUNNABLE_TOOL_IDS.has(t.toolId.toLowerCase());
      const backendMatch = backendTools.find((b: unknown) => {
        if (!b || typeof b !== "object") return false;
        const candidate = b as { id?: unknown; name?: unknown };
        const identifier = typeof candidate.id === "string" ? candidate.id : candidate.name;
        return typeof identifier === "string" && identifier.toLowerCase() === t.toolId.toLowerCase();
      }) as { id?: string; name?: string; category?: string; inputs?: unknown } | undefined;
      const verifiedExecution = Boolean(t.lastSmokeTested && t.smokeResult?.success === true)
        && !["DATASET_ONLY", "LIBRARY_ONLY", "GUI_ONLY", "REFERENCE_ONLY", "POLICY_RESTRICTED"].includes(t.status);
      let runtimeState = t.status || "CATALOGED";
      if (t.healthStatus === "REST_HEALTHY" || t.healthStatus === "STREAM_HEALTHY") {
        runtimeState = "HEALTHY";
      } else if (t.status === "CONFIGURED_LIVE" || t.status === "INSTALLED") {
        runtimeState = "CONFIGURED";
      } else if (t.status === "AUTH_REQUIRED") {
        runtimeState = "AUTH_REQUIRED";
      } else if (t.status === "UNCONFIGURED" && !isRunnable) {
        runtimeState = "CATALOGED";
      }
      // A backend collector advertisement is discovery, not a health check or smoke pass.

      return {
        ...t,
        selectable: verifiedExecution && isRunnable,
        runtimeState,
        backendCollector: backendMatch ? { name: backendMatch.name, category: backendMatch.category, inputs: backendMatch.inputs, status: "ADVERTISED_UNVERIFIED" } : null,
      };
    });

    return NextResponse.json({
      total,
      limit,
      offset,
      tools: paginated,
      backendCollectors: backendTools,
      truthfulInvariant: "Real Data or No Data. Missing tools render with UNCONFIGURED, DEGRADED, or REFERENCE_ONLY. Backend live collectors return real data.",
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
