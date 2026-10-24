# Phase 1 — Evidence Ledger v3 + Adapter Bus

**Status**: Foundation code landed on branch `phase-0-wire-security`

## What is now present

- `@disha/contracts` — canonical types
- `@disha/evidence-ledger` — hash-chained ledger with in-memory store + verification

## Next implementation steps (Phase 1)

1. Postgres-backed EvidenceStore (production)
2. Minimal Adapter Bus that forces every adapter to emit EvidenceEvents
3. First 5–8 high-quality public adapters migrated behind the Bus
4. Policy Gateway that records every decision as an EvidenceEvent
5. Simple Mission model that ties events together

## Uniqueness impact

Once the Ledger and Bus are live, every intelligence output becomes reconstructible by design. This is the core differentiator that no other open OSINT/AI platform currently offers with the same rigor.
