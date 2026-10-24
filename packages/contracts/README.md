# @disha/contracts

Canonical TypeScript contracts for the Constitutional Evidence Operating System.

**Governing document**: [`CONSTITUTION.md`](../../CONSTITUTION.md)

## Contents

- `VerificationState` — mandatory states for every piece of intelligence
- `EvidenceEvent` — immutable, hash-chained evidence record
- `Adapter` / `AdapterResult` — only permitted way to talk to the outside world
- `PolicyDecision` — result of the Policy Gateway
- `MissionState` — lifecycle states

## Rules

1. Models and agents may only produce `PREDICTED` or `INFERRED`.
2. Elevation to `VERIFIED` requires evidence + policy + human review.
3. Every adapter **must** emit `EvidenceEvent`s.
4. High-risk adapters are proposal-only by default.

These contracts are the rigid spine of Disha. All new code must conform.
