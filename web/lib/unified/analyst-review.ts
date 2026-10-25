import { getDbPool } from "../server/db";
import { hashValue } from "./hash";
import { emitRuntimeEvent } from "./runtime-event-bus";
import { appendEvidenceEvent } from "./evidence-ledger";

export type AnalystReviewKind = "entity_resolution" | "intelligence_change" | "hypothesis" | "source_quality";
export type AnalystReviewStatus = "open" | "in_review" | "resolved" | "dismissed";
export type AnalystReviewPriority = "low" | "medium" | "high" | "critical";

export type AnalystReviewItem = {
  reviewId: string;
  kind: AnalystReviewKind;
  priority: AnalystReviewPriority;
  status: AnalystReviewStatus;
  title: string;
  summary: string;
  subject?: string;
  predicate?: string;
  entityId?: string;
  changeId?: string;
  hypothesisIds: string[];
  sourceHashes: string[];
  payload: Record<string, unknown>;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
  provenanceHash: string;
};

const memoryReviews = new Map<string, AnalystReviewItem>();

export async function enqueueAnalystReview(input: Omit<AnalystReviewItem, "reviewId" | "status" | "createdAt" | "updatedAt" | "provenanceHash" | "hypothesisIds" | "sourceHashes" | "payload"> & {
  dedupeKey: string;
  hypothesisIds?: string[];
  sourceHashes?: string[];
  payload?: Record<string, unknown>;
}): Promise<AnalystReviewItem> {
  const now = new Date().toISOString();
  const reviewId = `review-${hashValue({ kind: input.kind, dedupeKey: input.dedupeKey }).slice(0, 24)}`;
  const base = {
    reviewId,
    kind: input.kind,
    priority: input.priority,
    status: "open" as const,
    title: input.title,
    summary: input.summary,
    subject: input.subject,
    predicate: input.predicate,
    entityId: input.entityId,
    changeId: input.changeId,
    hypothesisIds: unique(input.hypothesisIds ?? []),
    sourceHashes: unique(input.sourceHashes ?? []),
    payload: input.payload ?? {},
    createdAt: now,
    updatedAt: now,
  };
  const item: AnalystReviewItem = { ...base, provenanceHash: hashValue(base) };
  const pool = getDbPool();
  if (!pool) {
    const existing = memoryReviews.get(reviewId);
    if (existing && ["open", "in_review"].includes(existing.status)) return existing;
    memoryReviews.set(reviewId, item);
  } else {
    await pool.query(
      `insert into analyst_review_queue
        (review_id,kind,priority,status,title,summary,subject,predicate,entity_id,change_id,hypothesis_ids,source_hashes,payload,provenance_hash,created_at,updated_at)
       values ($1,$2,$3,'open',$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$14)
       on conflict (review_id) do update set
         priority=case when analyst_review_queue.status in ('open','in_review') then excluded.priority else analyst_review_queue.priority end,
         summary=case when analyst_review_queue.status in ('open','in_review') then excluded.summary else analyst_review_queue.summary end,
         hypothesis_ids=case when analyst_review_queue.status in ('open','in_review') then excluded.hypothesis_ids else analyst_review_queue.hypothesis_ids end,
         source_hashes=case when analyst_review_queue.status in ('open','in_review') then excluded.source_hashes else analyst_review_queue.source_hashes end,
         payload=case when analyst_review_queue.status in ('open','in_review') then excluded.payload else analyst_review_queue.payload end,
         provenance_hash=case when analyst_review_queue.status in ('open','in_review') then excluded.provenance_hash else analyst_review_queue.provenance_hash end,
         updated_at=case when analyst_review_queue.status in ('open','in_review') then excluded.updated_at else analyst_review_queue.updated_at end`,
      [reviewId, input.kind, input.priority, input.title, input.summary, input.subject ?? null, input.predicate ?? null, input.entityId ?? null, input.changeId ?? null, item.hypothesisIds, item.sourceHashes, JSON.stringify(item.payload), item.provenanceHash, now],
    );
  }
  await emitRuntimeEvent("analyst.review_opened", { reviewId, kind: item.kind, priority: item.priority, subject: item.subject, changeId: item.changeId }, reviewId);
  return item;
}

export async function listAnalystReviews(input: { status?: AnalystReviewStatus; limit?: number } = {}): Promise<AnalystReviewItem[]> {
  const rawLimit = Number(input.limit ?? 100);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(500, Math.trunc(rawLimit))) : 100;
  const pool = getDbPool();
  if (!pool) {
    return [...memoryReviews.values()]
      .filter((item) => !input.status || item.status === input.status)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, limit);
  }
  const priorityOrder = `case priority when 'critical' then 4 when 'high' then 3 when 'medium' then 2 else 1 end`;
  const result = input.status
    ? await pool.query(`select * from analyst_review_queue where status=$1 order by ${priorityOrder} desc, updated_at desc limit $2`, [input.status, limit])
    : await pool.query(`select * from analyst_review_queue order by ${priorityOrder} desc, updated_at desc limit $1`, [limit]);
  return result.rows.map(rowToReview);
}

