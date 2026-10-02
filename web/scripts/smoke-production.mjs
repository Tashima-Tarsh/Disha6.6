const origin = new URL(process.env.DISHA_PUBLIC_URL ?? "https://disha6.6.thenitishkr.in");
if (origin.protocol !== "https:" || origin.username || origin.password) throw new Error("An HTTPS public URL is required.");
const get = (path) => fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000), redirect: "manual" });
const login = await get("/login");
if (login.status !== 200 || login.headers.get("x-disha-edge") !== "cloudflare-origin-proxy") throw new Error("The current edge transport did not serve the login page.");
const html = await login.text();
if (!html.includes("Secure Access")) throw new Error("Login HTML is missing.");
const asset = html.match(/src="([^"<>]*\/_next\/static\/[^"<>]+\.js)"/);
if (!asset || !(await get(asset[1].replaceAll("&amp;", "&"))).ok) throw new Error("Login JavaScript is unavailable.");
const health = await get("/api/v1/health");
if (!health.ok || (await health.json()).status !== "ok") throw new Error("Production dependencies are not ready.");
for (const path of ["/api/auth/me", "/api/v1/surveillance/tools", "/api/v1/surveillance/osint-search?q=example.com"]) {
  if ((await get(path)).status !== 401) throw new Error(`Expected unauthenticated rejection at ${path}`);
}
process.stdout.write("Public login, JavaScript, dependency readiness and authenticated boundaries passed. Account sign-in still requires an operator check.\n");
