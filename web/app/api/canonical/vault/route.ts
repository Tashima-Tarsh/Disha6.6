import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withContext } from "@/lib/unified/api";
import { EvidenceVault } from "@/lib/unified/evidence-vault";

export async function GET(req: NextRequest) {
  return withContext(req, "file:read", async (ctx) => {
    const { searchParams } = new URL(req.url);
    const artifactId = searchParams.get("artifactId");
    const sourceUri = searchParams.get("sourceUri");

    if (artifactId) {
      const artifact = await EvidenceVault.getArtifact(artifactId);
      if (!artifact) {
        return NextResponse.json({ error: "artifact_not_found" }, { status: 404 });
      }
      const integrity = await EvidenceVault.verifyIntegrity(artifactId);
      return NextResponse.json(
        { artifact, integrity },
        { headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    if (sourceUri) {
      const history = await EvidenceVault.getHistory(sourceUri);
      return NextResponse.json(
        { sourceUri, versions: history, totalVersions: history.length },
        { headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    return NextResponse.json({ error: "artifactId or sourceUri query param required" }, { status: 400 });
  });
}

const storeBodySchema = z.object({
  sourceUri: z.string().min(1),
  content: z.string(),
  sourceAuthority: z.string().min(1),
  mimeType: z.string().optional(),
  retrievalMethod: z.enum(["http_get", "api", "cli_worker", "osint_stream", "manual_upload"]).optional(),
  collectorVersion: z.string().optional(),
  missionId: z.string().optional(),
  policyDecisionRef: z.string().optional(),
  accessClassification: z.enum(["public", "internal", "controlled", "classified"]).optional(),
});

export async function POST(req: NextRequest) {
  return withContext(req, "file:write", async (ctx) => {
    const body = storeBodySchema.parse(await req.json());
    const result = await EvidenceVault.store(body);

    return NextResponse.json(
      result,
      { headers: { "X-Request-ID": ctx.requestId } },
    );
  });
}
