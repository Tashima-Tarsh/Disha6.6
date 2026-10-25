import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { executeSkill, getSkillById, type SkillExecutionResult } from "@/lib/skills/skill-registry";

/**
 * A bounded n8n-compatible execution bridge. n8n owns schedules, retries and
 * human approval UX; DISHA owns identity, policy, execution and evidence.
 *
 * This endpoint does not execute arbitrary CLI commands, URLs, workflow code,
 * or unauthorised network scans. It can address any *registered* skill but
 * reports the underlying runner's actual status (including NOT_EXECUTED).
 */
const stepSchema = z.strictObject({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  skillId: z.string().min(1).max(160),
  taskPrompt: z.string().min(1).max(4000),
  params: z.record(z.string(), z.unknown()).optional(),
  dependsOn: z.array(z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/)).max(8).default([]),
});

const workflowSchema = z.strictObject({
  correlationId: z.string().min(1).max(128).optional(),
  steps: z.array(stepSchema).min(1).max(8),
});

export type GovernedSkillStepResult = {
  id: string;
  skillId: string;
  status: SkillExecutionResult["status"] | "SKIPPED_DEPENDENCY";
  summary: string;
  evidenceId?: string;
  artifactHash?: string;
};

/** Exportable for independently testable dependency and status semantics. */
export function validateWorkflowSteps(
  steps: z.infer<typeof stepSchema>[],
): string | null {
  const seen = new Set<string>();
  for (const step of steps) {
    if (seen.has(step.id)) return `duplicate_step_id:${step.id}`;
    if (step.dependsOn.includes(step.id)) return `cyclic_self_dependency:${step.id}`;
    for (const dep of step.dependsOn) {
      if (!seen.has(dep)) return `dependency_must_precede_step:${step.id}:${dep}`;
    }
    if (!getSkillById(step.skillId)) return `unregistered_skill:${step.skillId}`;
    seen.add(step.id);
  }
  return null;
}

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 32_768) {
      return NextResponse.json({ error: "workflow_payload_too_large" }, { status: 413 });
    }

    let incoming: unknown;
    try {
      incoming = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const parsed = workflowSchema.safeParse(incoming);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_skill_workflow", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { steps, correlationId } = parsed.data;
    const validationError = validateWorkflowSteps(steps);
    if (validationError) {
      return NextResponse.json(
        { error: "invalid_skill_workflow", reason: validationError },
        { status: validationError.startsWith("unregistered_skill:") ? 404 : 400 },
      );
    }

    // Server-generated and fresh: untrusted n8n clients cannot claim ownership
    // of an existing evidence-ledger mission simply by submitting its ID.
    const missionId = `n8n-skills-${crypto.randomUUID()}`;
    const actor = ctx.principal.userId;
    const results: GovernedSkillStepResult[] = [];
    const completed = new Set<string>();
    let blocked = false;

    for (const step of steps) {
      if (blocked || step.dependsOn.some((dep) => !completed.has(dep))) {
        results.push({
          id: step.id,
          skillId: step.skillId,
          status: "SKIPPED_DEPENDENCY",
          summary: "Not run: a preceding step did not succeed.",
        });
        continue;
      }
      // No caller-supplied actor or principal; the authenticated identity
      // is threaded into every sub-execution and approval check.
      const result = await executeSkill(step.skillId, {
        missionId,
        actor,
        principal: ctx.principal,
        taskPrompt: step.taskPrompt,
        params: step.params,
      });
      results.push({
        id: step.id,
        skillId: step.skillId,
        status: result.status,
        summary: result.summary,
        evidenceId: result.evidenceId,
        artifactHash: result.artifactHash,
      });
      if (result.status === "SUCCESS" && result.evidenceId) {
        completed.add(step.id);
      } else {
        // A policy refusal, unsupported skill or missing evidence cannot be
        // silently passed to subsequent nodes as successful work.
        blocked = true;
      }
    }

    const succeeded = completed.size === steps.length;
    // Fail closed: the workflow verdict itself must be ledger-recorded. The
    // underlying executeSkill separately appends attempt/result events.
    let workflowEvidenceId: string;
    try {
      const entry = await appendEvidenceEvent({
        missionId,
        actor,
        action: "n8n_skill_workflow_completed",
        input: {
          correlationId,
          stepIds: steps.map((step) => step.id),
          skillIds: steps.map((step) => step.skillId),
        },
        output: {
          status: succeeded ? "COMPLETED" : "STOPPED",
          results,
        },
      });
      workflowEvidenceId = entry.eventId;
    } catch {
      return NextResponse.json(
        { error: "evidence_write_failed", missionId, workflowStatus: "UNVERIFIED" },
        { status: 503, headers: { "X-Request-ID": ctx.requestId } },
      );
    }

    return NextResponse.json(
      {
        workflow: "disha-governed-skills",
        workflowStatus: succeeded ? "COMPLETED" : "STOPPED",
        missionId,
        correlationId,
        workflowEvidenceId,
        results,
      },
      {
        status: succeeded ? 200 : 422,
        headers: { "X-Request-ID": ctx.requestId, "Cache-Control": "no-store" },
      },
    );
  });
}
