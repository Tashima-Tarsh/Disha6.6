/**
 * Factory that builds a ConstitutionalOrchestrator with the correct store.
 * - If DATABASE_URL is set → PostgresEvidenceStore
 * - Otherwise → InMemoryEvidenceStore (dev / demo)
 */

import { ConstitutionalOrchestrator } from "./orchestrator";
import { EvidenceLedger, InMemoryEvidenceStore, PostgresEvidenceStore } from "@disha/evidence-ledger";
import type { PostgresPool } from "@disha/evidence-ledger";

export interface CreateOrchestratorOptions {
  /** Optional pre-built pg Pool (or compatible). If omitted and DATABASE_URL is set, caller must supply pool. */
  pool?: PostgresPool;
}

/**
 * Create an orchestrator.
 *
 * Production:
 *   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 *   const orch = createOrchestrator({ pool });
 *
 * Development:
 *   const orch = createOrchestrator(); // in-memory
 */
export function createOrchestrator(options: CreateOrchestratorOptions = {}): ConstitutionalOrchestrator {
  if (options.pool) {
    const store = new PostgresEvidenceStore(options.pool);
    const ledger = new EvidenceLedger(store);
    return new ConstitutionalOrchestrator({ ledger });
  }

  // Default: in-memory (safe for tests and local demos)
  return new ConstitutionalOrchestrator();
}
