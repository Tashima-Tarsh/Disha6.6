import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withContext } from "@/lib/unified/api";
import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";
import { runUniversalOsintSearch, sanitizeUniversalQuery } from "@/lib/unified/universal-osint-search";
import { audit } from "@/lib/server/audit";
import type { RequestContext } from "@/lib/server/types";

export const dynamic = "force-dynamic";
const querySchema = z.string().trim().min(1).max(512);
async function execute(req: NextRequest, ctx: RequestContext, raw: unknown) {
  const query = sanitizeUniversalQuery(querySchema.parse(raw));
  const bus = createDefaultOsintBus({ policyCheck: (metadata) =>
    ["passive_public", "credentialed_public_api"].includes(metadata.executionClass ?? "passive_public") && metadata.defaultEnabled !== false,
  });
  const search = await runUniversalOsintSearch(bus, query, {
    missionId: ctx.requestId, userId: ctx.principal.userId,
    purpose: "Authenticated public OSINT query",
    signal: AbortSignal.any([req.signal, AbortSignal.timeout(8_000)]),
  });
  await audit({ requestId: ctx.requestId, userId: ctx.principal.userId, action: "osint.search", outcome: "success", metadata: { adapters: search.executedAdapters } });
  return NextResponse.json({
    generatedAt: new Date().toISOString(), query, kind: search.kind,
    executedAdapters: search.executedAdapters,
    runs: search.runs.map((run) => ({
      adapterId: run.adapterId, status: run.status, durationMs: run.durationMs,
      evidenceCount: run.evidence.length,
      sample: run.evidence[0]?.summary ?? run.error ?? "No evidence returned",
      evidence: run.evidence,
    })),
    warnings: search.warnings,
    notice: "Live source observations; use the mission evidence workflow for durable preservation.",
  }, { headers: { "X-Request-ID": ctx.requestId, "Cache-Control": "no-store" } });
}
export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", (ctx) => execute(req, ctx, req.nextUrl.searchParams.get("q") ?? req.nextUrl.searchParams.get("query")));
}
export async function POST(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const body = z.object({ query: querySchema.optional(), q: querySchema.optional() }).parse(await req.json());
    return execute(req, ctx, body.query ?? body.q);
  });
}
