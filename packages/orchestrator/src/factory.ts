/**
 * Factory that builds a ConstitutionalOrchestrator with the correct store.
 *
 * Production (fail-closed):
 *   - Caller must pass a live Postgres pool when durable evidence is required.
 *   - packages/api refuses to start in production without DATABASE_URL + pg.
 *
 * Development:
 *   - createOrchestrator() with no options → InMemoryEvidenceStore.
 */

import { ConstitutionalOrchestrator } from "./orchestrator";
import { EvidenceLedger, InMemoryEvidenceStore, PostgresEvidenceStore } from "@disha/evidence-ledger";
import type { PostgresPool } from "@disha/evidence-ledger";

export interface CreateOrchestratorOptions {
  /** Live pg Pool (or compatible). Required for production durable ledger. */
  pool?: PostgresPool;
  /** If true and pool is missing, throw instead of using memory. */
  requirePostgres?: boolean;
}

export function createOrchestrator(options: CreateOrchestratorOptions = {}): ConstitutionalOrchestrator {
  if (options.pool) {
    const store = new PostgresEvidenceStore(options.pool);
    const ledger = new EvidenceLedger(store);
    return new ConstitutionalOrchestrator({ ledger });
  }

  if (options.requirePostgres) {
    throw new Error(
      "createOrchestrator: requirePostgres=true but no pool supplied. Fail-closed: refusing in-memory ledger."
    );
  }

  // Default: in-memory (tests and local demos only)
  return new ConstitutionalOrchestrator();
}
