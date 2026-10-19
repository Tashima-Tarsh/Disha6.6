import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withContext } from "@/lib/unified/api";
import { canReadMission, getMission } from "@/lib/unified/orchestrator";
import {
  generateCourtAdmissibilityCertificate,
  verifyCourtCertificateIntegrity,
  type CourtAdmissibilityCertificate,
} from "@/lib/unified/court-admissibility";

const generateCertificateSchema = z.object({
  missionId: z.string().min(1),
  targetDescription: z.string().optional(),
  certifyingOfficer: z
    .object({
      name: z.string().optional(),
      designation: z.string().optional(),
      agencyOrOrg: z.string().optional(),
      officialId: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  return withContext(req, "export", async (ctx) => {
    const body = await req.json();
    const { missionId, targetDescription, certifyingOfficer } = generateCertificateSchema.parse(body);

    const mission = await getMission(missionId);
    if (!mission || !canReadMission(mission, ctx.principal)) {
      return NextResponse.json({ error: "Mission not found or unauthorized" }, { status: 404 });
    }

    const certificate = await generateCourtAdmissibilityCertificate(missionId, {
      targetDescription: targetDescription || mission.fusedSummary || mission.missionId,
      certifyingOfficer,
    });

    return NextResponse.json(certificate, {
      headers: { "X-Request-ID": ctx.requestId },
    });
  });
}

const verifyCertificateSchema = z.object({
  certificate: z.custom<CourtAdmissibilityCertificate>((val) => typeof val === "object" && val !== null),
});

export async function PUT(req: NextRequest) {
  return withContext(req, "audit:read", async (ctx) => {
    const body = await req.json();
    const { certificate } = verifyCertificateSchema.parse(body);

    const verification = verifyCourtCertificateIntegrity(certificate);
    return NextResponse.json(verification, {
      headers: { "X-Request-ID": ctx.requestId },
    });
  });
}
