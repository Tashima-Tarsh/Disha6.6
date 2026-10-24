# Adapter Bus Specification

**Status**: Binding design target  
**Governing Principle**: Article V of the Constitution

---

## Purpose

The Adapter Bus is the **only** permitted gateway for external observations.  
It prevents ad-hoc collectors from bypassing policy, evidence emission, rate limits, isolation, and legal controls.

---

## Adapter Contract

```ts
interface Adapter {
  id: string;
  name: string;
  version: string;
  category: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  requiresApproval: boolean;
  legalBasis: string;
  dataSensitivity: "public" | "sensitive" | "restricted";
  rateLimit: { requests: number; windowMs: number };
  timeoutMs: number;

  execute(input: CanonicalInput, ctx: ExecutionContext): Promise<AdapterResult>;
}

interface AdapterResult {
  observations: Observation[];
  evidenceEvents: EvidenceEvent[];   // mandatory
  confidence: number;                // 0–1
  limitations: string[];
  errors?: string[];
}
```

---

## Bus Responsibilities

1. Discover and register adapters
2. Enforce timeout, retry, rate-limit, and mission budget
3. Inject execution context (mission, actor, policy snapshot)
4. Require emission of EvidenceEvents
5. Isolate failures (partial results are allowed; cascade failure is not)
6. Surface health and last-success metrics

---

## Execution Flow

1. Caller submits CanonicalInput + MissionContext
2. Bus evaluates policy for the requested adapter set
3. High-risk adapters may be forced to proposal-only
4. Adapters execute in parallel with individual timeouts
5. Results are normalized; EvidenceEvents are written to the Ledger
6. Aggregated result is returned with verification states

---

## Failure Modes (Graceful)

- Timeout → partial result + evidence of timeout
- Adapter error → recorded, does not fail the mission
- Policy deny → no execution + evidence of denial
- Budget exceeded → graceful degradation

---

## Implementation Rules

- Adapters run in isolated workers or containers
- Adapters never write directly to the Evidence Ledger; they only emit events
- Language-agnostic contract (JSON Schema or protobuf preferred)
