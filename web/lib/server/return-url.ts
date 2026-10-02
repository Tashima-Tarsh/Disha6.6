export function safeReturnUrl(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return "/dashboard";
  const base = new URL("https://return.invalid");
  const target = new URL(value, base);
  return target.origin === base.origin ? target.pathname + target.search + target.hash : "/dashboard";
}
