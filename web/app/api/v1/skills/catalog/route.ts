import { NextRequest, NextResponse } from "next/server";
import { SkillsKnowledgeBase } from "@/lib/unified/skills-knowledge-base";
import { ReaMcpClient } from "@/lib/server/rea-mcp-client";

export async function GET(req: NextRequest) {
  try {
    const kb = SkillsKnowledgeBase.getInstance();
    const rea = ReaMcpClient.getInstance();
    const reaHealth = await rea.getHealth();

    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const query = url.searchParams.get("q");

    let skills = kb.getAllSkills();

    if (category) {
      skills = skills.filter((s) => s.category.toLowerCase() === category.toLowerCase());
    }

    if (query) {
      skills = kb.matchSkills(query, 50);
    }

    const categories = Array.from(new Set(kb.getAllSkills().map((s) => s.category)));

    return NextResponse.json({
      status: "ok",
      totalSkills: kb.getSkillCount(),
      returned: skills.length,
      categories,
      skills,
      reaEngine: {
        health: reaHealth.status,
        version: reaHealth.version,
        tools: rea.getTools(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
