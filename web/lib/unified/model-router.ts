import { z } from "zod";

import { getEnv } from "../server/env";
import { getRuntimeConfig } from "./runtime-config-store";

export const modelRouteSchema = z.object({
  id: z.string().min(1).max(80),
  protocol: z.enum(["openai_responses", "openai_chat_completions", "anthropic_messages"]),
  baseUrl: z.string().url(),
  model: z.string().min(1).max(160),
  apiKeyEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/).default("OPENAI_API_KEY"),
  roles: z.array(z.string().min(1).max(80)).default(["analysis"]),
  priority: z.number().int().min(0).max(10_000).default(100),
  enabled: z.boolean().default(true),
  maxOutputTokens: z.number().int().min(64).max(32_000).default(1_200),
});

export const modelRoutesSchema = z.array(modelRouteSchema).max(50);

export type ModelRoute = z.infer<typeof modelRouteSchema> & { apiKey: string };
export type ModelRouteDefinition = z.infer<typeof modelRouteSchema>;

function isLocalLoopbackUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1" ||
      parsed.hostname === "disha-local-ai" ||
      parsed.hostname === "disha-local-ollama" ||
      parsed.hostname === "host.docker.internal"
    );
  } catch {
    return false;
  }
}

function resolveApiKey(route: ModelRouteDefinition): string {
  const envKey = process.env[route.apiKeyEnv]?.trim();
  if (envKey) return envKey;
  if (isLocalLoopbackUrl(route.baseUrl)) {
    return "ollama-local";
  }
  return "";
}

export async function listModelRoutes(role?: string): Promise<ModelRoute[]> {
  const env = getEnv();
  const requestedRole = role?.trim() || env.DISHA_MODEL_ROLE;
  const runtime = await getRuntimeConfig<unknown>("model.routes");
  const dbRoutes = runtime ? modelRoutesSchema.parse(runtime.value) : [];
  const configured = dbRoutes.length ? dbRoutes : parseConfiguredRoutes(env.DISHA_MODEL_ROUTES_JSON);
  const routes = configured.length ? configured : legacyRoutes();
  return routes
    .filter((route) => route.enabled && route.roles.includes(requestedRole))
    .map((route) => ({ ...route, apiKey: resolveApiKey(route) }))
    .filter((route) => Boolean(route.apiKey))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

export async function modelRoutingStatus(): Promise<Array<Omit<ModelRoute, "apiKey"> & { configured: boolean }>> {
  const env = getEnv();
  const runtime = await getRuntimeConfig<unknown>("model.routes");
  const dbRoutes = runtime ? modelRoutesSchema.parse(runtime.value) : [];
  const configured = dbRoutes.length ? dbRoutes : parseConfiguredRoutes(env.DISHA_MODEL_ROUTES_JSON);
  const routes = configured.length ? configured : legacyRoutes();
  return routes.map((route) => ({
    ...route,
    configured: Boolean(resolveApiKey(route)),
  }));
}

function parseConfiguredRoutes(raw?: string): ModelRouteDefinition[] {
  if (!raw?.trim()) return [];
  try { return modelRoutesSchema.parse(JSON.parse(raw)); }
  catch (error) { throw new Error(`Invalid DISHA_MODEL_ROUTES_JSON: ${error instanceof Error ? error.message : "unknown validation error"}`); }
}

function legacyRoutes(): ModelRouteDefinition[] {
  const env = getEnv();
  if (["ollama", "local", "sovereign"].includes(env.DISHA_MODEL_PROVIDER)) {
    return [
      {
        id: "sovereign-deepseek-r1",
        protocol: "openai_chat_completions",
        baseUrl: env.OLLAMA_BASE_URL,
        model: env.OLLAMA_MODEL || "qwen2.5:7b",
        apiKeyEnv: "OPENAI_API_KEY",
        roles: ["analysis", "reasoning", "epistemic", "court_brief", env.DISHA_MODEL_ROLE],
        priority: 10,
        enabled: true,
        maxOutputTokens: 2_048,
      },
      {
        id: "sovereign-qwen-coder",
        protocol: "openai_chat_completions",
        baseUrl: env.OLLAMA_BASE_URL,
        model: "qwen2.5-coder:7b",
        apiKeyEnv: "OPENAI_API_KEY",
        roles: ["ethical_hacking", "audit", "security", "code_review"],
        priority: 20,
        enabled: true,
        maxOutputTokens: 2_048,
      },
      {
        id: "sovereign-dolphin-uncensored",
        protocol: "openai_chat_completions",
        baseUrl: env.OLLAMA_BASE_URL,
        model: "dolphin-llama3:8b",
        apiKeyEnv: "OPENAI_API_KEY",
        roles: ["uncensored_recon", "threat_intel", "pentest"],
        priority: 30,
        enabled: true,
        maxOutputTokens: 2_048,
      },
      {
        id: "sovereign-nvidia-nemotron",
        protocol: "openai_chat_completions",
        baseUrl: env.OLLAMA_BASE_URL,
        model: "nemotron-mini:4b",
        apiKeyEnv: "OPENAI_API_KEY",
        roles: ["fast_agent", "function_calling"],
        priority: 40,
        enabled: true,
        maxOutputTokens: 2_048,
      },
      {
        id: "sovereign-llava-vision",
        protocol: "openai_chat_completions",
        baseUrl: env.OLLAMA_BASE_URL,
        model: "llava:7b",
        apiKeyEnv: "OPENAI_API_KEY",
        roles: ["multimodal_vision", "video_forensics", "media_audit"],
        priority: 50,
        enabled: true,
        maxOutputTokens: 2_048,
      },
      {
        id: "sovereign-qwen-chinese",
        protocol: "openai_chat_completions",
        baseUrl: env.OLLAMA_BASE_URL,
        model: "qwen2.5:7b",
        apiKeyEnv: "OPENAI_API_KEY",
        roles: ["kimi_multilingual", "international"],
        priority: 60,
        enabled: true,
        maxOutputTokens: 2_048,
      },
    ];
  }
  if (env.DISHA_MODEL_PROVIDER === "openai") return [{ id: "legacy-openai", protocol: "openai_responses", baseUrl: env.OPENAI_BASE_URL, model: env.OPENAI_MODEL, apiKeyEnv: "OPENAI_API_KEY", roles: [env.DISHA_MODEL_ROLE], priority: 100, enabled: true, maxOutputTokens: 1_200 }];
  if (env.DISHA_MODEL_PROVIDER === "anthropic") return [{ id: "legacy-anthropic", protocol: "anthropic_messages", baseUrl: env.ANTHROPIC_BASE_URL, model: env.ANTHROPIC_MODEL, apiKeyEnv: "ANTHROPIC_API_KEY", roles: [env.DISHA_MODEL_ROLE], priority: 100, enabled: true, maxOutputTokens: 1_200 }];
  return [];
}
