# @disha/evidence-ledger

Evidence Ledger v3 — the single source of truth for all intelligence outputs.

**Governing documents**
- `CONSTITUTION.md` (Article IV)
- `docs/EVIDENCE_LEDGER_V3.md`

## Features

- Append-only
- Cryptographic hash chaining (SHA-256)
- Deterministic canonical serialization
- Chain verification
- Pluggable store (InMemory for dev, Postgres for production)

## Usage

```ts
import { EvidenceLedger, InMemoryEvidenceStore } from "@disha/evidence-ledger";

const ledger = new EvidenceLedger(new InMemoryEvidenceStore());

const { event } = await ledger.append({
  actor: { type: "adapter", id: "github-user" },
  type: "observation",
  payload: { username: "example", exists: true },
  sources: [{ adapterId: "github-user", url: "https://api.github.com/..." }],
  verification: "OBSERVED",
  policyContext: {
    policyId: "default",
    decision: "allow",
    reasons: ["public data"],
  },
  missionId: "mission_01",
});
```

Only `VERIFIED` findings may appear in authoritative reports without caveat.
