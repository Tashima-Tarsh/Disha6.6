import { safeReturnUrl } from "@/lib/server/return-url";
import type { Metadata } from "next";

import { LoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "Secure Access | disha6.6",
  description: "disha6.6 secure identity and administrator access gateway.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{ returnUrl?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requested = Array.isArray(params?.returnUrl) ? params.returnUrl[0] : params?.returnUrl;
  return <LoginClient returnUrl={safeReturnUrl(requested)} passwordEnabled={process.env.DISHA_AUTH_MODE === "password" || (process.env.NODE_ENV !== "production" && (!process.env.DISHA_AUTH_MODE || process.env.DISHA_AUTH_MODE === "dev-jwt"))} providers={{
    "meri-pehchan": process.env.DISHA_AUTH_MODE === "oidc" && Boolean(process.env.DISHA_MERI_PEHCHAN_AUTH_URL && process.env.DISHA_OIDC_CLIENT_ID),
    "intra-id": process.env.DISHA_AUTH_MODE === "oidc" && Boolean(process.env.DISHA_INTRA_ID_AUTH_URL && process.env.DISHA_OIDC_CLIENT_ID),
  }} />;
}
