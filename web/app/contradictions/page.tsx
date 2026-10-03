import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";
import { ContradictionsClient } from "./contradictions-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Constitutional Contradiction Center | DISHA 6.6",
  description: "Automated statement divergence, legal obligation mismatch, and official record conflict detection.",
};

export default async function ContradictionsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?mode=password&returnUrl=%2Fcontradictions");
  }

  let principal;
  try {
    principal = principalFromAccessToken(token);
  } catch {
    redirect("/login?mode=password&returnUrl=%2Fcontradictions");
  }

  return <ContradictionsClient principal={{ email: principal.email, roles: principal.roles }} />;
}
