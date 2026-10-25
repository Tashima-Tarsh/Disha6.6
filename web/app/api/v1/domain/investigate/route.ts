import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withContext } from "@/lib/unified/api";
import { domainIntelligenceWorkflowService } from "@/lib/domain/domain-intelligence-service";

export const dynamic = "force-dynamic";

const investigateSchema = z.object({
  domain: z.string().min(1).max(253),
  purpose: z.string().min(3).max(1000).optional().default("Authorized domain security intelligence"),
  includeHistorical: z.boolean().optional().default(true),
  includeThreatIntel: z.boolean().optional().default(true),
  maxSubdomains: z.number().int().min(1).max(200).optional().default(100),
});

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    let body: z.infer<typeof investigateSchema>;
    try {
      const raw = await req.json();
      body = investigateSchema.parse(raw);
    } catch (err) {
      return NextResponse.json(
        { error: "invalid_request", message: err instanceof Error ? err.message : String(err) },
        { status: 400, headers: { "X-Request-ID": ctx.requestId } }
      );
    }

    const adapterContext = {
      missionId: ctx.requestId,
      userId: ctx.principal?.userId || "operator",
      userRoles: ctx.principal?.roles || [],
      purpose: body.purpose,
      signal: req.signal,
    };

    try {
      const report = await domainIntelligenceWorkflowService.investigateDomain(
        body.domain,
        adapterContext,
        {
          includeHistorical: body.includeHistorical,
          includeThreatIntel: body.includeThreatIntel,
          maxSubdomains: body.maxSubdomains,
        }
      );

      return NextResponse.json(report, {
        headers: {
          "X-Request-ID": ctx.requestId,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: "investigation_failed", message },
        { status: 400, headers: { "X-Request-ID": ctx.requestId } }
      );
    }
  });
}
