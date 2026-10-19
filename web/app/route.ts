import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";
import { getEnv } from "@/lib/server/env";

function appUrl(path: string) {
  return new URL(path, getEnv().NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000");
}

export function GET(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;

  if (token) {
    try {
      principalFromAccessToken(token);
      return NextResponse.redirect(appUrl("/investigate"));
    } catch {
      // Invalid/expired sessions fall through to the login gateway.
    }
  }

  return NextResponse.redirect(appUrl("/login"));
}
