# @disha/orchestrator

Constitutional Orchestrator — the single entry point that enforces the unique product loop.

```
Adapter Bus → Evidence Ledger → Mission → Human Review → VERIFIED
```

## Usage

```ts
import { ConstitutionalOrchestrator } from "@disha/orchestrator";
import { githubUserAdapter } from "@disha/adapter-github-user";

const orch = new ConstitutionalOrchestrator();
orch.registerAdapter(githubUserAdapter);

const mission = orch.createMission("Investigate example user", {
  type: "human",
  id: "analyst-1",
});
orch.activateMission(mission.id, { type: "human", id: "analyst-1" });

const result = await orch.runAdapters({
  missionId: mission.id,
  adapterIds: ["github-user"],
  input: { username: "octocat" },
  actor: { type: "human", id: "analyst-1" },
});

// result.evidenceEvents are now in the Ledger
// result.reviewItemsCreated > 0 means human review is required for VERIFIED
```

## Constitutional guarantees

- No adapter can be called outside the Bus
- Every observation becomes an EvidenceEvent
- Only human review can produce VERIFIED
- Hash chain can be verified at any time
