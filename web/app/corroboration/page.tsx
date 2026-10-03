import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";
import { CorroborationClient } from "./corroboration-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Source Family & Corroboration Engine | DISHA 6.6",
  description: "Independent multi-source corroboration and wire syndication clustering.",
};

export default async function CorroborationPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?mode=password&returnUrl=%2Fcorroboration");
  }

  let principal;
  try {
    principal = principalFromAccessToken(token);
  } catch {
    redirect("/login?mode=password&returnUrl=%2Fcorroboration");
  }

  return <CorroborationClient principal={{ email: principal.email, roles: principal.roles }} />;
}
