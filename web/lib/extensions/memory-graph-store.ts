import type { Pool } from "pg";

import { getDbPool } from "../server/db";
import { hashValue } from "../unified/hash";
import type { GovernedExtensionClaim, GovernedExtensionRequest } from "./contracts";

export type MemoryGraphRecord = {
  recordId: string;
  missionId: string;
  extensionId: "memory-graph";
  analysisEventId: string;
  claim: GovernedExtensionClaim;
  recordedAt: string;
};

interface MemoryGraphStore {
  save(records: MemoryGraphRecord[]): Promise<void>;
  list(missionId: string): Promise<MemoryGraphRecord[]>;
  clearForTests(): Promise<void>;
}

class InMemoryMemoryGraphStore implements MemoryGraphStore {
  private readonly records = new Map<string, MemoryGraphRecord>();

  async save(records: MemoryGraphRecord[]): Promise<void> {
    for (const record of records) this.records.set(record.recordId, structuredClone(record));
  }

  async list(missionId: string): Promise<MemoryGraphRecord[]> {
    return [...this.records.values()].filter((record) => record.missionId === missionId).map((record) => structuredClone(record));
  }

  async clearForTests(): Promise<void> {
    this.records.clear();
  }
}

class PostgresMemoryGraphStore implements MemoryGraphStore {
  constructor(private readonly pool: Pool) {}

  async save(records: MemoryGraphRecord[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      for (const record of records) {
        await client.query(
          `insert into extension_memory_records (
          record_id, mission_id, extension_id, analysis_event_id, claim_id, claim,
          confidence, source_hashes, source_refs, verify_required, record_hash, recorded_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        on conflict (record_id) do update set
          claim = excluded.claim, confidence = excluded.confidence,
          source_hashes = excluded.source_hashes, source_refs = excluded.source_refs,
          verify_required = excluded.verify_required, record_hash = excluded.record_hash` ,
          [
            record.recordId,
            record.missionId,
            record.extensionId,
            record.analysisEventId,
            record.claim.claimId,
            record.claim.text,
            record.claim.confidence,
            record.claim.sourceHashes,
            record.claim.sourceRefs,
            record.claim.verifyRequired,
            hashValue(record),
            record.recordedAt,
          ],
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async list(missionId: string): Promise<MemoryGraphRecord[]> {
    const result = await this.pool.query<Record<string, unknown>>(
      `select record_id, mission_id, extension_id, analysis_event_id, claim_id, claim,
        confidence, source_hashes, source_refs, verify_required, record_hash, recorded_at
       from extension_memory_records where mission_id = $1 order by recorded_at asc`,
      [missionId],
    );
    return result.rows.map((row) => {
      const record: MemoryGraphRecord = {
        recordId: String(row.record_id),
        missionId: String(row.mission_id),
        extensionId: "memory-graph",
        analysisEventId: String(row.analysis_event_id),
        recordedAt: row.recorded_at instanceof Date ? row.recorded_at.toISOString() : new Date(String(row.recorded_at)).toISOString(),
        claim: {
          claimId: String(row.claim_id),
          text: String(row.claim),
          confidence: Number(row.confidence),
          sourceHashes: Array.isArray(row.source_hashes) ? row.source_hashes.map(String) : [],
          sourceRefs: Array.isArray(row.source_refs) ? row.source_refs.map(String) : [],
          verifyRequired: Boolean(row.verify_required),
        },
      };
      if (hashValue(record) !== row.record_hash) {
        throw new Error(`Memory/Graph record ${record.recordId} failed hash verification`);
      }
      return record;
    });
  }

  async clearForTests(): Promise<void> { await this.pool.query("delete from extension_memory_records"); }
}

const memoryStore = new InMemoryMemoryGraphStore();
let overrideStore: MemoryGraphStore | null = null;

export async function persistMemoryGraphAnalysis(
  request: GovernedExtensionRequest,
  analysisEventId: string,
  claims: GovernedExtensionClaim[],
): Promise<void> {
  const recordedAt = new Date().toISOString();
  await getMemoryGraphStore().save(claims.map((claim) => ({
    recordId: hashValue({ missionId: request.mission.missionId, analysisEventId, claimId: claim.claimId }).slice(0, 32),
    missionId: request.mission.missionId,
    extensionId: "memory-graph",
    analysisEventId,
    claim,
    recordedAt,
  })));
}

export async function listMemoryGraphRecords(missionId: string): Promise<MemoryGraphRecord[]> {
  return getMemoryGraphStore().list(missionId);
}

export function useMemoryGraphStoreForTests(store: MemoryGraphStore | null): void { overrideStore = store; }
export async function clearMemoryGraphStoreForTests(): Promise<void> { await getMemoryGraphStore().clearForTests(); }

function getMemoryGraphStore(): MemoryGraphStore {
  if (overrideStore) return overrideStore;
  const pool = getDbPool();
  return pool ? new PostgresMemoryGraphStore(pool) : memoryStore;
}
