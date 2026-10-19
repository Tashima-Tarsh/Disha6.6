import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { deepGithubForensicEngine } from "@/lib/unified/github-forensic-engine";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { getMission, canReadMission } from "@/lib/unified/orchestrator";

const githubForensicSchema = z.object({
  target: z.string().min(1).max(128),
  missionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    const body = await req.json();
    const { target, missionId } = githubForensicSchema.parse(body);

    if (missionId) {
      const mission = await getMission(missionId);
      if (!mission || !canReadMission(mission, ctx.principal)) {
        return NextResponse.json({ error: "Mission not found or unauthorized" }, { status: 404 });
      }
    }

    try {
      const report = await deepGithubForensicEngine.analyze(target);

      // If tied to a mission, seal findings into the cryptographic evidence ledger
      if (missionId) {
        await appendEvidenceEvent({
          missionId,
          actor: ctx.principal.userId,
          action: "FORENSIC_GITHUB_RECONNAISSANCE",
          input: { target, engine: "DeepGithubForensicEngine" },
          output: {
            targetHandle: report.targetHandle,
            profile: report.profile,
            hiddenAuthorEmailsCount: report.forensicAttributions.hiddenAuthorEmails.length,
            sshKeysCount: report.forensicAttributions.sshKeys.length,
            courtFindings: report.courtAdmissibleFindings,
            provenanceHash: report.provenanceHash,
          },
          lensResults: ["cyber", "governance"],
        });
      }

      return NextResponse.json(report, {
        headers: { "X-Request-ID": ctx.requestId },
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || "Failed to execute GitHub forensic analysis" },
        { status: 400, headers: { "X-Request-ID": ctx.requestId } },
      );
    }
  });
}
