import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME, principalFromAccessToken } from "@/lib/server/auth";
import { OsintRuntimeClient } from "./osint-runtime-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OSINT Upstream Runtime Matrix | DISHA 6.6",
  description: "Real-time verification and execution status for all cataloged OSINT upstream repositories.",
};

export default async function OsintRuntimePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?returnUrl=%2Finvestigate%2Fosint-runtime");
  }

  try {
    principalFromAccessToken(token);
  } catch {
    redirect("/login?returnUrl=%2Finvestigate%2Fosint-runtime");
  }

  return <OsintRuntimeClient />;
}
