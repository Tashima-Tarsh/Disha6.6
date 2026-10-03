import { NextRequest, NextResponse } from "next/server";

import { getDbPool } from "@/lib/server/db";
import { withContext } from "@/lib/unified/api";

export async function GET(req: NextRequest, context: { params: Promise<{ runId: string }> }) {
  return withContext(req, "agent:read", async (ctx) => {
    const { runId } = await context.params;
    const pool = getDbPool();
    if (!pool) {
      return NextResponse.json(
        { error: "astra6_persistence_unavailable" },
        { status: 503, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    const isAdmin = ctx.principal.roles.includes("admin");
    const result = await pool.query(
      `select run_id,tool_id,mission_id,user_id,target,target_type,status,parsed_output,evidence,warnings,error,
              attempts,duration_ms,worker_id,provenance_hash,queued_at,started_at,completed_at
         from astra6_connector_runs
        where run_id=$1 and (user_id=$2 or $3::boolean)
        limit 1`,
      [runId, ctx.principal.userId, isAdmin],
    );
    const row = result.rows[0];
    if (!row) {
      return NextResponse.json(
        { error: "astra6_run_not_found" },
        { status: 404, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    return NextResponse.json({
      runId: String(row.run_id),
      toolId: String(row.tool_id),
      missionId: row.mission_id ? String(row.mission_id) : null,
      target: String(row.target),
      targetType: String(row.target_type),
      status: String(row.status),
      parsedOutput: row.parsed_output ?? null,
      evidence: Array.isArray(row.evidence) ? row.evidence : [],
      warnings: Array.isArray(row.warnings) ? row.warnings : [],
      error: row.error ? String(row.error) : null,
      attempts: Number(row.attempts ?? 0),
      durationMs: Number(row.duration_ms ?? 0),
      workerId: row.worker_id ? String(row.worker_id) : null,
      provenanceHash: String(row.provenance_hash),
      queuedAt: new Date(String(row.queued_at)).toISOString(),
      startedAt: row.started_at ? new Date(String(row.started_at)).toISOString() : null,
      completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : null,
    }, {
      headers: {
        "X-Request-ID": ctx.requestId,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  });
}
