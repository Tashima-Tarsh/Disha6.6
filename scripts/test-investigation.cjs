const crypto = require("crypto");

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function signJson(payload, secret) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

const secret = "a6ca4e82595be038be73d2f557436190db1ca1b347d6f58a5eb7d434921acf92";
const token = signJson(
  {
    sub: "admin@local.disha",
    email: "admin@local.disha",
    roles: ["admin", "operator", "analyst"],
    sessionId: "sess_test_123",
    typ: "access",
    jti: "jti_123",
    exp: Math.floor(Date.now() / 1000) + 3600,
  },
  secret
);

async function run() {
  const csrf = "test_csrf_token_123";
  const headers = {
    "Content-Type": "application/json",
    Cookie: `disha_access=${token}; disha_csrf=${csrf}`,
    "x-csrf-token": csrf,
  };

  console.log("1. Testing GET /api/v1/osint/tools...");
  const toolsRes = await fetch("http://127.0.0.1:3000/api/v1/osint/tools?limit=10", { headers });
  console.log("Tools status:", toolsRes.status);
  const toolsData = await toolsRes.json();
  console.log("Tools count:", toolsData.tools ? toolsData.tools.length : toolsData);

  console.log("\n2. Creating investigation for Sangeetastar9818...");
  const createRes = await fetch("http://127.0.0.1:3000/api/v1/osint/investigations", {
    method: "POST",
    headers,
    body: JSON.stringify({
      target: "Sangeetastar9818",
      targetType: "username",
      searchUniverse: "person",
      investigationMode: "standard",
      sourcePolicy: "all_approved",
      jurisdiction: "india",
      timeRange: "30d",
      identityAuthorization: true,
      activeAuthorization: true,
      selectedToolIds: ["sherlock", "maigret"],
    }),
  });

  console.log("Create status:", createRes.status);
  const inv = await createRes.json();
  console.log("Created investigation:", inv.investigationId, "Status:", inv.status, "Runs:", inv.runs?.length, "Error:", inv.error);
  if (!inv.investigationId) return;

  console.log("\n3. Running investigation steps...");
  let current = inv;
  for (let i = 0; i < 60 && current.status !== "COMPLETED" && current.status !== "FAILED"; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const runRes = await fetch(`http://127.0.0.1:3000/api/v1/osint/investigations/${inv.investigationId}/run`, {
      method: "POST",
      headers,
    });
    current = await runRes.json();
    console.log(`Step ${i + 1}: status=${current.status}, evidence count=${current.evidence?.length}`);
    for (const r of current.runs || []) {
      if (r.status !== "QUEUED") {
        console.log(`  - [${r.status}] ${r.sourceName} (${r.adapterId}): ev=${r.evidenceCount}, err=${r.error || "none"}`);
      }
    }
  }

  console.log("\n--- Final Evidence ---");
  for (const ev of current.evidence || []) {
    console.log(`[${ev.sourceName}] ${ev.summary}`);
  }

  console.log("\n--- Final Ranked Findings ---");
  for (const f of current.rankedFindings || []) {
    console.log(`[${f.primarySource}] ${f.summary || f.title}`);
  }
}

run().catch(console.error);
