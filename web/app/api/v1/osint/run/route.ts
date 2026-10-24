import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { validateContinuousOsintInput } from "@/lib/unified/continuous-osint";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { hashValue } from "@/lib/unified/hash";
import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";

const BACKEND = process.env.NEXT_PUBLIC_OSINT_BACKEND ?? "http://localhost:8000";
const OSINT_API_KEY = process.env.DISHA_OSINT_API_KEY || process.env.OSINT_API_KEY;

const requestSchema = z.object({
  missionId: z.string().min(1).max(128),
  adapterId: z.string().min(1).max(128),
  purpose: z.string().min(3).max(1000),
  input: z.record(z.string(), z.unknown()).default({}),
  allowActive: z.boolean().optional().default(false),
});

// Map Disha adapter target types to FastAPI backend collector inputs.
function adaptInput(adapterId: string, input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  const pick = (k: string) => {
    const v = input[k];
    if (typeof v === "string" && v) out[k] = v;
  };
  switch (adapterId) {
    case "phoneinfoga":
    case "astra6-phoneinfoga":
      pick("phone"); pick("phone_number"); pick("target");
      break;
    case "sherlock":
    case "astra6-sherlock":
    case "maigret":
    case "astra6-maigret":
    case "theharvester":
    case "astra6-theharvester":
    case "amass":
    case "astra6-amass":
    case "subfinder":
    case "astra6-subfinder":
    case "spiderfoot":
    case "astra6-spiderfoot":
      pick("username"); pick("domain"); pick("target");
      break;
    case "holehe":
    case "astra6-holehe":
    case "email":
      pick("email"); pick("target");
      break;
    case "xposedornot":
    case "breach":
      pick("email"); pick("target");
      break;
    case "vehicle":
    case "india-vehicle-format":
    case "astra6-vehicle":
      pick("vehicle"); pick("target");
      break;
    case "ip":
    case "openosint-ip":
    case "astra6-ip":
      pick("ip"); pick("target");
      break;
    case "domain":
    case "certificate-transparency":
    case "wayback":
    case "crt":
      pick("domain"); pick("target");
      break;
    case "password":
    case "hibp":
      pick("password"); pick("target");
      break;
    default:
      pick("target"); pick("q"); pick("email"); pick("username"); pick("phone");
      pick("domain"); pick("ip"); pick("vehicle"); pick("password");
      break;
  }
  return out;
}

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    if (!OSINT_API_KEY) {
      return NextResponse.json(
        { error: "OSINT backend is not configured with DISHA_OSINT_API_KEY" },
        { status: 503, headers: { "X-Request-ID": ctx.requestId } }
      );
    }

    const body = requestSchema.parse(await req.json());
    const input = validateContinuousOsintInput(body.adapterId, body.input);

    const bus = createDefaultOsintBus({
      policyCheck: (metadata) => {
        const executionClass = metadata.executionClass ?? "passive_public";
        return (executionClass === "passive_public" || executionClass === "credentialed_public_api")
          && metadata.defaultEnabled !== false;
      },
    });

    const adapted = adaptInput(body.adapterId, input);

    let backendResult: unknown = null;
    let backendPayload: Record<string, unknown> | null = null;
    let backendError: string | null = null;
    let httpStatus = 200;

    try {
      const res = await fetch(`${BACKEND}/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OSINT_API_KEY}`,
        },
        body: JSON.stringify({
          ...adapted,
          missionId: body.missionId,
          allowActive: body.allowActive === true,
        }),
        signal: req.signal,
      });

      httpStatus = res.status;

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        backendError =
          res.status === 401
            ? "Backend authentication failed (missing or invalid Bearer token)"
            : `Backend returned HTTP ${res.status}: ${errBody.slice(0, 500)}`;
        backendResult = null;
      } else {
        const json = (await res.json()) as Record<string, unknown>;
        backendPayload = json;
        backendResult = json?.results ?? json;
      }
    } catch (e: any) {
      backendError = e?.message ?? String(e);
      httpStatus = 502;
    }

    const busHealth = await bus.health();
    const matched = busHealth.find((h) => h.id === body.adapterId || h.id === `astra6-${body.adapterId}`);

    const deniedByPolicy = Array.isArray(backendPayload?.deniedByPolicy)
      ? backendPayload!.deniedByPolicy
      : [];

    const result = {
      runId: `disha-${Date.now()}`,
      adapterId: body.adapterId,
      target:
        adapted.target ??
        adapted.email ??
        adapted.username ??
        adapted.phone ??
        adapted.domain ??
        adapted.ip ??
        adapted.vehicle ??
        null,
      targetType: input.targetType ?? "unknown",
      dispatchStatus: backendError ? "failed" : "completed",
      workerRuntime: "disha-osint-one-fastapi",
      cliCommand: matched?.cliCommand ?? null,
      estimatedTimeoutMs: matched?.timeoutMs ?? 30000,
      policyApprovalRequired: false,
      allowActive: body.allowActive === true,
      deniedByPolicy,
      backendError,
      result: backendResult,
      evidence:
        matched && !backendError
          ? [
              {
                sourceId: matched.id,
                sourceName: matched.name,
                sourceUrl: matched.upstreamRepository ?? "https://github.com/Tashima-Tarsh/Disha6.6",
                summary: `${matched.name} executed against target via DISHA OSINT-ONE backend.`,
                retrievedAt: new Date().toISOString(),
                provenanceHash: hashValue({
                  adapter: body.adapterId,
                  target: adapted.target,
                  ts: Date.now(),
                }),
              },
            ]
          : [],
      warnings: backendError ? [backendError] : [],
      ledgerEventIds: [] as string[],
    };

    // Authoritative chain: web Evidence Ledger (not Python proposal hashes).
    const parent = await appendEvidenceEvent({
      missionId: body.missionId,
      actor: ctx.principal.userId,
      action: "governed_osint_adapter_executed",
      input: {
        adapterId: body.adapterId,
        purpose: body.purpose,
        inputHash: hashValue(input),
        allowActive: body.allowActive === true,
      },
      output: {
        dispatchStatus: result.dispatchStatus,
        runId: result.runId,
        collectorCount:
          backendResult && typeof backendResult === "object"
            ? Object.keys(backendResult as object).length
            : 0,
        deniedCount: Array.isArray(deniedByPolicy) ? deniedByPolicy.length : 0,
        backendError: backendError,
      },
    });
    result.ledgerEventIds.push(parent.eventId);

    if (backendResult && typeof backendResult === "object" && !backendError) {
      for (const [collectorName, collectorResult] of Object.entries(
        backendResult as Record<string, unknown>,
      )) {
        const child = await appendEvidenceEvent({
          missionId: body.missionId,
          actor: `osint:${collectorName}`,
          action: "osint_observation",
          parentEventId: parent.eventId,
          input: {
            collector: collectorName,
            adapterId: body.adapterId,
            purpose: body.purpose,
          },
          output: {
            resultHash: hashValue(collectorResult),
            verification: "OBSERVED",
            // Size-capped summary only — full payload stays in backend; chain uses hashes.
            summary:
              typeof collectorResult === "object" && collectorResult !== null
                ? Object.keys(collectorResult as object).slice(0, 12)
                : typeof collectorResult,
          },
        });
        result.ledgerEventIds.push(child.eventId);
      }
    }

    return NextResponse.json(result, {
      status: backendError ? (httpStatus >= 400 && httpStatus < 600 ? httpStatus : 400) : 200,
      headers: { "X-Request-ID": ctx.requestId },
    });
  });
}
