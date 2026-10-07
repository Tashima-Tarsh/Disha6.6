import { NextRequest, NextResponse } from "next/server";
import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";
import { runUniversalOsintSearch, sanitizeUniversalQuery } from "@/lib/unified/universal-osint-search";

export const dynamic = "force-dynamic";

async function executeOsintSearch(rawQuery: string, signal?: AbortSignal) {
  const query = sanitizeUniversalQuery(rawQuery);
  const bus = createDefaultOsintBus({
    policyCheck: (metadata) => {
      const executionClass = metadata.executionClass ?? "passive_public";
      return (
        (executionClass === "passive_public" || executionClass === "credentialed_public_api") &&
        metadata.defaultEnabled !== false
      );
    },
  });

  const abortSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
    : AbortSignal.timeout(8000);

  const context = {
    missionId: "surveillance-live-query",
    userId: "surveillance-operator",
    purpose: "Governed live public OSINT query on surveillance board",
    signal: abortSignal,
  };

  const [health, search] = await Promise.all([
    bus.health(),
    runUniversalOsintSearch(bus, query, context),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    query,
    kind: search.kind,
    executedAdapters: search.executedAdapters,
    runs: search.runs.map((r) => ({
      adapterId: r.adapterId,
      status: r.status,
      durationMs: r.durationMs,
      evidenceCount: r.evidence.length,
      sample:
        r.evidence[0]?.summary ??
        r.error ??
        (r.status === "completed" ? "Query executed successfully" : "No records found"),
    })),
    healthSummary: {
      total: health.length,
      healthy: health.filter((h) => h.status === "healthy").length,
    },
  });
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? req.nextUrl.searchParams.get("query");
  if (!q?.trim()) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }
  return executeOsintSearch(q, req.signal);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });
  }

  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const q =
    typeof record.query === "string" && record.query.trim()
      ? record.query.trim()
      : typeof record.q === "string" && record.q.trim()
        ? record.q.trim()
        : "";

  if (!q) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  return executeOsintSearch(q, req.signal);
}
