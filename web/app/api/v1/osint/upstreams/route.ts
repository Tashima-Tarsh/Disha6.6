import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { loadOsintRegistry, type OsintToolRecord } from "@/lib/unified/osint-runtime-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const registry = await loadOsintRegistry();

    const upstreams = registry.map((t: OsintToolRecord) => ({
      toolId: t.toolId,
      name: t.name,
      fullName: t.fullName,
      upstreamUrl: t.upstreamUrl,
      owner: t.owner,
      repo: t.repo,
      defaultBranch: t.defaultBranch,
      pinnedSha: t.pinnedSha,
      upstreamSha: t.upstreamSha,
      forkUrl: t.forkUrl,
      forkStatus: t.forkStatus,
      license: t.license,
      stars: t.stars,
      isArchived: t.isArchived,
      lastVerified: t.lastVerified,
      status: t.status,
    }));

    return NextResponse.json({
      total: upstreams.length,
      organization: "Tashima-Tarsh",
      upstreams,
      truthfulInvariant: "Real Data or No Data. Fork status reflects real GitHub repositories without synthetic URLs.",
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
