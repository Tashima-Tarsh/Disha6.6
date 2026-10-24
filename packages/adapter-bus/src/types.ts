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
}

export interface BusExecuteRequest {
  adapterIds: string[];
  input: CanonicalInput;
  context: ExecutionContext;
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
