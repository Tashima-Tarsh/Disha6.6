import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { openosintClient } from "@/lib/server/openosint-mcp-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const health = await openosintClient.checkHealth();
    let tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown>; noiseLevel: string }> = [];

    if (health.available) {
      try {
        const discovered = await openosintClient.listTools();
        tools = discovered.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          noiseLevel: t.noise || (t.is_passive ? "passive" : "active"),
        }));
      } catch (err) {
        // Fall back to health status if tool listing times out
      }
    }

    const providerConfig = {
      shodan: Boolean(process.env.SHODAN_API_KEY?.trim()),
      haveIBeenPwned: Boolean(process.env.HIBP_API_KEY?.trim()),
      abuseIpDb: Boolean(process.env.ABUSEIPDB_API_KEY?.trim()),
      hunterIo: Boolean(process.env.HUNTER_API_KEY?.trim()),
      builtWith: Boolean(process.env.BUILTWITH_API_KEY?.trim()),
      githubToken: Boolean(process.env.GITHUB_TOKEN?.trim()),
      greynoise: Boolean(process.env.GREYNOISE_API_KEY?.trim()),
      virustotal: Boolean(process.env.VIRUSTOTAL_API_KEY?.trim()),
    };

    return NextResponse.json({
      service: "OpenOSINT MCP Service",
      version: "2.34.0",
      upstreamUrl: "https://github.com/OpenOSINT/OpenOSINT",
      license: "MIT",
      transport: health.transport,
      health: {
        status: health.status,
        available: health.available,
        detail: health.detail,
        toolsCount: tools.length,
      },
      policy: {
        defaultMode: "passive_public",
        activeApprovalRequired: !Boolean(process.env.DISHA_ACTIVE_RECON_APPROVED === "true"),
        identityApprovalRequired: !Boolean(process.env.DISHA_IDENTITY_ENUMERATION_APPROVED === "true"),
      },
      optionalProvidersConfigured: providerConfig,
      tools,
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const tool = typeof body.tool === "string" ? body.tool.trim() : "";
    const args = body.arguments && typeof body.arguments === "object" ? (body.arguments as Record<string, unknown>) : {};
    const purpose = typeof body.purpose === "string" ? body.purpose.trim() : "";
    const allowActive = body.allowActive === true;

    if (!tool) {
      return NextResponse.json({ error: "tool_parameter_required" }, { status: 400 });
    }
    if (!purpose) {
      return NextResponse.json({ error: "investigation_purpose_required" }, { status: 400 });
    }

    try {
      const result = await openosintClient.callTool(tool, args, {
        allowActive,
        timeoutMs: 30_000,
      });

      return NextResponse.json({
        success: result.status === "SUCCESS",
        tool: result.tool,
        status: result.status,
        recordCount: result.records.length,
        records: result.records,
        warnings: result.warnings,
        keyRequired: result.keyRequired,
      }, {
        headers: {
          "X-Request-ID": ctx.requestId,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({
        success: false,
        error: message,
      }, {
        status: 502,
        headers: {
          "X-Request-ID": ctx.requestId,
        },
      });
    }
  });
}
