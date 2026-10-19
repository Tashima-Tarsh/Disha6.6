import crypto from "node:crypto";
import type { Pool, PoolClient } from "pg";

import type { EvidenceEvent, PolicyDecision } from "./contracts";
import { hashValue } from "./hash";
import { getDbPool } from "../server/db";
import { getEnv, isProduction } from "../server/env";

export type EvidenceAppendInput = {
  missionId: string;
  actor: string;
  action: string;
  input: unknown;
  output?: unknown;
  policyDecision?: PolicyDecision;
  lensResults?: string[];
  parentEventId?: string;
};

type EvidenceLedgerStore = {
  append(input: EvidenceAppendInput): Promise<EvidenceEvent>;
  list(missionId: string): Promise<EvidenceEvent[]>;
  clearForTests(): Promise<void>;
};

class MemoryEvidenceLedgerStore implements EvidenceLedgerStore {
  private readonly eventsByMission = new Map<string, EvidenceEvent[]>();

  async append(input: EvidenceAppendInput): Promise<EvidenceEvent> {
    const chain = this.eventsByMission.get(input.missionId) ?? [];
    const event = buildEvidenceEvent(input, chain.length, chain.at(-1)?.eventHash);
    chain.push(event);
    this.eventsByMission.set(input.missionId, chain);
    return event;
  }

  async list(missionId: string): Promise<EvidenceEvent[]> {
    return [...(this.eventsByMission.get(missionId) ?? [])];
  }

  async clearForTests(): Promise<void> {
    this.eventsByMission.clear();
  }
}

class PostgresEvidenceLedgerStore implements EvidenceLedgerStore {
  constructor(private readonly pool: Pool) {}

  async append(input: EvidenceAppendInput): Promise<EvidenceEvent> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [input.missionId]);
      const previous = await client.query<{ chain_index: number; event_hash: string }>(
        "select chain_index, event_hash from evidence_events where mission_id = $1 order by chain_index desc limit 1",
        [input.missionId],
      );
      const last = previous.rows[0];
      const event = buildEvidenceEvent(input, last ? last.chain_index + 1 : 0, last?.event_hash);
      await insertEvidenceEvent(client, event);
      await client.query("commit");
      return event;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async list(missionId: string): Promise<EvidenceEvent[]> {
    const result = await this.pool.query<{
      event_id: string;
      mission_id: string;
      chain_index: number;
      actor: string;
      action: string;
      input_hash: string;
      output_hash: string | null;
      policy_decision: PolicyDecision | null;
      lens_results: string[] | null;
      parent_event_id: string | null;
      previous_hash: string | null;
      payload_hash: string | null;
      hash_algorithm: "sha256" | null;
      ledger_version: number | null;
      event_hash: string;
      event_timestamp: Date;
    }>(
      `select event_id, mission_id, chain_index, actor, action, input_hash, output_hash, policy_decision, lens_results,
        parent_event_id, previous_hash, payload_hash, hash_algorithm, ledger_version, event_hash, event_timestamp
       from evidence_events
       where mission_id = $1
       order by chain_index asc`,
      [missionId],
    );
    return result.rows.map((row) => ({
      eventId: row.event_id,
      missionId: row.mission_id,
      chainIndex: row.chain_index,
      timestamp: row.event_timestamp.toISOString(),
      actor: row.actor,
      action: row.action,
      inputHash: row.input_hash,
      outputHash: row.output_hash ?? undefined,
      policyDecision: row.policy_decision ?? undefined,
      lensResults: row.lens_results && row.lens_results.length > 0 ? row.lens_results : undefined,
      parentEventId: row.parent_event_id ?? undefined,
      previousHash: row.previous_hash ?? undefined,
      payloadHash: row.payload_hash ?? "",
      hashAlgorithm: row.hash_algorithm ?? "sha256",
      ledgerVersion: 2,
      eventHash: row.event_hash,
    }));
  }

  async clearForTests(): Promise<void> {
    await this.pool.query("truncate table evidence_events cascade");
  }
}

const memoryStore = new MemoryEvidenceLedgerStore();
let overrideStore: EvidenceLedgerStore | null = null;

export async function appendEvidenceEvent(input: EvidenceAppendInput): Promise<EvidenceEvent> {
  return getEvidenceLedgerStore().append(input);
}

