/**
 * Thin Constitutional API
 * Uses Postgres when DATABASE_URL + pool are available, otherwise in-memory.
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { createOrchestrator } from "@disha/orchestrator";
import { githubUserAdapter } from "@disha/adapter-github-user";
import { dnsAdapter } from "@disha/adapter-dns";
import { waybackAdapter } from "@disha/adapter-wayback";
import { crtshAdapter } from "@disha/adapter-crtsh";
import { ipLookupAdapter } from "@disha/adapter-ip-lookup";
import { httpHeadersAdapter } from "@disha/adapter-http-headers";
import { rdapDomainAdapter } from "@disha/adapter-rdap-domain";
import { githubRepoAdapter } from "@disha/adapter-github-repo";

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.DISHA_API_KEY;

// Optional Postgres: set DATABASE_URL and install `pg`, then pass pool into createOrchestrator
let pool: any = undefined;
if (process.env.DATABASE_URL) {
  try {
    // Dynamic require so the package stays optional at build time
    const { Pool } = require("pg");
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    console.log("Using PostgresEvidenceStore");
  } catch {
    console.warn("DATABASE_URL set but `pg` not available — falling back to in-memory store");
  }
}

const orch = createOrchestrator(pool ? { pool } : {});

const adapters = [
  githubUserAdapter,
  dnsAdapter,
  waybackAdapter,
  crtshAdapter,
  ipLookupAdapter,
  httpHeadersAdapter,
  rdapDomainAdapter,
  githubRepoAdapter,
];
adapters.forEach((a) => orch.registerAdapter(a));

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body, null, 2));
}

function requireAuth(req: IncomingMessage, res: ServerResponse): boolean {
  if (!API_KEY) {
    json(res, 503, { error: "DISHA_API_KEY not configured. Refusing to operate open." });
    return false;
  }
  if (req.headers.authorization !== `Bearer ${API_KEY}`) {
    json(res, 401, { error: "Unauthorized" });
    return false;
  }
  return true;
}

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method || "GET";

  if (path === "/health" && method === "GET") {
    return json(res, 200, {
      status: "ok",
      constitutional: true,
      store: pool ? "postgres" : "memory",
      adapters: orch.bus.list().map((r) => r.adapter.id),
      authRequired: true,
      configured: Boolean(API_KEY),
    });
  }

  if (!requireAuth(req, res)) return;

  try {
    if (path === "/v1/missions" && method === "POST") {
      const body = await readBody(req);
      const actor = body.actor || { type: "human", id: "api-user" };
      const mission = orch.createMission(body.title || "Untitled", actor, body.description);
      if (body.activate) orch.activateMission(mission.id, actor);
      return json(res, 201, mission);
    }

    if (path.match(/^\/v1\/missions\/[^/]+\/activate$/) && method === "POST") {
      const id = path.split("/")[3];
      const body = await readBody(req);
      const actor = body.actor || { type: "human", id: "api-user" };
      return json(res, 200, orch.activateMission(id, actor));
    }

    if (path.match(/^\/v1\/missions\/[^/]+\/run$/) && method === "POST") {
      const id = path.split("/")[3];
      const body = await readBody(req);
      const actor = body.actor || { type: "human", id: "api-user" };
      const result = await orch.runAdapters({
        missionId: id,
        adapterIds: body.adapterIds || [],
        input: body.input || {},
        actor,
      });
      return json(res, 200, {
        missionId: result.mission.id,
        evidenceCount: result.evidenceEvents.length,
        reviewItemsCreated: result.reviewItemsCreated,
        partial: result.busResult.partial,
        results: result.busResult.results,
      });
    }

    if (path === "/v1/reviews" && method === "GET") {
      const missionId = url.searchParams.get("missionId") || undefined;
      return json(res, 200, { items: orch.reviews.listPending(missionId) });
    }

    if (path.match(/^\/v1\/reviews\/[^/]+$/) && method === "POST") {
      const id = path.split("/")[3];
      const body = await readBody(req);
      const actor = body.actor || { type: "human", id: "api-user" };
      return json(res, 200, await orch.review(id, body.decision, actor, body.notes));
    }

    if (path === "/v1/integrity" && method === "GET") {
      const missionId = url.searchParams.get("missionId") || undefined;
      return json(res, 200, await orch.verifyIntegrity(missionId));
    }

    if (path === "/v1/adapters" && method === "GET") {
      return json(res, 200, {
        adapters: orch.bus.list().map((r) => ({
          id: r.adapter.id,
          name: r.adapter.name,
          category: r.adapter.category,
          riskLevel: r.adapter.riskLevel,
          enabled: r.enabled,
        })),
      });
    }

    json(res, 404, { error: "Not found" });
  } catch (e: any) {
    json(res, 400, { error: e?.message ?? String(e) });
  }
});

server.listen(PORT, () => {
  console.log(`Disha Constitutional API on :${PORT} (store=${pool ? "postgres" : "memory"})`);
  if (!API_KEY) console.warn("WARNING: DISHA_API_KEY not set. Authenticated routes return 503.");
});
