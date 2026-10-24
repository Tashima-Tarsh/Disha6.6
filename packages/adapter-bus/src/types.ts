/**
 * Adapter Bus — Types
 * Governing documents: CONSTITUTION.md (Article V), docs/ADAPTER_BUS.md
 */

import type {
  Adapter,
  AdapterResult,
  CanonicalInput,
  ExecutionContext,
  EvidenceEvent,
  RiskLevel,
} from "@disha/contracts";

export type { Adapter, AdapterResult, CanonicalInput, ExecutionContext, EvidenceEvent, RiskLevel };

export interface AdapterRegistration {
  adapter: Adapter;
  enabled: boolean;
  lastHealth?: {
    status: "healthy" | "degraded" | "failed";
    checkedAt: string;
    message?: string;
  };
}

export interface BusExecuteRequest {
  adapterIds: string[];
  input: CanonicalInput;
  context: ExecutionContext;
  /** If true, high-risk adapters are forced to proposal-only */
  forceProposeHighRisk?: boolean;
}

export interface BusExecuteResult {
  results: Array<{
    adapterId: string;
    success: boolean;
    result?: AdapterResult;
    error?: string;
    durationMs: number;
  }>;
  evidenceEvents: EvidenceEvent[];
  partial: boolean;
}
