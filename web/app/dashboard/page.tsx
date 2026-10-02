import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";

import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "disha6.6 Command Dashboard",
  description: "Governed evidence operations dashboard for disha6.6.",
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?mode=password&returnUrl=%2Fdashboard");
  }

  let principal;
  try {
    principal = await principalFromAccessToken(token);
  } catch {
    redirect("/login?mode=password&returnUrl=%2Fdashboard");
  }

  return <DashboardClient principal={{ email: principal.email, roles: principal.roles }} />;
}
