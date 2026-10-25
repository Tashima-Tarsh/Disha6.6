import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { dispatchRole, getRoleById } from "@/lib/skills/skill-registry";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    try {
      const body = await req.json();
      const { roleId, objective, context, maxSteps, tokenBudget, approvalGrantId } = body;

      if (!roleId || typeof roleId !== "string") {
        return NextResponse.json({ error: "roleId is required" }, { status: 400 });
      }

      if (!objective || typeof objective !== "string") {
        return NextResponse.json({ error: "objective is required" }, { status: 400 });
      }

      const role = getRoleById(roleId);
      if (!role) {
        return NextResponse.json(
          { error: `Role '${roleId}' not found in registry.` },
          { status: 404 }
        );
      }

      const result = await dispatchRole(roleId, {
        missionId: `mission-role-${Date.now()}`,
        actor: ctx.principal.email || ctx.principal.userId,
        principal: ctx.principal,
        objective,
        context,
        maxSteps,
        tokenBudget,
        approvalGrantId,
      });

      return NextResponse.json(result, {
        headers: { "X-Request-ID": ctx.requestId },
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || "Failed dispatching role" },
        { status: 500 }
      );
    }
  });
}
