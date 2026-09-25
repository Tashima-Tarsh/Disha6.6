import { NextResponse } from "next/server";

import { lensRegistry } from "@/lib/unified/lenses";
import { openDataSources } from "@/lib/unified/data-integration";
import { listAgentSkills } from "@/lib/unified/agentic-readiness";
import { getEnv } from "@/lib/server/env";
import { listSourceRegistry } from "@/lib/unified/source-registry";
import { createDefaultOsintBus } from "@/lib/unified/osint-default-bus";

export async function GET() {
  const env = getEnv();
  const osint = createDefaultOsintBus();
  return NextResponse.json({
    status: "ok",
    product: "disha6.6 Unified Policy-Gated Cognitive Intelligence OS",
    lenses: Object.keys(lensRegistry),
    agenticSkills: listAgentSkills().length,
    openDataSources: openDataSources.length,
    policyGate: "enabled",
    evidenceLedger: "enabled",
    agenticMission: "enabled",
    modelProvider: env.DISHA_MODEL_PROVIDER,
    learningMemory: "evidence_memory",
    sourceRegistry: listSourceRegistry().length,
    governedOsintAdapters: osint.list().length,
    osintExecutionPolicy: "passive_public_only",
    noDemoDataPolicy: "enabled",
  });
}
