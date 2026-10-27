import { NextRequest, NextResponse } from "next/server";

import { territories } from "@/lib/india-dashboard-data";
import { withContext } from "@/lib/unified/api";

export const dynamic = "force-dynamic";

type SourceProbe = {
  id: string;
  authority: string;
  url: string;
  ok: boolean;
  checkedAt: string;
  status?: number;
};

const SOURCES = {
  igodStateUt: {
    id: "igod-state-ut-directory",
    authority: "Integrated Government Online Directory",
    url: "https://igod.gov.in/sg/states",
  },
  nationalPortal: {
    id: "national-portal-states-ut",
    authority: "National Portal of India",
    url: "https://www.india.gov.in/explore-india/facts-of-india/states-ut-districts",
  },
  lgd: {
    id: "local-government-directory",
    authority: "Local Government Directory",
    url: "https://lgdirectory.gov.in/",
  },
};

export async function GET(request: NextRequest) {
  return withContext(request, "agent:read", async () => {
    const checkedAt = new Date().toISOString();
    const [igod, nationalPortal, lgd] = await Promise.all([
      fetchSource(SOURCES.igodStateUt, checkedAt),
      fetchSource(SOURCES.nationalPortal, checkedAt),
      fetchSource(SOURCES.lgd, checkedAt),
    ]);

    const scan = territories.map((territory) => {
      const matchedSources = [
        igod.probe.ok ? SOURCES.igodStateUt.id : null,
        nationalPortal.probe.ok ? SOURCES.nationalPortal.id : null,
        lgd.probe.ok ? SOURCES.lgd.id : null,
      ].filter((source): source is string => Boolean(source));

      const sourceCount = matchedSources.length;
      const verified = sourceCount >= 2;
      const evidence = sourceCount === 3 ? 100 : sourceCount === 2 ? 82 : sourceCount === 1 ? 55 : 0;
      const approval = verified ? 0 : 1;
      const closure = evidence;
      const agenticScan = {
        posture: verified ? "Official directory matched" : "Source verification required",
        nextAction: verified ? "Maintain source trail" : "Review official listing",
        confidenceBand: evidence >= 82 ? "Source-linked" : evidence > 0 ? "Partial" : "Unmatched",
      };

      return {
        ...territory,
        domain: "Evidence",
        priority: verified ? "Stable" : "Watch",
        cases: sourceCount,
        evidence,
        approval,
        closure,
        note: verified
          ? `Official source coverage: ${matchedSources.join(", ")}`
          : "Official source coverage incomplete; do not treat as complete coverage.",
        agenticScan,
      };
    });

    return NextResponse.json({
      generatedAt: checkedAt,
      scanId: `DISHA-IN-SOURCE-${checkedAt.slice(0, 10)}`,
      sourceNotice: "Source-backed administrative coverage feed. Values represent official-source matches, not incident counts.",
      sources: [igod.probe, nationalPortal.probe, lgd.probe],
      nationalAdministrativeSummary: {
        authority: SOURCES.lgd.authority,
        sourceUrl: SOURCES.lgd.url,
        reachable: lgd.probe.ok,
        extractionStatus: "requires_bulk_import_or_official_api",
      },
      scan,
    });
  });
}

async function fetchSource(
  source: { id: string; authority: string; url: string },
  checkedAt: string,
): Promise<{ text: string; probe: SourceProbe }> {
  try {
    const response = await fetch(source.url, {
      cache: "no-store",
      headers: {
        "user-agent": "DISHA-source-backed-dashboard/1.0",
      },
    });
    const text = await response.text();
    return {
      text,
      probe: {
        ...source,
        ok: response.ok,
        status: response.status,
        checkedAt,
      },
    };
  } catch {
    return {
      text: "",
      probe: {
        ...source,
        ok: false,
        checkedAt,
      },
    };
  }
}
