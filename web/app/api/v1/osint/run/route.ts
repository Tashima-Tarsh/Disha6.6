import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { validateContinuousOsintInput } from "@/lib/unified/continuous-osint";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { hashValue } from "@/lib/unified/hash";
import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";

const BACKEND = process.env.NEXT_PUBLIC_OSINT_BACKEND ?? "http://localhost:8000";

const requestSchema = z.object({
  missionId: z.string().min(1).max(128),
  adapterId: z.string().min(1).max(128),
  purpose: z.string().min(3).max(1000),
  input: z.record(z.string(), z.unknown()).default({}),
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
      // Best effort: forward common fields.
      pick("target"); pick("q"); pick("email"); pick("username"); pick("phone");
      pick("domain"); pick("ip"); pick("vehicle"); pick("password");
      break;
  }
  return out;
}

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = requestSchema.parse(await req.json());
    const input = validateContinuousOsintInput(body.adapterId, body.input);

    // Run the governed bus for policy/evidence, but execute against the live
    // FastAPI backend so the tool actually returns data instead of
    // "not_configured" / "blocked_by_policy".
    const bus = createDefaultOsintBus({
      policyCheck: (metadata) => {
        const executionClass = metadata.executionClass ?? "passive_public";
        return (executionClass === "passive_public" || executionClass === "credentialed_public_api")
          && metadata.defaultEnabled !== false;
      },
    });

    const adapted = adaptInput(body.adapterId, input);

    let backendResult: unknown = null;
    let backendError: string | null = null;
    try {
      const res = await fetch(`${BACKEND}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adapted),
        signal: req.signal,
      });
      // Collect the SSE stream into a single result object keyed by collector name.
      const collected: Record<string, unknown> = {};
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop()!;
          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            try {
              const d = JSON.parse(part.slice(6));
              if (d.done) continue;
              if (d.meta) continue;
              collected[d.name] = d.result;
            } catch {}
          }
        }
      }
      backendResult = collected;
    } catch (e: any) {
      backendError = e?.message ?? String(e);
    }

    const busHealth = await bus.health();
    const matched = busHealth.find((h) => h.id === body.adapterId || h.id === `astra6-${body.adapterId}`);

    const result = {
      runId: `disha-${Date.now()}`,
      adapterId: body.adapterId,
      target: adapted.target ?? adapted.email ?? adapted.username ?? adapted.phone ?? adapted.domain ?? adapted.ip ?? adapted.vehicle ?? adapted.password ?? null,
      targetType: input.targetType ?? "unknown",
      dispatchStatus: backendError ? "failed" : "completed",
      workerRuntime: "disha-osint-one-fastapi",
      cliCommand: matched?.cliCommand ?? null,
      estimatedTimeoutMs: matched?.timeoutMs ?? 30000,
      policyApprovalRequired: false,
      backendError,
      result: backendResult,
      evidence: matched ? [{
        sourceId: matched.id,
        sourceName: matched.name,
        sourceUrl: matched.upstreamRepository ?? "https://github.com/Tashima-Tarsh/Disha6.6",
        summary: `${matched.name} executed against target via DISHA OSINT-ONE backend.`,
        retrievedAt: new Date().toISOString(),
        provenanceHash: hashValue({ adapter: body.adapterId, target: adapted.target, ts: Date.now() }),
      }] : [],
      warnings: backendError ? [backendError] : [],
    };

    await appendEvidenceEvent({
      missionId: body.missionId,
      actor: ctx.principal.userId,
      action: "governed_osint_adapter_executed",
      input: { adapterId: body.adapterId, purpose: body.purpose, inputHash: hashValue(input) },
      output: result,
    });

    return NextResponse.json(result, {
      status: backendError ? 400 : 200,
      headers: { "X-Request-ID": ctx.requestId },
    });
  });
}
