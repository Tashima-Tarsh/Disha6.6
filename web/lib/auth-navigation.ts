export const DEFAULT_AUTHENTICATED_ROUTE = "/investigate";
export function safeReturnUrl(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  ) {
    return DEFAULT_AUTHENTICATED_ROUTE;
  }

  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u0020]/.test(decoded)) {
      return DEFAULT_AUTHENTICATED_ROUTE;
    }

    const url = new URL(value, "https://disha.invalid");
    if (
      url.origin !== "https://disha.invalid" ||
      /^\/(?:api|login)(?:\/|$)/.test(url.pathname) ||
      (url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/"))
    ) {
      return DEFAULT_AUTHENTICATED_ROUTE;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTHENTICATED_ROUTE;
  }
}
