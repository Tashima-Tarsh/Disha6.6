import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";
import { DishaCommandShell } from "@/components/shell/DishaCommandShell";
import { SkillsExplorerClient } from "./skills-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "disha6.6 Skills Explorer",
  description: "Search 1,800+ registered agent skills and 500+ expert roles, inspect capabilities, and run governed tasks.",
};

export default async function SkillsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?mode=password&returnUrl=%2Fskills");
  }

  let principal;
  try {
    principal = principalFromAccessToken(token);
  } catch {
    redirect("/login?mode=password&returnUrl=%2Fskills");
  }

  return (
    <DishaCommandShell principal={{ email: principal.email, roles: principal.roles }}>
      <SkillsExplorerClient />
    </DishaCommandShell>
  );
}

