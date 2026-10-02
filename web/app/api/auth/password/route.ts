import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/server/audit";
import { clearSessionCookies, requirePrincipal } from "@/lib/server/auth";
import { changePassword } from "@/lib/server/password-auth";
import { assertRequestGuards, errorResponse } from "@/lib/server/http";
import { requestId } from "@/lib/server/security";

const schema = z.object({ currentPassword: z.string().min(1).max(256), newPassword: z.string().min(15).max(256) });
export async function POST(req: NextRequest) {
  try {
    await assertRequestGuards(req);
    const principal = await requirePrincipal(req);
    const body = schema.parse(await req.json());
    await changePassword(principal.userId, body.currentPassword, body.newPassword);
    await audit({ requestId: requestId(req), userId: principal.userId, action: "auth.password.change", outcome: "success" });
    const response = NextResponse.json({ success: true });
    clearSessionCookies(response);
    return response;
  } catch (error) { return errorResponse(error, req); }
}
