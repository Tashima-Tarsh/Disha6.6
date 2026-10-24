import { ulid } from "ulid";
import type { EvidenceEvent } from "@disha/contracts";
import { computeHash, verifyEvent } from "./hash";
import type { LedgerAppendResult, LedgerQuery, LedgerQueryResult } from "./types";

export interface EvidenceStore {
  getLatestHash(missionId?: string): Promise<string>;
  append(event: EvidenceEvent): Promise<void>;
  query(q: LedgerQuery): Promise<LedgerQueryResult>;
  getById(id: string): Promise<EvidenceEvent | null>;
}

export class InMemoryEvidenceStore implements EvidenceStore {
  private events: EvidenceEvent[] = [];

  async getLatestHash(missionId?: string): Promise<string> {
    const filtered = missionId
      ? this.events.filter((e) => e.missionId === missionId)
      : this.events;
    if (filtered.length === 0) return "0";
    return filtered[filtered.length - 1].hash;
  }

  async append(event: EvidenceEvent): Promise<void> {
    this.events.push(event);
  }

  async query(q: LedgerQuery): Promise<LedgerQueryResult> {
    let result = [...this.events];
    if (q.missionId) result = result.filter((e) => e.missionId === q.missionId);
    if (q.caseId) result = result.filter((e) => e.caseId === q.caseId);
    if (q.actorId) result = result.filter((e) => e.actor.id === q.actorId);
    if (q.verification) {
      const states = Array.isArray(q.verification) ? q.verification : [q.verification];
      result = result.filter((e) => states.includes(e.verification));
    }
    if (q.from) result = result.filter((e) => e.timestamp >= q.from!);
    if (q.to) result = result.filter((e) => e.timestamp <= q.to!);
    const limit = q.limit ?? 100;
    return { events: result.slice(-limit) };
  }

  async getById(id: string): Promise<EvidenceEvent | null> {
    return this.events.find((e) => e.id === id) ?? null;
  }
}

export class EvidenceLedger {
  constructor(private store: EvidenceStore) {}

  async append(
    partial: Omit<EvidenceEvent, "id" | "previousHash" | "hash" | "timestamp"> & {
      timestamp?: string;
    }
  ): Promise<LedgerAppendResult> {
    const previousHash = await this.store.getLatestHash(partial.missionId);
    const id = ulid();
    const timestamp = partial.timestamp ?? new Date().toISOString();

    const eventWithoutHash: Omit<EvidenceEvent, "hash"> = {
      id,
      previousHash,
      timestamp,
      actor: partial.actor,
      type: partial.type,
      payload: partial.payload,
      sources: partial.sources,
      verification: partial.verification,
      policyContext: partial.policyContext,
      missionId: partial.missionId,
      caseId: partial.caseId,
      signature: partial.signature,
    };

    const hash = computeHash(eventWithoutHash);
    const event: EvidenceEvent = { ...eventWithoutHash, hash };

    await this.store.append(event);
    return { event, previousHash, hash };
  }

  async query(q: LedgerQuery): Promise<LedgerQueryResult> {
    return this.store.query(q);
  }

  async verifyChain(missionId?: string): Promise<{ valid: boolean; brokenAt?: string }> {
    const { events } = await this.store.query({ missionId, limit: 100000 });
    let expectedPrev = "0";
    for (const event of events) {
      if (event.previousHash !== expectedPrev) {
        return { valid: false, brokenAt: event.id };
      }
      if (!verifyEvent(event)) {
        return { valid: false, brokenAt: event.id };
      }
      expectedPrev = event.hash;
    }
    return { valid: true };
  }
}
