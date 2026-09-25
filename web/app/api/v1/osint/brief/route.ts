import { NextRequest, NextResponse } from "next/server";

import { getDbPool } from "@/lib/server/db";
import { withContext } from "@/lib/unified/api";
import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";
import { getOsintSourceUniverseSummary } from "@/lib/unified/osint-source-universe";
import { runUniversalOsintSearch } from "@/lib/unified/universal-osint-search";

export const dynamic = "force-dynamic";

type NewsArticle = {
  title?: string;
  url?: string;
  domain?: string;
  language?: string;
  sourceCountry?: string;
  seenDate?: string;
};

type Vulnerability = {
  cveID?: string;
  vendorProject?: string;
  product?: string;
  vulnerabilityName?: string;
  dateAdded?: string;
  shortDescription?: string;
  requiredAction?: string;
  dueDate?: string;
  knownRansomwareCampaignUse?: string;
};

type SourceProbe = {
  sourceId?: string;
  sourceName?: string;
  owner?: string;
  domain?: string;
  url?: string;
  ok?: boolean;
  status?: number;
  contentType?: string | null;
  lastModified?: string | null;
};

const OFFICIAL_SOURCES = [
  "egazette-india",
  "cag-audit-index",
  "lgd",
  "bhuvan",
  "cert-in-vulnerability-notes",
  "rbi-dbie",
] as const;

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const query = sanitizeQuery(req.nextUrl.searchParams.get("q") ?? "India government");
    const bus = createDefaultOsintBus({
      policyCheck: (metadata) => {
        const executionClass = metadata.executionClass ?? "passive_public";
        return (executionClass === "passive_public" || executionClass === "credentialed_public_api")
          && metadata.defaultEnabled !== false;
      },
    });

    const context = {
      missionId: "live-public-brief",
      userId: ctx.principal.userId,
      purpose: "Live public-source situational awareness for the authenticated disha6.6 command workspace",
      signal: req.signal,
    };

    const [health, universal, kevResult, ...sourceResults] = await Promise.all([
      bus.health(),
      runUniversalOsintSearch(bus, query, context),
      bus.run("public-cisa-kev", { limit: 12 }, context),
      ...OFFICIAL_SOURCES.map((sourceId) =>
        bus.run("official-public-source-probe", { sourceId }, context),
      ),
    ]);

    const newsResult = universal.runs.find((run) => run.adapterId === "public-gdelt-news");
    const newsData = asRecord(newsResult?.data);
    const kevData = asRecord(kevResult.data);
    const articles = Array.isArray(newsData.articles) ? newsData.articles as NewsArticle[] : [];
    const vulnerabilities = Array.isArray(kevData.matched) ? kevData.matched as Vulnerability[] : [];
    const officialSources = sourceResults.flatMap((result) => {
      const data = asRecord(result.data) as SourceProbe;
      if (!data.sourceId) return [];
      return [{
        ...data,
        adapterStatus: result.status,
        warning: result.warnings[0] ?? result.error ?? null,
      }];
    });

    const warnings = [
      ...universal.warnings,
      ...kevResult.warnings,
      ...(kevResult.error ? [kevResult.error] : []),
      ...sourceResults.flatMap((result) => [
        ...result.warnings,
        ...(result.error ? [result.error] : []),
      ]),
    ].filter(Boolean);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      query,
      mode: getDbPool() ? "evidence-backed" : "live-unpersisted",
      persistenceAvailable: Boolean(getDbPool()),
      adapterSummary: {
        total: health.length,
        healthy: health.filter((item) => item.status === "healthy").length,
        degraded: health.filter((item) => item.status === "degraded").length,
        unavailable: health.filter((item) => item.status === "unavailable" || item.status === "not_configured").length,
      },
      health,
      sourceUniverseSummary: getOsintSourceUniverseSummary(),
      universal,
      news: {
        status: newsResult?.status ?? "failed",
        durationMs: newsResult?.durationMs ?? 0,
        evidence: newsResult?.evidence ?? [],
        articles,
      },
      vulnerabilities: {
        status: kevResult.status,
        durationMs: kevResult.durationMs,
        evidence: kevResult.evidence,
        items: vulnerabilities,
      },
      officialSources,
      warnings: [...new Set(warnings)].slice(0, 20),
      notice: getDbPool()
        ? "Live observations can be promoted into the persistent evidence plane."
        : "Live public-source observations are real but are not persisted while DATABASE_URL is unavailable.",
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}

function sanitizeQuery(value: string): string {
  const compact = value.trim().replace(/\s+/g, " ");
  if (!compact) return "India government";
  return compact.slice(0, 180);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
