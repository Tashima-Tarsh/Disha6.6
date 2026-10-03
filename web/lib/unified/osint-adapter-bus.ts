import { hashValue } from "./hash";

export type AdapterHealth = "healthy" | "degraded" | "unavailable" | "not_configured";
export type AdapterAuth = "none" | "api_key" | "oauth2" | "session" | "service_account";
export type AdapterExecutionClass = "passive_public" | "credentialed_public_api" | "active_recon" | "identity_enumeration" | "prohibited";

export type AdapterMetadata = {
  id: string;
  name: string;
  version: string;
  capability: string;
  auth: AdapterAuth;
  legalUse: string[];
  blockedUse: string[];
  rateLimitPerMinute?: number;
  timeoutMs: number;
  maxRetries: number;
  executionClass?: AdapterExecutionClass;
  defaultEnabled?: boolean;
  upstreamRepository?: string;
};

export type AdapterContext = {
  missionId: string;
  userId: string;
  purpose: string;
  identityApproved?: boolean;
  signal?: AbortSignal;
};

export type AdapterEvidence = {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceUrl?: string;
  summary: string;
  retrievedAt: string;
  provenanceHash: string;
};

export type AdapterExecutionResult<T> = {
  adapterId: string;
  status: "completed" | "partial" | "failed" | "cancelled" | "timed_out";
  data?: T;
  evidence: AdapterEvidence[];
  warnings: string[];
  attempts: number;
  durationMs: number;
  error?: string;
};

export interface GovernedOsintAdapter<TInput, TOutput> {
  metadata: AdapterMetadata;
  health(): Promise<{ status: AdapterHealth; detail?: string }>;
  execute(input: TInput, context: AdapterContext): Promise<{ data: TOutput; evidence: AdapterEvidence[]; warnings?: string[] }>;
}

export type AdapterBusOptions = {
  policyCheck?: (metadata: AdapterMetadata, context: AdapterContext) => Promise<boolean> | boolean;
  sleep?: (ms: number) => Promise<void>;
};

const adapterRequestWindows = new Map<string, number[]>();

export class OsintAdapterBus {
  private readonly adapters = new Map<string, GovernedOsintAdapter<unknown, unknown>>();
  private readonly policyCheck: NonNullable<AdapterBusOptions["policyCheck"]>;
  private readonly sleep: NonNullable<AdapterBusOptions["sleep"]>;

