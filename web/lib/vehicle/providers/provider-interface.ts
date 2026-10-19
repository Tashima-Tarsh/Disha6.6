import type {
  NormalizedPlate,
  VehicleProviderHealth,
  VehicleQueryContext,
  VehicleVerificationResult,
} from "../types";

export interface ProviderLookupResult {
  success: boolean;
  result?: VehicleVerificationResult;
  error?: string;
  statusCode?: number;
  unauthorized?: boolean;
  rateLimited?: boolean;
  rawPayload?: Record<string, unknown>;
}

export interface VehicleProvider {
  readonly id: string;
  readonly name: string;
  readonly priority: number;
  readonly isLiveProvider: boolean;

  health(): Promise<VehicleProviderHealth>;
  verifyRegistration(plate: NormalizedPlate, context: VehicleQueryContext): Promise<ProviderLookupResult>;
}
