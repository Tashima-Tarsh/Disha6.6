import { getDbPool } from "./db";
import { brainFetch } from "./brain-client";
import type { AuditEvent } from "./types";
import { isProduction } from "./env";

export async function audit(event: AuditEvent): Promise<void> {
  const pool = getDbPool();
  try {
    if (!pool) {
      // Dev / no-DB mode: try brain (has SQLite), else console
      await brainFetch("/api/v1/internal/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
        timeoutMs: 5_000,
      });
      return;
    }
    await pool.query(
      `insert into audit_events (request_id, user_id, action, resource, outcome, metadata)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        event.requestId,
        event.userId ?? null,
        event.action,
        event.resource ?? null,
        event.outcome,
        event.metadata ?? {},
      ],
    );
  } catch (e) {
    if (event.critical || isProduction()) {
      throw Object.assign(
        new Error(`audit_persistence_failed: Unable to persist critical audit record for '${event.action}': ${e instanceof Error ? e.message : String(e)}`),
        { status: 500, cause: e }
      );
    }
    // Non-critical local dev fallback
    console.info(JSON.stringify({ type: "audit-fallback", error: String(e), ...event, ts: new Date().toISOString() }));
  }
}
