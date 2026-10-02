/** Same-origin browser API client with CSRF and one bounded refresh attempt. */
function csrfToken(): string | undefined {
  return document.cookie.split("; ").find((part) => part.startsWith("disha_csrf="))?.slice("disha_csrf=".length);
}
let refreshInFlight: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  if (!refreshInFlight) {
    const rotate = async () => {
      // A different tab may have refreshed while this tab was waiting for the lock.
      const current = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (current.ok) return true;
      const token = csrfToken();
      if (!token) return false;
      return (await fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin", headers: { "x-csrf-token": token }, signal: AbortSignal.timeout(10000) })).ok;
    };
    refreshInFlight = (navigator.locks ? navigator.locks.request("disha-session-refresh", rotate) : rotate()).finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}
export async function authenticatedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const url = new URL(input, window.location.origin);
  if (url.origin !== window.location.origin) throw new Error("Authenticated requests must stay on the application origin");
  const method = (init.method ?? "GET").toUpperCase();
  const mutation = !["GET", "HEAD", "OPTIONS"].includes(method);
  if (mutation && !csrfToken()) {
    await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store", signal: init.signal });
  }
  const request = () => {
    const headers = new Headers(init.headers);
    if (mutation && csrfToken()) headers.set("x-csrf-token", csrfToken()!);
    return fetch(url, { ...init, headers, credentials: "same-origin" });
  };
  const response = await request();
  if (response.status !== 401 || !csrfToken()) return response;
  if (!await refresh()) return response;
  await response.body?.cancel();
  return request();
}
