import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";
import { VaultClient } from "./vault-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cryptographic Evidence Vault | DISHA 6.6",
  description: "SHA-256 Merkle-verified immutable provenance, line-level version diffs, and non-destructive evidence preservation.",
};

export default async function VaultPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?mode=password&returnUrl=%2Fvault");
  }

  let principal;
  try {
    principal = principalFromAccessToken(token);
  } catch {
    redirect("/login?mode=password&returnUrl=%2Fvault");
  }

  return <VaultClient principal={{ email: principal.email, roles: principal.roles }} />;
}
