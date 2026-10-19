import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withContext } from "@/lib/unified/api";
import { forensicCaseEvidence } from "@/lib/unified/forensic-case-evidence";

const fieldsSchema = z.object({
  acquisitionMethod: z.string().min(3).max(300),
  sourceDescription: z.string().min(3).max(2000),
  authorizationScope: z.string().min(8).max(2000),
  acquiredAt: z.string().datetime().optional(),
  metadata: z.string().optional(),
});

export async function GET(req: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  return withContext(req, "file:read", async (ctx) => {
    const { caseId } = await context.params;
    const evidence = await forensicCaseEvidence.listEvidence(caseId, ctx);
    return NextResponse.json(
      { caseId, evidence, count: evidence.length },
      { headers: { "X-Request-ID": ctx.requestId } },
    );
  });
}

export async function POST(req: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  return withContext(req, "file:write", async (ctx) => {
    const { caseId } = await context.params;
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "multipart field 'file' is required" }, { status: 400 });
    }
    const parsed = fieldsSchema.parse({
      acquisitionMethod: form.get("acquisitionMethod"),
      sourceDescription: form.get("sourceDescription"),
      authorizationScope: form.get("authorizationScope"),
      acquiredAt: form.get("acquiredAt") || undefined,
      metadata: form.get("metadata") || undefined,
    });
    let metadata: Record<string, unknown> = {};
    if (parsed.metadata) {
      try {
        const candidate = JSON.parse(parsed.metadata) as unknown;
        if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
          return NextResponse.json({ error: "metadata must be a JSON object" }, { status: 400 });
        }
        metadata = candidate as Record<string, unknown>;
      } catch {
        return NextResponse.json({ error: "metadata must be valid JSON" }, { status: 400 });
      }
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await forensicCaseEvidence.ingestEvidence({
      caseId,
      originalFilename: file.name || "evidence.bin",
      mimeType: file.type || "application/octet-stream",
      bytes,
      acquisitionMethod: parsed.acquisitionMethod,
      sourceDescription: parsed.sourceDescription,
      authorizationScope: parsed.authorizationScope,
      acquiredAt: parsed.acquiredAt,
      metadata,
    }, ctx);

    bytes.fill(0);

    return NextResponse.json(
      result,
      { status: result.duplicate ? 200 : 201, headers: { "X-Request-ID": ctx.requestId } },
    );
  });
}
