import { NextRequest, NextResponse } from "next/server";

import catalogueData from "@/data/osint/github-research/github_master_catalogue.json";
import localInstallStatusData from "@/data/osint/github-research/local_install_status.json";
import { withContext } from "@/lib/unified/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const catalogue = catalogueData as {
      generatedAt: string;
      safetyRule: string;
      githubSearchLimits: unknown;
      totalRepositories: number;
      catalogue: Array<unknown>;
    };
    const localInstallStatus = localInstallStatusData as unknown;

    return NextResponse.json({
      generatedAt: catalogue.generatedAt,
      safetyRule: catalogue.safetyRule,
      githubSearchLimits: catalogue.githubSearchLimits,
      totalRepositories: catalogue.totalRepositories,
      localInstallStatus,
      repositories: catalogue.catalogue,
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
