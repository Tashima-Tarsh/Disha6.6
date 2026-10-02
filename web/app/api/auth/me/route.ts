import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/server/auth";
import { setCsrfCookie } from "@/lib/server/csrf";
import { errorResponse } from "@/lib/server/http";

export async function GET(req: NextRequest) {
  try {
    const principal = await requirePrincipal(req);
    const response = NextResponse.json({ user: principal });
    setCsrfCookie(response);
    return response;
  } catch (error) {
    return errorResponse(error, req);
  }
}
