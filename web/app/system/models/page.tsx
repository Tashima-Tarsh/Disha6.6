import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";
import { ModelsClient } from "./models-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Model Command Center | DISHA 6.6 Sovereign OS",
  description: "Universal Ollama open-weight model gateway, Chinese and international library, capability benchmark matrix, and local privacy gate.",
};

export default async function SystemModelsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  if (!token) redirect("/login?mode=password&returnUrl=%2Fsystem%2Fmodels");
  let principal;
  try {
    principal = principalFromAccessToken(token);
  } catch {
    redirect("/login?mode=password&returnUrl=%2Fsystem%2Fmodels");
  }
  return <ModelsClient principal={{ email: principal.email, roles: principal.roles }} />;
}
