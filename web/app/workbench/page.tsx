import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";

import { DishaWorkbench } from "./workbench-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "disha6.6 Workbench",
  description: "A transparent agentic mission flow for constitutional evidence review.",
};

export default async function WorkbenchPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?mode=password&returnUrl=%2Fworkbench");
  }

  let principal;
  try {
    principal = principalFromAccessToken(token);
  } catch {
    redirect("/login?mode=password&returnUrl=%2Fworkbench");
  }

  return <DishaWorkbench principal={{ email: principal.email, roles: principal.roles }} />;
}
