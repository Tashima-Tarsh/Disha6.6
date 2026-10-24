/**
 * Thin Constitutional API
 *
 * Exposes the Orchestrator over HTTP.
 * All routes that touch intelligence go through the constitutional loop.
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { ConstitutionalOrchestrator } from "@disha/orchestrator";
import { githubUserAdapter } from "@disha/adapter-github-user";
import { dnsAdapter } from "@disha/adapter-dns";
import { waybackAdapter } from "@disha/adapter-wayback";
import { crtshAdapter } from "@disha/adapter-crtsh";
import { ipLookupAdapter } from "@disha/adapter-ip-lookup";

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.DISHA_API_KEY;

const orch = new ConstitutionalOrchestrator();
orch.registerAdapter(githubUserAdapter);
orch.registerAdapter(dnsAdapter);
orch.registerAdapter(waybackAdapter);
orch.registerAdapter(crtshAdapter);
orch.registerAdapter(ipLookupAdapter);

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body, null, 2));
}

function requireAuth(req: IncomingMessage, res: ServerResponse): boolean {
  if (!API_KEY) {
    json(res, 503, { error: "DISHA_API_KEY not configured. Refusing to operate open." });
    return false;
  }
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${API_KEY}`) {
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

  // Health is open
  if (path === "/health" && method === "GET") {
    return json(res, 200, {
      status: "ok",
      constitutional: true,
      adapters: orch.bus.list().map((r) => r.adapter.id),
      authRequired: true,
      configured: Boolean(API_KEY),
    });
  }

  if (!requireAuth(req, res)) return;

  try {
    // Create mission
    if (path === "/v1/missions" && method === "POST") {
      const body = await readBody(req);
      const actor = body.actor || { type: "human", id: "api-user" };
      const mission = orch.createMission(body.title || "Untitled", actor, body.description);
      if (body.activate) orch.activateMission(mission.id, actor);
      return json(res, 201, mission);
    }

    // Activate mission
    if (path.match(/^\/v1\/missions\/[^/]+\/activate$/) && method === "POST") {
      const id = path.split("/")[3];
      const body = await readBody(req);
      const actor = body.actor || { type: "human", id: "api-user" };
      const mission = orch.activateMission(id, actor);
      return json(res, 200, mission);
    }

    // Run adapters
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

    // List pending reviews
    if (path === "/v1/reviews" && method === "GET") {
      const missionId = url.searchParams.get("missionId") || undefined;
      return json(res, 200, { items: orch.reviews.listPending(missionId) });
    }

    // Submit review decision
    if (path.match(/^\/v1\/reviews\/[^/]+$/) && method === "POST") {
      const id = path.split("/")[3];
      const body = await readBody(req);
      const actor = body.actor || { type: "human", id: "api-user" };
      const result = await orch.review(id, body.decision, actor, body.notes);
      return json(res, 200, result);
    }

    // Integrity check
    if (path === "/v1/integrity" && method === "GET") {
      const missionId = url.searchParams.get("missionId") || undefined;
      const result = await orch.verifyIntegrity(missionId);
      return json(res, 200, result);
    }

    // List adapters
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
  console.log(`Disha Constitutional API listening on :${PORT}`);
  if (!API_KEY) console.warn("WARNING: DISHA_API_KEY not set. All routes except /health will return 503.");
});