export async function updateAnalystReview(reviewId: string, input: {
  status: AnalystReviewStatus;
  actor: string;
  resolution?: string;
  assignedTo?: string;
}): Promise<AnalystReviewItem | null> {
  const actor = input.actor?.trim();
  if (!actor || actor.length < 3) {
    throw new Error("Unauthorized review update: Valid reviewer actor identity is required");
  }

  const now = new Date().toISOString();
  const pool = getDbPool();
  if (!pool) {
    const current = memoryReviews.get(reviewId);
    if (!current) return null;
    const updatedBase = {
      ...current,
      status: input.status,
      assignedTo: input.assignedTo ?? current.assignedTo,
      resolution: input.resolution ?? current.resolution,
      resolvedAt: ["resolved", "dismissed"].includes(input.status) ? now : undefined,
      updatedAt: now,
      payload: { ...current.payload, lastActor: actor },
    };
    const { provenanceHash: _oldHash, ...withoutHash } = updatedBase;
    const updated = { ...withoutHash, provenanceHash: hashValue(withoutHash) } as AnalystReviewItem;
    memoryReviews.set(reviewId, updated);
    
    // Cryptographically record reviewer action in Evidence Ledger
    try {
      await appendEvidenceEvent({
        missionId: current.changeId || reviewId,
        actor,
        action: `analyst_review_${input.status}`,
        input: { reviewId, previousStatus: current.status, newStatus: input.status, assignedTo: input.assignedTo },
        output: { resolution: input.resolution, provenanceHash: updated.provenanceHash },
      });
    } catch {
      // Non-blocking in dev memory mode if missionId format is synthetic
    }

    await emitRuntimeEvent("analyst.review_updated", { reviewId, status: input.status, actor }, reviewId);
    return updated;
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query(
      `update analyst_review_queue set status=$2, assigned_to=coalesce($3,assigned_to), resolution=coalesce($4,resolution),
         resolved_at=case when $2 in ('resolved','dismissed') then $5 else null end, updated_at=$5,
         payload=payload || jsonb_build_object('lastActor',$6)
       where review_id=$1 returning *`,
      [reviewId, input.status, input.assignedTo ?? null, input.resolution ?? null, now, actor],
    );
    if (!result.rowCount) { await client.query("rollback"); return null; }
    const actionBase = { reviewId, actor, status: input.status, resolution: input.resolution, assignedTo: input.assignedTo, createdAt: now };
    const actionHash = hashValue(actionBase);
    await client.query(
      `insert into analyst_review_actions (action_id,review_id,actor,status,resolution,assigned_to,action_hash,created_at) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [`action-${actionHash.slice(0, 24)}`, reviewId, actor, input.status, input.resolution ?? null, input.assignedTo ?? null, actionHash, now],
    );

    // Cryptographically record reviewer action in Evidence Ledger
    try {
      await appendEvidenceEvent({
        missionId: String(result.rows[0].change_id || reviewId),
        actor,
        action: `analyst_review_${input.status}`,
        input: { reviewId, newStatus: input.status, assignedTo: input.assignedTo },
        output: { resolution: input.resolution, actionHash },
      });
    } catch {
      // Handled
    }

    await client.query("commit");
    const item = rowToReview(result.rows[0] as Record<string, unknown>);
    await emitRuntimeEvent("analyst.review_updated", { reviewId, status: input.status, actor }, reviewId);
    return item;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
}

function rowToReview(row: Record<string, unknown>): AnalystReviewItem {
  return {
    reviewId: String(row.review_id), kind: row.kind as AnalystReviewKind, priority: row.priority as AnalystReviewPriority,
    status: row.status as AnalystReviewStatus, title: String(row.title), summary: String(row.summary),
    subject: row.subject ? String(row.subject) : undefined, predicate: row.predicate ? String(row.predicate) : undefined,
    entityId: row.entity_id ? String(row.entity_id) : undefined, changeId: row.change_id ? String(row.change_id) : undefined,
    hypothesisIds: Array.isArray(row.hypothesis_ids) ? row.hypothesis_ids.map(String) : [],
    sourceHashes: Array.isArray(row.source_hashes) ? row.source_hashes.map(String) : [],
    payload: typeof row.payload === "object" && row.payload ? row.payload as Record<string, unknown> : {},
    assignedTo: row.assigned_to ? String(row.assigned_to) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString(),
    resolvedAt: row.resolved_at ? new Date(String(row.resolved_at)).toISOString() : undefined,
    resolution: row.resolution ? String(row.resolution) : undefined,
    provenanceHash: String(row.provenance_hash),
  };
}

function unique(values: string[]): string[] { return [...new Set(values.filter(Boolean))].slice(0, 500); }
export function clearAnalystReviewsForTests(): void { memoryReviews.clear(); }
