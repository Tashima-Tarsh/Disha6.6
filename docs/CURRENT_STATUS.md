# Disha 6.6 — Current Constitutional Status

**Last updated**: 24 October 2026

## What is now unique and real

| Component | Package | Status |
|-----------|---------|--------|
| Constitution | `CONSTITUTION.md` | Binding |
| Canonical contracts | `@disha/contracts` | Merged |
| Evidence Ledger v3 | `@disha/evidence-ledger` | Merged |
| Adapter Bus | `@disha/adapter-bus` | Merged |
| Mission Engine | `@disha/mission` | Merged |
| Human Review Queue | `@disha/review` | Merged |
| Constitutional Orchestrator | `@disha/orchestrator` | This PR |
| Governed adapters | github-user, dns, wayback | Merged |

## The unique loop (now enforceable in code)

```
Source → Adapter Bus → EvidenceEvent (OBSERVED/INFERRED/...)
                              ↓
                         Mission Engine
                              ↓
                    Human Review Queue
                              ↓
              elevate_verified / reject / request_more
                              ↓
                    VERIFIED or REJECTED
```

**No model or agent can create a VERIFIED finding.**  
Only a human review action can.

## Still required for production

1. Wire `Depends(require_api_key)` + CORS + path sandbox into the large `backend/app.py` (see `backend/SECURE_WIRING.md`)
2. Postgres-backed EvidenceStore (replace InMemory)
3. More high-quality public adapters
4. Simple HTTP/API surface that exposes the Orchestrator
5. Premium Workbench UI that visualises the evidence chain

## Positioning (locked)

> “The only intelligence platform where every conclusion is reconstructible, policy-checked, and human-reviewable by design.”
