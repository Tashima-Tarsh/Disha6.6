import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";
import { AccountClient } from "./account-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account | disha6.6", robots: { index: false, follow: false } };
export default async function AccountPage() {
  const token = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;
  if (!token) redirect("/login?returnUrl=%2Faccount");
  let principal;
  try { principal = await principalFromAccessToken(token); }
  catch { redirect("/login?returnUrl=%2Faccount"); }
  return <AccountClient email={principal.email} passwordEnabled={process.env.DISHA_AUTH_MODE === "password"} />;
}
