/**
 * Thin Constitutional API
 *
 * Production: DATABASE_URL required for durable ledger; missing `pg` fails startup.
 * Reviewer identity is taken from authenticated context, never trusted from the body alone.
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import crypto from "node:crypto";
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
const NODE_ENV = process.env.NODE_ENV || "development";
const REQUIRE_POSTGRES = process.env.DISHA_REQUIRE_POSTGRES === "1" || NODE_ENV === "production";

let pool: any = undefined;
if (process.env.DATABASE_URL) {
  try {
    const { Pool } = require("pg");
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    console.log("Using PostgresEvidenceStore");
  } catch (e: any) {
    const msg = `DATABASE_URL is set but Postgres client failed: ${e?.message ?? e}`;
    if (REQUIRE_POSTGRES) {
      console.error("FATAL (fail-closed):", msg);
      process.exit(1);
    }
    console.warn(msg, "— falling back to in-memory store (non-production only)");
  }
} else if (REQUIRE_POSTGRES) {
  console.error(
    "FATAL (fail-closed): NODE_ENV=production or DISHA_REQUIRE_POSTGRES=1 requires DATABASE_URL"
  );
  process.exit(1);
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

function verifyHumanReviewerAssertion(token: string): { valid: boolean; userId?: string; role?: string } {
  try {
    const secret = process.env.DISHA_REVIEWER_SECRET || process.env.DISHA_JWT_SECRET;
    if (!secret) return { valid: false };

    // Support both standard header.payload.signature and HMAC-SHA256 assertion
    const parts = token.split(".");
    if (parts.length === 3) {
      const [headerB64, payloadB64, sigB64] = parts;
      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest("base64url");
      if (sigB64 !== expectedSig) return { valid: false };

      const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return { valid: false };
      if (payload.typ !== "human_reviewer" && payload.typ !== "access") return { valid: false };
      const roles = Array.isArray(payload.roles) ? payload.roles : [payload.role];
      const isReviewerOrAdmin = roles.includes("reviewer") || roles.includes("admin") || roles.includes("operator");
      if (!isReviewerOrAdmin) return { valid: false };

      return { valid: true, userId: payload.sub || payload.userId, role: roles[0] };
    }
  } catch {
    return { valid: false };
  }
  return { valid: false };
}

/**
 * Resolve the acting principal from authenticated request context.
 * Service API keys resolve as 'system' principal.
 * Human principal requires cryptographically verified X-Disha-Reviewer-Token.
 */
function principalFromRequest(req: IncomingMessage, body?: any): {
  type: "human" | "system" | "adapter" | "agent";
  id: string;
  displayName?: string;
  reviewerRole?: string;
} {
  const hdrId = (req.headers["x-disha-actor-id"] as string | undefined)?.trim();
  const hdrType = (req.headers["x-disha-actor-type"] as string | undefined)?.trim();
  const hdrName = (req.headers["x-disha-actor-name"] as string | undefined)?.trim();
  const reviewerToken = (req.headers["x-disha-reviewer-token"] as string | undefined)?.trim();

  // If caller asserts human identity, require cryptographic verification
  if (hdrType === "human" || reviewerToken) {
    if (reviewerToken) {
      const verification = verifyHumanReviewerAssertion(reviewerToken);
      if (verification.valid) {
        return {
          type: "human",
          id: verification.userId || hdrId || "verified-human-reviewer",
          displayName: hdrName || body?.actor?.displayName || "Verified Human Reviewer",
          reviewerRole: verification.role,
        };
      }
    }
    // API-key caller without valid human assertion token cannot claim human identity
  }

  // Adapter or agent if explicitly indicated in authenticated context
  let resolvedType: "system" | "adapter" | "agent" = "system";
  if (hdrType === "adapter") resolvedType = "adapter";
  else if (hdrType === "agent") resolvedType = "agent";

  return {
    type: resolvedType,
    id: hdrId || "api-key-system-principal",
    displayName: hdrName || body?.actor?.displayName || "System Service Caller",
  };
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
      failClosed: REQUIRE_POSTGRES,
      adapters: orch.bus.list().map((r) => r.adapter.id),
      authRequired: true,
      configured: Boolean(API_KEY),
    });
  }

  if (!requireAuth(req, res)) return;

  try {
    if (path === "/v1/missions" && method === "POST") {
      const body = await readBody(req);
      const actor = principalFromRequest(req, body);
      const mission = orch.createMission(body.title || "Untitled", actor, body.description);
      if (body.activate) orch.activateMission(mission.id, actor);
      return json(res, 201, mission);
    }

    if (path.match(/^\/v1\/missions\/[^/]+\/activate$/) && method === "POST") {
      const id = path.split("/")[3];
      const body = await readBody(req);
      const actor = principalFromRequest(req, body);
      return json(res, 200, orch.activateMission(id, actor));
    }

    if (path.match(/^\/v1\/missions\/[^/]+\/run$/) && method === "POST") {
      const id = path.split("/")[3];
      const body = await readBody(req);
      const actor = principalFromRequest(req, body);
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
      // Critical: never accept body.actor as the reviewer of record.
      const actor = principalFromRequest(req, body);
      if (body.actor?.id && body.actor.id !== actor.id) {
        return json(res, 403, {
          error: "Caller-supplied reviewer identity is not accepted; use X-Disha-Actor-Id header",
        });
      }
      if (actor.type !== "human" && body.decision === "elevate_verified") {
        return json(res, 403, {
          error:
            "Only an independently verified human reviewer (via cryptographic X-Disha-Reviewer-Token) may elevate evidence to VERIFIED. Service API keys cannot attest human reviewer identity.",
        });
      }
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
