const origin = new URL(process.env.DISHA_ORIGIN_URL ?? "");
if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash || origin.host === "disha6.6.thenitishkr.in") {
  throw new Error("DISHA_ORIGIN_URL must be the distinct HTTPS Node origin with no path, credentials, query or fragment.");
}
const response = await fetch(new URL("/api/v1/health", origin), { signal: AbortSignal.timeout(15000), redirect: "error" });
if (!response.ok || (await response.json()).status !== "ok") throw new Error("Origin is not ready; edge deployment cancelled.");
process.stdout.write("Origin readiness passed.\n");
