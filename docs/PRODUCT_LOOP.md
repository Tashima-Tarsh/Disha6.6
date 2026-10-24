# The Complete Unique Product Loop

```
Source → Adapter Bus → EvidenceEvent (OBSERVED)
                              ↓
                         Mission Engine
                              ↓
                    Human Review Queue
                              ↓
              elevate_verified / reject / request_more
                              ↓
                    VERIFIED or REJECTED
                              ↓
                    Authoritative Report
```

## Rules enforced end-to-end

1. No adapter may skip the Bus.
2. Every adapter result must produce EvidenceEvents.
3. Models/agents may only produce PREDICTED or INFERRED.
4. Only a human Review action can create VERIFIED.
5. Every transition is itself an EvidenceEvent (or will be).

This loop is what makes Disha unique in the world.
