import { LoginClient } from "./login-client";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  return <LoginClient returnUrl={params?.returnUrl || "/investigate"} authError={params?.error} />;
}
