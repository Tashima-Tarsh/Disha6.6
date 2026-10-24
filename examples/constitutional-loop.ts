/**
 * Minimal example of the full constitutional loop.
 * Run after packages are linked in the monorepo.
 */

import { ConstitutionalOrchestrator } from "@disha/orchestrator";
import { githubUserAdapter } from "@disha/adapter-github-user";

async function main() {
  const orch = new ConstitutionalOrchestrator();
  orch.registerAdapter(githubUserAdapter);

  const analyst = { type: "human" as const, id: "analyst-1", displayName: "Lead Analyst" };

  // 1. Create and activate mission
  const mission = orch.createMission("Public profile check — octocat", analyst);
  orch.activateMission(mission.id, analyst);
  console.log("Mission created:", mission.id, mission.state);

  // 2. Run governed adapters (only path allowed)
  const result = await orch.runAdapters({
    missionId: mission.id,
    adapterIds: ["github-user"],
    input: { username: "octocat" },
    actor: analyst,
  });

  console.log("Evidence events written:", result.evidenceEvents.length);
  console.log("Review items created:", result.reviewItemsCreated);

  // 3. Verify hash chain integrity
  const integrity = await orch.verifyIntegrity(mission.id);
  console.log("Ledger integrity:", integrity.valid ? "VALID" : `BROKEN at ${integrity.brokenAt}`);

  // 4. Human review is the only way to VERIFIED
  // (In a real UI the analyst would call orch.review(...))
  console.log("\nNext step: human reviews the queue and may elevate to VERIFIED.");
}

main().catch(console.error);
