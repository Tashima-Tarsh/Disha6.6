import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { origin: { type: "string" }, "public-url": { type: "string", default: "https://disha6.6.thenitishkr.in" } } });
function httpsOrigin(value, name) {
  const url = new URL(value ?? "");
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error(`${name} must be an HTTPS origin without a path or credentials.`);
  return url.origin;
}
const publicUrl = httpsOrigin(values["public-url"], "Public URL");
const origin = httpsOrigin(values.origin, "Origin");
if (origin === publicUrl) throw new Error("Use a distinct origin hostname to avoid a Cloudflare proxy loop.");
const secret = () => randomBytes(32).toString("base64url");
const postgres = secret(), brain = secret();
const config = {
  NODE_ENV: "production", DISHA_AUTH_MODE: "password",
  DISHA_PRODUCTION_URL: publicUrl, NEXT_PUBLIC_APP_URL: publicUrl, DISHA_ALLOWED_ORIGINS: publicUrl,
  DISHA_ORIGIN_URL: origin, DISHA_TRUST_PROXY: "false",
  POSTGRES_PASSWORD: postgres, DATABASE_URL: `postgresql://disha:${postgres}@postgres:5432/disha`,
  REDIS_URL: "redis://redis:6379", DISHA_JWT_SECRET: secret(), DISHA_WORKER_TOKEN: secret(),
  DISHA_BRAIN_API_TOKEN: brain, DISHA_RESEARCH_RUNTIME_TOKEN: brain,
  DISHA_BRAIN_URL: "http://disha-brain:8080", DISHA_RESEARCH_RUNTIME_URL: "http://disha-brain:8080",
  DISHA_WORKSPACE_ROOT: "/data/workspaces", DISHA_MODEL_PROVIDER: "disabled",
};
const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env.production.local");
try {
  await fs.writeFile(target, Object.entries(config).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", { mode: 0o600, flag: "wx" });
} catch (error) {
  if (error.code === "EEXIST") throw new Error("Production configuration already exists. Existing secrets were preserved; edit it in place.");
  throw error;
}
process.stdout.write(`Created private configuration at ${target}. No account password has been generated. Start the stack, then use auth:create-user to set your own password.\n`);
