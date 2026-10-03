import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";
import { CyberDefenseClient } from "./cyber-defense-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cyber Defense & Attack Surface | DISHA 6.6",
  description: "External attack surface discovery, CISA KEV vulnerability correlation, and secret exposure defense.",
};

export default async function CyberDefensePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?mode=password&returnUrl=%2Fcyber-defense");
  }

  let principal;
  try {
    principal = principalFromAccessToken(token);
  } catch {
    redirect("/login?mode=password&returnUrl=%2Fcyber-defense");
  }

  return <CyberDefenseClient principal={{ email: principal.email, roles: principal.roles }} />;
}
