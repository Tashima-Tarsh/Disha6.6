import { NextResponse } from "next/server";
import { executeSkill } from "@/lib/skills/skill-registry";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { skillId?: string; taskPrompt?: string; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { skillId, taskPrompt, params } = body;
  if (!skillId || typeof skillId !== "string") {
    return NextResponse.json({ error: "skillId is required" }, { status: 400 });
  }

  const missionId = `skill-api-${Date.now()}`;
  const actor = "operator";

  const result = await executeSkill(skillId, {
    missionId,
    actor,
    taskPrompt: taskPrompt ?? skillId,
    params: params ?? {},
  });

  try {
    await appendEvidenceEvent({
      missionId,
      actor,
      action: "skill_executed_from_api",
      input: { skillId },
      output: { status: result.status },
    });
  } catch {}

  return NextResponse.json(result);
}
