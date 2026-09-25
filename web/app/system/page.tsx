import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";
import { SystemClient } from "./system-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "disha6.6 System Console",
  description: "Technical runtime, database, geodata and connector health for disha6.6.",
};

export default async function SystemPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  if (!token) redirect("/login?mode=password&returnUrl=%2Fsystem");
  let principal;
  try {
    principal = principalFromAccessToken(token);
  } catch {
    redirect("/login?mode=password&returnUrl=%2Fsystem");
  }
  return <SystemClient principal={{ email: principal.email, roles: principal.roles }} />;
}
