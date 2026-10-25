import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";
import { DishaCommandShell } from "@/components/shell/DishaCommandShell";
import { SelfHealingClient } from "./self-healing-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "disha6.6 Self-Healing Console",
  description: "Autonomous code repair, defect reproduction, patch generation, and recovery history.",
};

export default async function SelfHealingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?mode=password&returnUrl=%2Fself-healing");
  }

  let principal;
  try {
    principal = principalFromAccessToken(token);
  } catch {
    redirect("/login?mode=password&returnUrl=%2Fself-healing");
  }

  return (
    <DishaCommandShell principal={{ email: principal.email, roles: principal.roles }}>
      <SelfHealingClient />
    </DishaCommandShell>
  );
}

