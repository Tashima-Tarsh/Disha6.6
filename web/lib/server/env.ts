import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;
const optionalUrl = z.preprocess(emptyStringToUndefined, z.string().url().optional());

const envSchema = z.object({
  DISHA_AUTH_MODE: z.enum(["dev-jwt", "password", "oidc", "hybrid"]).default("dev-jwt"),
  DISHA_JWT_SECRET: z.string().min(32).optional(),
  DISHA_DEV_PASSWORD: z.string().min(12).optional(),
  DISHA_DEV_ADMIN_EMAILS: z.preprocess(emptyStringToUndefined, z.string().optional()),
  DISHA_OIDC_ISSUER: optionalUrl,
  DISHA_OIDC_CLIENT_ID: z.string().optional(),
  DISHA_OIDC_CLIENT_SECRET: z.string().optional(),
  DISHA_OIDC_REDIRECT_URI: optionalUrl,
  DISHA_MERI_PEHCHAN_AUTH_URL: z.string().url().default("https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize"),
  DISHA_MERI_PEHCHAN_TOKEN_URL: z.string().url().default("https://digilocker.meripehchaan.gov.in/public/oauth2/2/token"),
  DISHA_MERI_PEHCHAN_USER_URL: z.string().url().default("https://digilocker.meripehchaan.gov.in/public/oauth2/1/user"),
  DISHA_MERI_PEHCHAN_CLIENT_ID: z.string().optional(),
  DISHA_MERI_PEHCHAN_CLIENT_SECRET: z.string().optional(),
  DISHA_MERI_PEHCHAN_REDIRECT_URI: optionalUrl,
  DATABASE_URL: z.preprocess(emptyStringToUndefined, z.string().optional()),
  REDIS_URL: z.preprocess(emptyStringToUndefined, z.string().optional()),
  DISHA_WORKSPACE_ROOT: z.string().optional(),
  DISHA_ALLOWED_ORIGINS: z.string().optional(),
  DISHA_BACKEND_URL: z.string().url().default("http://localhost:3001"),
  DISHA_BRAIN_URL: optionalUrl,
  DISHA_RESEARCH_RUNTIME_URL: optionalUrl,
  DISHA_RESEARCH_RUNTIME_TOKEN: z.string().optional(),
  DISHA_RESEARCH_RUNTIME_TIMEOUT_MS: z.coerce.number().int().positive().default(2500),
  NEXT_PUBLIC_APP_URL: optionalUrl,
  DISHA_WEB_RATE_LIMIT: z.coerce.number().int().positive().default(120),
  DISHA_EVIDENCE_LEDGER_MODE: z.enum(["postgres", "memory-dev"]).optional(),
  DISHA_ALLOW_STATELESS_AUTH: z.enum(["true", "false"]).default("false"),
  DISHA_AGENT_MODE: z.enum(["eco", "balanced", "deep"]).default("balanced"),
  DISHA_AGENT_INPUT_BUDGET_TOKENS: z.coerce.number().int().positive().default(8_000),
  DISHA_AGENT_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  DISHA_AGENT_MAX_CACHE_BYTES: z.coerce.number().int().positive().default(250_000),
  DISHA_WORKFLOW_NODE_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  DISHA_WORKFLOW_TOTAL_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  DISHA_WORKFLOW_ALLOWED_HOSTS: z.string().optional(),
  DISHA_MODEL_PROVIDER: z.enum(["disabled", "anthropic", "openai", "ollama", "local", "sovereign"]).default("disabled"),
  DISHA_MODEL_ROUTES_JSON: z.string().optional(),
  DISHA_MODEL_ROLE: z.string().default("analysis"),
  DISHA_WORKER_TOKEN: z.string().min(24).optional(),
  DISHA_BUILD_SHA: z.string().optional(),
  DISHA_WORKFLOW_LEASE_SECONDS: z.coerce.number().int().min(15).max(3600).default(120),
  DISHA_EMBEDDING_PROVIDER: z.enum(["local-hash", "openai-compatible"]).default("local-hash"),
  DISHA_EMBEDDING_BASE_URL: optionalUrl,
  DISHA_EMBEDDING_MODEL: z.string().default("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"),
  DISHA_EMBEDDING_TIMEOUT_MS: z.coerce.number().int().min(250).max(20_000).default(3_000),
  DISHA_EMBEDDING_API_KEY: z.string().optional(),
  DISHA_SCHEDULER_POLL_SECONDS: z.coerce.number().int().min(5).max(3600).default(30),
  DISHA_RUNTIME_EVENT_STREAM: z.string().default("disha:runtime-events"),
  DISHA_MODEL_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  DISHA_LOCAL_ONLY_MODE: z.enum(["true", "false"]).default("false"),
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434/v1"),
  OLLAMA_NATIVE_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().default("qwen2.5:7b"),
  OLLAMA_MAX_CONCURRENCY: z.coerce.number().int().positive().default(4),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-5"),
  ANTHROPIC_BASE_URL: z.string().url().default("https://api.anthropic.com/v1"),
  ANTHROPIC_VERSION: z.string().default("2023-06-01"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.6-luna"),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_PROJECT: z.string().optional(),
  OPENAI_ORGANIZATION: z.string().optional(),
  DISHA_BRAIN_API_TOKEN: z.string().optional(),
  NODE_ENV: z.string().default("development"),
});

export type RuntimeEnv = z.infer<typeof envSchema>;

let cachedEnv: RuntimeEnv | null = null;

export function getEnv(): RuntimeEnv {
  if (cachedEnv) return cachedEnv;
  try {
    cachedEnv = envSchema.parse(process.env);
  } catch (e) {
    if (process.env.NODE_ENV === "production") throw e;
    console.warn("[env] Strict env validation failed, using dev fallbacks:", e);
    cachedEnv = {
      DISHA_AUTH_MODE: "password",
      DISHA_JWT_SECRET: undefined,
      DISHA_DEV_PASSWORD: undefined,
      DISHA_DEV_ADMIN_EMAILS: undefined,
      DISHA_OIDC_ISSUER: undefined,
      DISHA_OIDC_CLIENT_ID: undefined,
      DISHA_OIDC_CLIENT_SECRET: undefined,
      DISHA_OIDC_REDIRECT_URI: undefined,
      DISHA_MERI_PEHCHAN_AUTH_URL: "https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize",
      DISHA_MERI_PEHCHAN_TOKEN_URL: "https://digilocker.meripehchaan.gov.in/public/oauth2/2/token",
      DISHA_MERI_PEHCHAN_USER_URL: "https://digilocker.meripehchaan.gov.in/public/oauth2/1/user",
      DISHA_MERI_PEHCHAN_CLIENT_ID: undefined,
      DISHA_MERI_PEHCHAN_CLIENT_SECRET: undefined,
      DISHA_MERI_PEHCHAN_REDIRECT_URI: undefined,
      DATABASE_URL: undefined,
      REDIS_URL: undefined,
      DISHA_WORKSPACE_ROOT: process.cwd(),
      DISHA_ALLOWED_ORIGINS: "http://localhost:3000",
      DISHA_BACKEND_URL: "http://localhost:3001",
      DISHA_BRAIN_URL: "http://localhost:8080",
      DISHA_RESEARCH_RUNTIME_URL: undefined,
      DISHA_RESEARCH_RUNTIME_TOKEN: undefined,
      DISHA_RESEARCH_RUNTIME_TIMEOUT_MS: 2500,
      NEXT_PUBLIC_APP_URL: "https://disha.your-production-domain.com",
      DISHA_WEB_RATE_LIMIT: 120,
      DISHA_EVIDENCE_LEDGER_MODE: "memory-dev",
      DISHA_ALLOW_STATELESS_AUTH: "false",
      DISHA_AGENT_MODE: "balanced",
      DISHA_AGENT_INPUT_BUDGET_TOKENS: 8000,
      DISHA_AGENT_CACHE_TTL_SECONDS: 3600,
      DISHA_AGENT_MAX_CACHE_BYTES: 250000,
      DISHA_WORKFLOW_NODE_TIMEOUT_MS: 15000,
      DISHA_WORKFLOW_TOTAL_TIMEOUT_MS: 60000,
      DISHA_WORKFLOW_ALLOWED_HOSTS: undefined,
      DISHA_MODEL_PROVIDER: "disabled",
      DISHA_MODEL_ROUTES_JSON: undefined,
      DISHA_MODEL_ROLE: "analysis",
      DISHA_WORKER_TOKEN: undefined,
      DISHA_BUILD_SHA: undefined,
      DISHA_WORKFLOW_LEASE_SECONDS: 120,
      DISHA_EMBEDDING_PROVIDER: "local-hash",
      DISHA_EMBEDDING_BASE_URL: undefined,
      DISHA_EMBEDDING_MODEL: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
      DISHA_EMBEDDING_TIMEOUT_MS: 3000,
      DISHA_EMBEDDING_API_KEY: undefined,
      DISHA_SCHEDULER_POLL_SECONDS: 30,
      DISHA_RUNTIME_EVENT_STREAM: "disha:runtime-events",
      DISHA_MODEL_TIMEOUT_MS: 20000,
      DISHA_LOCAL_ONLY_MODE: "false",
      OLLAMA_BASE_URL: "http://127.0.0.1:11434/v1",
      OLLAMA_NATIVE_BASE_URL: "http://127.0.0.1:11434",
      OLLAMA_MODEL: "qwen2.5:7b",
      OLLAMA_MAX_CONCURRENCY: 4,
      ANTHROPIC_API_KEY: undefined,
      ANTHROPIC_MODEL: "claude-sonnet-4-5",
      ANTHROPIC_BASE_URL: "https://api.anthropic.com/v1",
      ANTHROPIC_VERSION: "2023-06-01",
      OPENAI_API_KEY: undefined,
      OPENAI_MODEL: "gpt-5.6-luna",
      OPENAI_BASE_URL: "https://api.openai.com/v1",
      OPENAI_PROJECT: undefined,
      OPENAI_ORGANIZATION: undefined,
      DISHA_BRAIN_API_TOKEN: undefined,
      NODE_ENV: "development",
    } as RuntimeEnv;
  }

  const env = cachedEnv as RuntimeEnv;
  if (env.DISHA_AUTH_MODE === "oidc") {
    const missing = [
      ["DISHA_MERI_PEHCHAN_CLIENT_ID", env.DISHA_MERI_PEHCHAN_CLIENT_ID],
      ["DISHA_MERI_PEHCHAN_CLIENT_SECRET", env.DISHA_MERI_PEHCHAN_CLIENT_SECRET],
    ].filter(([, value]) => !value);
    if (missing.length > 0) {
      throw new Error(`OIDC mode missing: ${missing.map(([key]) => key).join(", ")}`);
    }
  }
  if (!env.DISHA_JWT_SECRET && env.NODE_ENV === "production") {
    throw new Error("DISHA_JWT_SECRET is required in production");
  }
  if (env.NODE_ENV === "production" && !env.DATABASE_URL) {
    if (env.DISHA_ALLOW_STATELESS_AUTH !== "true") {
      throw new Error("DATABASE_URL is required in production for the persistent Evidence Ledger");
    }
    console.warn("[env] DATABASE_URL is unavailable; explicit DISHA_ALLOW_STATELESS_AUTH=true keeps only the web/auth surface available in degraded stateless mode.");
  }
  if (env.NODE_ENV === "production" && env.DISHA_AUTH_MODE === "dev-jwt") {
    throw new Error("DISHA_AUTH_MODE=dev-jwt is not allowed in production");
  }
  if (env.NODE_ENV !== "production" && env.NODE_ENV !== "test" && env.DISHA_AUTH_MODE === "dev-jwt" && !env.DISHA_DEV_PASSWORD) {
    throw new Error("DISHA_DEV_PASSWORD is required for local dev-jwt password login");
  }
  if (env.NODE_ENV === "production" && !env.DISHA_WORKER_TOKEN) {
    throw new Error("DISHA_WORKER_TOKEN is required in production for internal scheduler/worker calls");
  }
  return env;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}

export function resetEnvForTests(): void {
  cachedEnv = null;
}
