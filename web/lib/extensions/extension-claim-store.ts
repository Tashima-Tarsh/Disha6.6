import type { Pool } from "pg";

import { getDbPool } from "../server/db";
import type { PolicyDecision } from "../unified/contracts";
import { hashValue } from "../unified/hash";
import type { GovernedExtensionAnalysis, GovernedExtensionClaim, GovernedExtensionRequest } from "./contracts";

export type ExtensionClaimRecord = {
  recordId: string;
  missionId: string;
  extensionId: string;
  analysisEventId: string;
  policyEventId: string;
  claim: GovernedExtensionClaim;
  policyDecision: PolicyDecision["decision"];
  recordedAt: string;
};

interface ExtensionClaimStore {
  save(records: ExtensionClaimRecord[]): Promise<void>;
  list(missionId: string): Promise<ExtensionClaimRecord[]>;
  clearForTests(): Promise<void>;
}

class InMemoryExtensionClaimStore implements ExtensionClaimStore {
  private readonly records = new Map<string, ExtensionClaimRecord>();

  async save(records: ExtensionClaimRecord[]): Promise<void> {
    for (const record of records) this.records.set(record.recordId, structuredClone(record));
  }

  async list(missionId: string): Promise<ExtensionClaimRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.missionId === missionId)
      .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
      .map((record) => structuredClone(record));
  }

  async clearForTests(): Promise<void> {
    this.records.clear();
  }
}

class PostgresExtensionClaimStore implements ExtensionClaimStore {
  constructor(private readonly pool: Pool) {}

  async save(records: ExtensionClaimRecord[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      for (const record of records) {
        await client.query(
          `insert into extension_claim_records (
            record_id, mission_id, extension_id, analysis_event_id, policy_event_id,
            claim_id, claim, confidence, source_hashes, source_refs, verify_required,
            policy_decision, record_hash, recorded_at
          ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
          on conflict (record_id) do update set
            claim = excluded.claim, confidence = excluded.confidence,
            source_hashes = excluded.source_hashes, source_refs = excluded.source_refs,
            verify_required = excluded.verify_required, policy_decision = excluded.policy_decision,
            record_hash = excluded.record_hash`,
          [
            record.recordId,
            record.missionId,
            record.extensionId,
            record.analysisEventId,
            record.policyEventId,
            record.claim.claimId,
            record.claim.text,
            record.claim.confidence,
            record.claim.sourceHashes,
            record.claim.sourceRefs,
            record.claim.verifyRequired,
            record.policyDecision,
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

  async list(missionId: string): Promise<ExtensionClaimRecord[]> {
    const result = await this.pool.query<Record<string, unknown>>(
      `select record_id, mission_id, extension_id, analysis_event_id, policy_event_id,
        claim_id, claim, confidence, source_hashes, source_refs, verify_required,
        policy_decision, record_hash, recorded_at
       from extension_claim_records
       where mission_id = $1
       order by recorded_at asc`,
      [missionId],
    );

    return result.rows.map((row) => {
      const record: ExtensionClaimRecord = {
        recordId: String(row.record_id),
        missionId: String(row.mission_id),
        extensionId: String(row.extension_id),
        analysisEventId: String(row.analysis_event_id),
        policyEventId: String(row.policy_event_id),
        policyDecision: String(row.policy_decision) as PolicyDecision["decision"],
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
        throw new Error(`Extension claim record ${record.recordId} failed hash verification`);
      }
      return record;
    });
  }

  async clearForTests(): Promise<void> {
    await this.pool.query("delete from extension_claim_records");
  }
}

const memoryStore = new InMemoryExtensionClaimStore();
let overrideStore: ExtensionClaimStore | null = null;

export async function persistExtensionClaims(
  request: GovernedExtensionRequest,
  analysis: GovernedExtensionAnalysis,
  context: { analysisEventId: string; policyEventId: string; policyDecision: PolicyDecision },
): Promise<void> {
  const claims = analysis.claims ?? [];
  if (claims.length === 0) return;

  const recordedAt = new Date().toISOString();
  await getExtensionClaimStore().save(claims.map((claim) => ({
    recordId: hashValue({
      missionId: request.mission.missionId,
      extensionId: analysis.extensionId,
      analysisEventId: context.analysisEventId,
      policyEventId: context.policyEventId,
      claimId: claim.claimId,
    }).slice(0, 32),
    missionId: request.mission.missionId,
    extensionId: analysis.extensionId,
    analysisEventId: context.analysisEventId,
    policyEventId: context.policyEventId,
    claim,
    policyDecision: context.policyDecision.decision,
    recordedAt,
  })));
}

export async function listExtensionClaimRecords(missionId: string): Promise<ExtensionClaimRecord[]> {
  return getExtensionClaimStore().list(missionId);
}

export function useExtensionClaimStoreForTests(store: ExtensionClaimStore | null): void {
  overrideStore = store;
}

export async function clearExtensionClaimStoreForTests(): Promise<void> {
  await getExtensionClaimStore().clearForTests();
}

function getExtensionClaimStore(): ExtensionClaimStore {
  if (overrideStore) return overrideStore;
  const pool = getDbPool();
  return pool ? new PostgresExtensionClaimStore(pool) : memoryStore;
}
