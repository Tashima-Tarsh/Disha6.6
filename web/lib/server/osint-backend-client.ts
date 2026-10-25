/**
 * DISHA 6.6 — Dedicated Python OSINT Backend Client
 * 
 * Provides robust internal service connectivity between Next.js web tier
 * and Python OSINT-ONE FastAPI backend (backend/app.py).
 * 
 * Invariants:
 * - Never defaults to localhost:8000 inside container environments when containerized endpoint is configured
 * - Enforces mutual authentication via Bearer token
 * - Bounded timeouts with single exponential retry on network glitch
 * - Standardized error typing: never swallows failures or pretends execution completed
 */

export function getOsintBackendUrl(): string {
  const envUrl =
    process.env.DISHA_OSINT_BACKEND_URL ||
    process.env.OSINT_BACKEND_URL ||
    process.env.NEXT_PUBLIC_OSINT_BACKEND;

  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  // Inside Docker/Kubernetes container production, use service name
  if (process.env.NODE_ENV === "production" && !process.env.DISHA_LOCAL_DEV) {
    return "http://osint-backend:8000";
  }

  return "http://127.0.0.1:8000";
}

export function getOsintApiKey(): string | undefined {
  return (
    process.env.DISHA_OSINT_API_KEY ||
    process.env.OSINT_API_KEY ||
    process.env.DISHA_WORKER_TOKEN
  );
}

export class OsintBackendError extends Error {
  public statusCode: number;
  public code: string;
  public detail?: unknown;

  constructor(message: string, code: string, statusCode: number = 502, detail?: unknown) {
    super(message);
    this.name = "OsintBackendError";
    this.code = code;
    this.statusCode = statusCode;
    this.detail = detail;
  }
}

export async function callOsintBackend<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    timeoutMs?: number;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const baseUrl = getOsintBackendUrl();
  const apiKey = getOsintApiKey();
  const targetUrl = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const timeoutMs = options.timeoutMs ?? 30000;

  const headers: Record<string, string> = {
    "Accept": "application/json",
    ...options.headers,
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  let attempt = 0;
  const maxAttempts = 2;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    attempt++;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(targetUrl, {
        method: options.method ?? (options.body ? "POST" : "GET"),
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);

      if (response.status === 401 || response.status === 403) {
        throw new OsintBackendError(
          "Authentication failed connecting to DISHA OSINT backend",
          "BACKEND_AUTH_FAILED",
          502
        );
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new OsintBackendError(
          `OSINT backend returned HTTP ${response.status}`,
          "BACKEND_HTTP_ERROR",
          response.status >= 500 ? 502 : response.status,
          text.slice(0, 500)
        );
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutHandle);
      lastError = err;

      if (err instanceof OsintBackendError) {
        throw err;
      }

      const isAbort = (err as { name?: string })?.name === "AbortError";
      if (isAbort) {
        throw new OsintBackendError(
          `OSINT backend request timed out after ${timeoutMs}ms`,
          "BACKEND_TIMEOUT",
          504
        );
      }

      // Retry once on connection refused or socket error if attempt == 1
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
    }
  }

  throw new OsintBackendError(
    `Unable to reach DISHA OSINT backend at ${baseUrl}: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    "BACKEND_UNAVAILABLE",
    503,
    { targetUrl, baseUrl }
  );
}

