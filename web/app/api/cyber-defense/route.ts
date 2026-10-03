import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withContext } from "@/lib/unified/api";
import { getDbPool } from "@/lib/server/db";
import {
  scanCodeForSecretExposure,
  generateLookAlikeDomains,
  computeVulnerabilityRisk,
} from "@/lib/unified/cyber-defense-engine";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const pool = getDbPool();

    // Query persisted attack surface assets
    let assets: unknown[] = [];
    let vulnerabilities: unknown[] = [];
    let indicators: unknown[] = [];

    try {
      const assetRes = await pool.query(
        "select * from disha_attack_surface_assets order by last_seen_at desc limit 50",
      );
      assets = assetRes.rows;

      const vulnRes = await pool.query(
        "select * from disha_vulnerabilities_kev order by published_date desc limit 50",
      );
      vulnerabilities = vulnRes.rows;

      const indRes = await pool.query(
        "select * from disha_threat_indicators order by observed_at desc limit 50",
      );
      indicators = indRes.rows;
    } catch {
      // In unmigrated dev environments, fall back to empty arrays
    }

    return NextResponse.json(
      {
        assets,
        vulnerabilities,
        indicators,
        stats: {
          totalAssets: assets.length,
          totalVulnerabilities: vulnerabilities.length,
          totalIndicators: indicators.length,
        },
      },
      { headers: { "X-Request-ID": ctx.requestId } },
    );
  });
}

const analyzeBodySchema = z.object({
  domain: z.string().optional(),
  contentToScan: z.string().optional(),
  sourcePath: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = analyzeBodySchema.parse(await req.json());

    const lookAlikes = body.domain ? generateLookAlikeDomains(body.domain) : [];
    const secretFindings =
      body.contentToScan && body.sourcePath
        ? scanCodeForSecretExposure(body.contentToScan, body.sourcePath)
        : [];

    return NextResponse.json(
      {
        lookAlikes,
        secretFindings,
      },
      { headers: { "X-Request-ID": ctx.requestId } },
    );
  });
}
