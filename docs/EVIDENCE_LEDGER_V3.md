# Evidence Ledger v3 Specification

**Status**: Binding design target  
**Governing Principle**: Article IV of the Constitution

---

## Design Goals

- Append-only
- Tamper-evident via cryptographic hash chaining
- Queryable by mission, case, actor, verification state, and time range
- Support optional digital signatures for high-assurance environments
- Serve as the single source of truth for all intelligence outputs

---

## Core Type

```ts
interface EvidenceEvent {
  id: string;                    // ULID
  previousHash: string;          // Hash of previous event ("0" for genesis)
  hash: string;                  // SHA-256 of canonical serialization
  timestamp: string;             // ISO-8601
  actor: {
    type: "human" | "agent" | "system" | "adapter";
    id: string;
    displayName?: string;
  };
  type: "observation" | "claim" | "policy_decision" | "approval" | "finding" | "rejection";
  payload: unknown;
  sources: SourceReference[];
  verification: VerificationState;
  policyContext: {
    policyId: string;
    decision: "allow" | "deny" | "ask" | "propose";
    reasons: string[];
  };
  missionId?: string;
  caseId?: string;
  signature?: string;            // Optional
}
```

## Verification State Machine

```
OBSERVED ──────────────► CORRELATED
       │
       └───────────────► INFERRED
PREDICTED / INFERRED / CORRELATED ──► VERIFY_REQUIRED ──► VERIFIED
                                                     └──► REJECTED
```

Only `VERIFIED` may be presented as authoritative without caveat.

---

## Integration Rules

- Every adapter result **must** produce one or more EvidenceEvents.
- Every policy decision **must** produce an EvidenceEvent.
- Every human approval or rejection **must** produce an EvidenceEvent.
- Model and agent outputs are always `PREDICTED` or `INFERRED` until elevated.

---

## Storage Notes

- Primary store: PostgreSQL (recommended) or equivalent durable store.
- Large binary content is referenced by content-addressed storage, never embedded.
- Hash chain is verified on read for high-assurance queries.
- Optional Merkle tree can be added later for efficient range proofs.