  constructor(options: AdapterBusOptions = {}) {
    this.policyCheck = options.policyCheck ?? (() => true);
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  register<TInput, TOutput>(adapter: GovernedOsintAdapter<TInput, TOutput>): void {
    if (this.adapters.has(adapter.metadata.id)) {
      throw new Error(`Adapter already registered: ${adapter.metadata.id}`);
    }
    if (adapter.metadata.timeoutMs <= 0 || adapter.metadata.maxRetries < 0 || (adapter.metadata.rateLimitPerMinute !== undefined && adapter.metadata.rateLimitPerMinute <= 0)) {
      throw new Error(`Invalid runtime limits for adapter: ${adapter.metadata.id}`);
    }
    this.adapters.set(adapter.metadata.id, adapter as GovernedOsintAdapter<unknown, unknown>);
  }

  list(): AdapterMetadata[] {
    return [...this.adapters.values()].map((adapter) => ({ ...adapter.metadata }));
  }

  async health(): Promise<Array<{ id: string; status: AdapterHealth; detail?: string }>> {
    return Promise.all([...this.adapters.values()].map(async (adapter) => ({ id: adapter.metadata.id, ...(await adapter.health()) })));
  }

  async run<TInput, TOutput>(adapterId: string, input: TInput, context: AdapterContext): Promise<AdapterExecutionResult<TOutput>> {
    const adapter = this.adapters.get(adapterId) as GovernedOsintAdapter<TInput, TOutput> | undefined;
    if (!adapter) throw new Error(`Unknown adapter: ${adapterId}`);

    const started = Date.now();
    const executionClass = adapter.metadata.executionClass ?? "passive_public";
    if (["active_recon", "identity_enumeration", "prohibited"].includes(executionClass)) {
      return this.result<TOutput>(adapterId, "failed", started, 0, [], [`Adapter execution class ${executionClass} is disabled on the default OSINT bus`], undefined, "execution_class_denied");
    }
    if (adapter.metadata.defaultEnabled === false) {
      return this.result<TOutput>(adapterId, "failed", started, 0, [], ["Adapter is disabled by default"], undefined, "adapter_disabled");
    }
    if (context.signal?.aborted) {
      return this.result<TOutput>(adapterId, "cancelled", started, 0, [], [], undefined, "cancelled");
    }

    const health = await adapter.health();
    if (health.status === "not_configured" || health.status === "unavailable") {
      return this.result<TOutput>(adapterId, "failed", started, 0, [], [health.detail ?? health.status], undefined, health.status);
    }

    const allowed = await this.policyCheck(adapter.metadata, context);
    if (!allowed) {
      return this.result<TOutput>(adapterId, "failed", started, 0, [], ["Policy gate denied adapter execution"], undefined, "policy_denied");
    }

    const maxAttempts = adapter.metadata.maxRetries + 1;
    let lastError = "unknown_error";
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (context.signal?.aborted) {
        return this.result<TOutput>(adapterId, "cancelled", started, attempt - 1, [], [], undefined, "cancelled");
      }
      try {
        await this.acquireRateLimit(adapter.metadata);
        const output = await this.withTimeout(adapter.execute(input, context), adapter.metadata.timeoutMs, context.signal);
        return this.result<TOutput>(adapterId, output.warnings?.length ? "partial" : "completed", started, attempt, output.evidence, output.warnings ?? [], output.data);
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (lastError === "adapter_timeout") {
          if (attempt === maxAttempts) return this.result<TOutput>(adapterId, "timed_out", started, attempt, [], [], undefined, lastError);
        } else if (lastError === "adapter_cancelled") {
          return this.result<TOutput>(adapterId, "cancelled", started, attempt, [], [], undefined, lastError);
        } else if (attempt === maxAttempts) {
          return this.result<TOutput>(adapterId, "failed", started, attempt, [], [], undefined, lastError);
        }
        await this.sleep(Math.min(250 * attempt, 1000));
      }
    }

    return this.result<TOutput>(adapterId, "failed", started, maxAttempts, [], [], undefined, lastError);
  }

  private async acquireRateLimit(metadata: AdapterMetadata): Promise<void> {
    const limit = Math.max(1, Math.trunc(metadata.rateLimitPerMinute ?? 60));
    for (;;) {
      const now = Date.now();
      const cutoff = now - 60_000;
      const current = (adapterRequestWindows.get(metadata.id) ?? []).filter((timestamp) => timestamp > cutoff);
      if (current.length < limit) {
        current.push(now);
        adapterRequestWindows.set(metadata.id, current);
        return;
      }
      const waitMs = Math.max(10, current[0]! + 60_000 - now);
      await this.sleep(waitMs);
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abortHandler: (() => void) | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("adapter_timeout")), timeoutMs);
      if (signal) {
        abortHandler = () => reject(new Error("adapter_cancelled"));
        signal.addEventListener("abort", abortHandler, { once: true });
      }
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
      if (signal && abortHandler) signal.removeEventListener("abort", abortHandler);
    }
  }

  private result<T>(adapterId: string, status: AdapterExecutionResult<T>["status"], started: number, attempts: number, evidence: AdapterEvidence[], warnings: string[], data?: T, error?: string): AdapterExecutionResult<T> {
    return { adapterId, status, data, evidence, warnings, attempts, durationMs: Math.max(0, Date.now() - started), error };
  }
}

export function buildAdapterEvidence(input: Omit<AdapterEvidence, "id" | "retrievedAt" | "provenanceHash">): AdapterEvidence {
  const retrievedAt = new Date().toISOString();
  return {
    ...input,
    id: `adapter-${hashValue({ ...input, retrievedAt }).slice(0, 16)}`,
    retrievedAt,
    provenanceHash: hashValue({ ...input, retrievedAt }),
  };
}

export function clearOsintAdapterRateLimitsForTests(): void {
  adapterRequestWindows.clear();
}
