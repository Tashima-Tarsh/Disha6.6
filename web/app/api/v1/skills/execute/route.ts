import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { executeSkill } from "@/lib/skills/skill-registry";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    try {
      const body = await req.json();
      const { skillId, taskPrompt, params } = body;

      if (!skillId) {
        return NextResponse.json({ error: "Missing skillId parameter" }, { status: 400 });
      }

      const result = await executeSkill(skillId, {
        missionId: `mission-skill-${Date.now()}`,
        actor: ctx.principal.email || "officer@disha.defense",
        taskPrompt: taskPrompt || "Execute standard verification task",
        params,
      });

      return NextResponse.json(result, {
        headers: { "X-Request-ID": ctx.requestId },
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed executing skill" }, { status: 500 });
    }
  });
}

