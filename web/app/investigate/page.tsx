import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";
import { InvestigationClient } from "./investigation-client";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Investigation Universe | DISHA 6.6", description: "Search public sources. Examine evidence. Close and clear." };
export default async function InvestigationPage() {
  const token = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;
  if (!token) redirect("/login?returnUrl=%2Finvestigate");
  let principal;
  try { principal = principalFromAccessToken(token); }
  catch { redirect("/login?returnUrl=%2Finvestigate"); }
  return <InvestigationClient email={principal.email} />;
}
