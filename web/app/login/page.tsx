import type { Metadata } from "next";

import { LoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "Secure Access | disha6.6",
  description: "disha6.6 secure identity and administrator access gateway.",
};

type LoginPageProps = {
  searchParams?: Promise<{
    returnUrl?: string | string[];
    authError?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requested = Array.isArray(params?.returnUrl) ? params.returnUrl[0] : params?.returnUrl;
  const authError = Array.isArray(params?.authError) ? params.authError[0] : params?.authError;
  return <LoginClient authError={authError} returnUrl={sanitizeReturnUrl(requested)} />;
}

function sanitizeReturnUrl(requested?: string) {
  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) return "/dashboard";
  return requested;
}
