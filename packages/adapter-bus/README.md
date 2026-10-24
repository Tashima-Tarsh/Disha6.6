# @disha/adapter-bus

The **only** permitted gateway for external observations.

**Governing documents**
- CONSTITUTION.md (Article V)
- docs/ADAPTER_BUS.md

## Rules enforced by the Bus

1. Every adapter must emit EvidenceEvents
2. High-risk adapters default to proposal-only
3. Per-adapter timeouts
4. Partial failure is allowed; cascade failure is forbidden
5. No adapter may write directly to the Evidence Ledger — it only emits events

## Usage

```ts
import { AdapterBus } from "@disha/adapter-bus";

const bus = new AdapterBus();
bus.register(githubUserAdapter);

const result = await bus.execute({
  adapterIds: ["github-user"],
  input: { username: "example" },
  context: {
    actor: { type: "human", id: "analyst-1" },
    missionId: "mission_01",
  },
});
```
