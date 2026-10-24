/**
 * Postgres EvidenceStore — production skeleton
 *
 * Concurrent appends: advisory transaction lock keyed by mission_id (or global)
 * so previousHash is serialized the same way as the web ledger.
 */

import type { EvidenceEvent } from "@disha/contracts";
import type { EvidenceStore } from "./ledger";
import type { LedgerQuery, LedgerQueryResult } from "./types";

export interface PostgresPool {
  query(text: string, params?: unknown[]): Promise<{ rows: any[] }>;
  connect?(): Promise<PostgresClient>;
}

export interface PostgresClient {
  query(text: string, params?: unknown[]): Promise<{ rows: any[] }>;
  release(): void;
}

export class PostgresEvidenceStore implements EvidenceStore {
  constructor(private pool: PostgresPool) {}

  async getLatestHash(missionId?: string): Promise<string> {
    if (missionId) {
      const { rows } = await this.pool.query(
        `SELECT hash FROM evidence_events
         WHERE mission_id = $1
         ORDER BY timestamp DESC, id DESC
         LIMIT 1`,
        [missionId]
      );
      return rows[0]?.hash ?? "0";
    }
    const { rows } = await this.pool.query(
      `SELECT hash FROM evidence_events
       ORDER BY timestamp DESC, id DESC
       LIMIT 1`
    );
    return rows[0]?.hash ?? "0";
  }

  async append(event: EvidenceEvent): Promise<void> {
    // Prefer a client transaction when pool.connect is available (node-pg).
    if (typeof this.pool.connect === "function") {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        const lockKey = event.missionId ?? "__global__";
        await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [lockKey]);
        await client.query(
          `INSERT INTO evidence_events (
             id, previous_hash, hash, timestamp,
             actor_type, actor_id, actor_display_name,
             event_type, payload, sources, verification,
             policy_id, policy_decision, policy_reasons,
             mission_id, case_id, signature
           ) VALUES (
             $1,$2,$3,$4,
             $5,$6,$7,
             $8,$9,$10,$11,
             $12,$13,$14,
             $15,$16,$17
           )`,
          this.insertParams(event)
        );
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
      return;
    }

    // Fallback: single statement (no concurrency guarantee).
    await this.pool.query(
      `INSERT INTO evidence_events (
         id, previous_hash, hash, timestamp,
         actor_type, actor_id, actor_display_name,
         event_type, payload, sources, verification,
         policy_id, policy_decision, policy_reasons,
         mission_id, case_id, signature
       ) VALUES (
         $1,$2,$3,$4,
         $5,$6,$7,
         $8,$9,$10,$11,
         $12,$13,$14,
         $15,$16,$17
       )`,
      this.insertParams(event)
    );
  }

  private insertParams(event: EvidenceEvent): unknown[] {
    return [
      event.id,
      event.previousHash,
      event.hash,
      event.timestamp,
      event.actor.type,
      event.actor.id,
      event.actor.displayName ?? null,
      event.type,
      JSON.stringify(event.payload),
      JSON.stringify(event.sources),
      event.verification,
      event.policyContext.policyId,
      event.policyContext.decision,
      JSON.stringify(event.policyContext.reasons),
      event.missionId ?? null,
      event.caseId ?? null,
      event.signature ?? null,
    ];
  }

  async query(q: LedgerQuery): Promise<LedgerQueryResult> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (q.missionId) {
      conditions.push(`mission_id = $${i++}`);
      params.push(q.missionId);
    }
    if (q.caseId) {
      conditions.push(`case_id = $${i++}`);
      params.push(q.caseId);
    }
    if (q.actorId) {
      conditions.push(`actor_id = $${i++}`);
      params.push(q.actorId);
    }
    if (q.verification) {
      const states = Array.isArray(q.verification) ? q.verification : [q.verification];
      conditions.push(`verification = ANY($${i++})`);
      params.push(states);
    }
    if (q.from) {
      conditions.push(`timestamp >= $${i++}`);
      params.push(q.from);
    }
    if (q.to) {
      conditions.push(`timestamp <= $${i++}`);
      params.push(q.to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = q.limit ?? 100;
    params.push(limit);

    const { rows } = await this.pool.query(
      `SELECT * FROM evidence_events
       ${where}
       ORDER BY timestamp ASC, id ASC
       LIMIT $${i}`,
      params
    );

    const events: EvidenceEvent[] = rows.map((r) => this.rowToEvent(r));
    return { events };
  }

  async getById(id: string): Promise<EvidenceEvent | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM evidence_events WHERE id = $1`,
      [id]
    );
    if (!rows[0]) return null;
    return this.rowToEvent(rows[0]);
  }

  private rowToEvent(r: any): EvidenceEvent {
    return {
      id: r.id,
      previousHash: r.previous_hash,
      hash: r.hash,
      timestamp: r.timestamp,
      actor: {
        type: r.actor_type,
        id: r.actor_id,
        displayName: r.actor_display_name ?? undefined,
      },
      type: r.event_type,
      payload: r.payload,
      sources: r.sources,
      verification: r.verification,
      policyContext: {
        policyId: r.policy_id,
        decision: r.policy_decision,
        reasons: r.policy_reasons,
      },
      missionId: r.mission_id ?? undefined,
      caseId: r.case_id ?? undefined,
      signature: r.signature ?? undefined,
    };
  }
}