export async function getEvidenceEvents(missionId: string): Promise<EvidenceEvent[]> {
  return getEvidenceLedgerStore().list(missionId);
}

export async function exportEvidenceReport(missionId: string) {
  const events = await getEvidenceEvents(missionId);
  const verification = verifyEvidenceChain(events);
  return {
    missionId,
    exportedAt: new Date().toISOString(),
    eventCount: events.length,
    verified: verification.ok,
    verification,
    events,
  };
}

export function verifyEvidenceChain(events: EvidenceEvent[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  let previousHash: string | undefined;
  const missionId = events[0]?.missionId;

  events.forEach((event, index) => {
    if (event.missionId !== missionId) {
      errors.push(`event ${index} missionId mismatch`);
    }
    if (event.chainIndex !== index) {
      errors.push(`event ${index} chainIndex mismatch`);
    }
    if (event.previousHash !== previousHash) {
      errors.push(`event ${index} previousHash mismatch`);
    }
    if (event.hashAlgorithm !== "sha256") {
      errors.push(`event ${index} hashAlgorithm mismatch`);
    }
    if (event.ledgerVersion !== 2) {
      errors.push(`event ${index} ledgerVersion mismatch`);
    }
    const { eventHash, payloadHash, ...payload } = event;
    const expectedPayloadHash = hashValue(payload);
    if (payloadHash !== expectedPayloadHash) {
      errors.push(`event ${index} payloadHash mismatch`);
    }
    const expected = hashValue(`${expectedPayloadHash}:${previousHash ?? "GENESIS"}`);
    if (eventHash !== expected) {
      errors.push(`event ${index} eventHash mismatch`);
    }
    previousHash = event.eventHash;
  });

  return { ok: errors.length === 0, errors };
}

export async function clearEvidenceLedgerForTests(): Promise<void> {
  await getEvidenceLedgerStore().clearForTests();
}

export function useEvidenceLedgerStoreForTests(store: EvidenceLedgerStore | null): void {
  overrideStore = store;
}

function getEvidenceLedgerStore(): EvidenceLedgerStore {
  if (overrideStore) return overrideStore;
  const pool = getDbPool();
  if (pool) return new PostgresEvidenceLedgerStore(pool);

  const env = getEnv();
  const mode = env.DISHA_EVIDENCE_LEDGER_MODE ?? (isProduction() ? "postgres" : "memory-dev");
  if (process.env.NODE_ENV === "test" || mode === "memory-dev") return memoryStore;

  throw new Error("Persistent Evidence Ledger requires DATABASE_URL or DISHA_EVIDENCE_LEDGER_MODE=memory-dev outside production");
}

async function insertEvidenceEvent(client: PoolClient, event: EvidenceEvent): Promise<void> {
  await client.query(
    `insert into evidence_events (
      event_id, mission_id, chain_index, actor, action, input_hash, output_hash, policy_decision,
      lens_results, parent_event_id, previous_hash, payload_hash, hash_algorithm, ledger_version,
      event_hash, event_timestamp
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      event.eventId,
      event.missionId,
      event.chainIndex,
      event.actor,
      event.action,
      event.inputHash,
      event.outputHash ?? null,
      event.policyDecision ? JSON.stringify(event.policyDecision) : null,
      event.lensResults ?? [],
      event.parentEventId ?? null,
      event.previousHash ?? null,
      event.payloadHash,
      event.hashAlgorithm,
      event.ledgerVersion,
      event.eventHash,
      event.timestamp,
    ],
  );
}

function buildEvidenceEvent(input: EvidenceAppendInput, chainIndex: number, previousHash?: string): EvidenceEvent {
  const payload = {
    eventId: crypto.randomUUID(),
    missionId: input.missionId,
    chainIndex,
    timestamp: new Date().toISOString(),
    actor: input.actor,
    action: input.action,
    inputHash: hashValue(input.input),
    outputHash: input.output === undefined ? undefined : hashValue(input.output),
    policyDecision: input.policyDecision,
    lensResults: input.lensResults,
    parentEventId: input.parentEventId,
    previousHash,
    hashAlgorithm: "sha256" as const,
    ledgerVersion: 2 as const,
  };
  const payloadHash = hashValue(payload);
  const eventHash = hashValue(`${payloadHash}:${previousHash ?? "GENESIS"}`);
  return { ...payload, payloadHash, eventHash };
}
