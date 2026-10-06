import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { getOsintToolById } from "@/lib/unified/osint-runtime-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> },
) {
  return withContext(req, "agent:read", async (ctx) => {
    const { toolId } = await params;
    const tool = await getOsintToolById(toolId);

    if (!tool) {
      return NextResponse.json(
        { error: "not_found", message: `Upstream not found: ${toolId}` },
        { status: 404, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    return NextResponse.json({
      toolId: tool.toolId,
      name: tool.name,
      fullName: tool.fullName,
      upstreamUrl: tool.upstreamUrl,
      owner: tool.owner,
      repo: tool.repo,
      defaultBranch: tool.defaultBranch,
      pinnedSha: tool.pinnedSha,
      upstreamSha: tool.upstreamSha,
      forkUrl: tool.forkUrl,
      forkStatus: tool.forkStatus,
      license: tool.license,
      stars: tool.stars,
      isArchived: tool.isArchived,
      lastVerified: tool.lastVerified,
      status: tool.status,
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
