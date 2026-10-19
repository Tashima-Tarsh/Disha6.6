import { signAccessToken } from "../web/lib/server/auth.ts";

async function test() {
  const token = signAccessToken({
    userId: "admin@local.disha",
    email: "admin@local.disha",
    roles: ["admin", "analyst"],
    sessionVersion: 1,
  });

  const headers = {
    "Content-Type": "application/json",
    Cookie: `disha_access=${token}`,
  };

  console.log("1. Creating investigation for Sangeetastar9818...");
  const createRes = await fetch("http://127.0.0.1:3000/api/v1/osint/investigations", {
    method: "POST",
    headers,
    body: JSON.stringify({
      target: "Sangeetastar9818",
      targetType: "auto",
      searchUniverse: "universal",
      investigationMode: "standard",
      sourcePolicy: "all_approved",
      jurisdiction: "india",
      timeRange: "30d",
      identityAuthorization: true,
      activeAuthorization: true,
      selectedToolIds: [],
    }),
  });

  const inv = await createRes.json();
  console.log("Created:", inv.investigationId, "Status:", inv.status, "Runs:", inv.runs?.length, "Error:", inv.error);
  if (!inv.investigationId) return;

  console.log("2. Advancing investigation...");
  let current = inv;
  for (let i = 0; i < 5 && current.status !== "COMPLETED"; i++) {
    const runRes = await fetch(`http://127.0.0.1:3000/api/v1/osint/investigations/${inv.investigationId}/run`, {
      method: "POST",
      headers,
    });
    current = await runRes.json();
    console.log(`Step ${i + 1}: status=${current.status}, evidence=${current.evidence?.length}`);
    for (const r of current.runs || []) {
      console.log(`  - [${r.status}] ${r.adapterId} (evidence: ${r.evidenceCount}, error: ${r.error || "none"})`);
    }
  }

  console.log("Final evidence count:", current.evidence?.length);
  console.log("Final findings count:", current.rankedFindings?.length);
}

test().catch(console.error);
