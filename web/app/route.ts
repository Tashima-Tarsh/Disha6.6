import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";

export function GET(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;

  if (token) {
    try {
      principalFromAccessToken(token);
      return NextResponse.redirect(new URL("/investigate", request.url));
    } catch {
      // Invalid/expired sessions fall through to the login gateway.
    }
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
