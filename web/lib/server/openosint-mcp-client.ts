import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { safePublicFetch } from "./safe-public-fetch";

export type OpenOsintToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  noise?: string;
  is_passive?: boolean;
  enabled?: boolean;
  note?: string;
};

export type OpenOsintToolResult = {
  tool: string;
  target?: string;
  status: "SUCCESS" | "COMPLETED" | "NO_RESULTS" | "AUTH_REQUIRED" | "BLOCKED_BY_POLICY" | "FAILED" | "TIMED_OUT" | "NOT_CONFIGURED";
  data: Record<string, unknown>;
  records: Record<string, unknown>[];
  warnings: string[];
  durationMs: number;
  keyRequired?: string;
  rawOutput?: string;
  error?: string;
};

export type OpenOsintHealth = {
  status: "HEALTHY" | "DEGRADED" | "UNCONFIGURED" | "UNAVAILABLE";
  available: boolean;
  version: string;
  transport: "http" | "stdio" | "none";
  activeModeEnabled: boolean;
  toolCount: number;
  toolsAvailable?: number;
  healthy?: boolean;
  tools: string[];
  detail: string;
  latencyMs?: number;
};

let cachedToolDefinitions: { tools: OpenOsintToolDefinition[]; timestamp: number } | null = null;
let cachedHealth: { health: OpenOsintHealth; timestamp: number } | null = null;
const CACHE_TTL_MS = 60_000;
const HEALTH_CACHE_TTL_MS = 60_000;

export class OpenOsintMcpClient {
  private readonly baseUrl: string | null;
  private readonly serviceToken: string;
  private readonly pythonPath: string | null;
  private readonly upstreamDir: string;

  constructor() {
    this.baseUrl = process.env.OPENOSINT_BASE_URL?.trim() || null;
    this.serviceToken = process.env.OPENOSINT_SERVICE_TOKEN?.trim() || "";
    this.upstreamDir = path.resolve(
      process.cwd(),
      "../disha/services/integrations/osint-upstreams/OpenOSINT",
    );
    this.pythonPath = this.resolvePythonPath();
  }

  private resolvePythonPath(): string | null {
    if (process.env.OPENOSINT_PYTHON_PATH?.trim()) {
      return process.env.OPENOSINT_PYTHON_PATH.trim();
    }

    const venvWindows = path.join(this.upstreamDir, ".venv", "Scripts", "python.exe");
    if (fs.existsSync(venvWindows)) return venvWindows;

    const venvLinux = path.join(this.upstreamDir, ".venv", "bin", "python");
    if (fs.existsSync(venvLinux)) return venvLinux;

    return null;
  }

  async checkHealth(force = false): Promise<OpenOsintHealth> {
    if (!force && cachedHealth && Date.now() - cachedHealth.timestamp < HEALTH_CACHE_TTL_MS) {
      return cachedHealth.health;
    }
    const started = Date.now();

    // 1. If HTTP bridge configured, probe HTTP endpoint
    if (this.baseUrl) {
      try {
        const url = new URL("/health", this.baseUrl).toString();
        const headers: Record<string, string> = { accept: "application/json" };
        if (this.serviceToken) headers.authorization = `Bearer ${this.serviceToken}`;

        const res = await safePublicFetch(url, {
          headers,
          signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) {
          return {
            status: "DEGRADED",
            available: false,
            version: "unknown",
            transport: "http",
            activeModeEnabled: false,
            toolCount: 0,
            tools: [],
            detail: `OpenOSINT HTTP bridge returned HTTP ${res.status}`,
            latencyMs: Date.now() - started,
          };
        }

        const body = (await res.json()) as {
          version?: string;
          status?: string;
          active_mode_enabled?: boolean;
          total_tools?: number;
          enabled_tools_count?: number;
        };

        const toolsRes = await this.listTools();

        const h: OpenOsintHealth = {
          status: "HEALTHY",
          available: true,
          version: body.version ?? "2.34.0",
          transport: "http",
          activeModeEnabled: Boolean(body.active_mode_enabled),
          toolCount: toolsRes.length,
          toolsAvailable: toolsRes.length,
          healthy: true,
          tools: toolsRes.map((t) => t.name),
          detail: "OpenOSINT HTTP bridge operational and responsive",
          latencyMs: Date.now() - started,
        };
        cachedHealth = { health: h, timestamp: Date.now() };
        return h;
      } catch (err: unknown) {
        return {
          status: "UNAVAILABLE",
          available: false,
          version: "unknown",
          transport: "http",
          activeModeEnabled: false,
          toolCount: 0,
          tools: [],
          detail: `OpenOSINT HTTP bridge unreachable at ${this.baseUrl}: ${err instanceof Error ? err.message : String(err)}`,
          latencyMs: Date.now() - started,
        };
      }
    }

    // 2. Stdio MCP transport via Python
    if (!this.pythonPath) {
      return {
        status: "UNCONFIGURED",
        available: false,
        version: "2.34.0",
        transport: "none",
        activeModeEnabled: false,
        toolCount: 0,
        tools: [],
        detail: "OpenOSINT Python environment not detected. Configure OPENOSINT_PYTHON_PATH or initialize .venv",
        latencyMs: Date.now() - started,
      };
    }

    try {
      const tools = await this.listToolsFromStdio(AbortSignal.timeout(8000));
      const h: OpenOsintHealth = {
        status: "HEALTHY",
        available: true,
        version: "2.34.0",
        transport: "stdio",
        activeModeEnabled: process.env.OPENOSINT_ALLOW_ACTIVE === "1" || process.env.OPENOSINT_ALLOW_ACTIVE === "true",
        toolCount: tools.length,
        toolsAvailable: tools.length,
        healthy: true,
        tools: tools.map((t) => t.name),
        detail: `OpenOSINT MCP server operational via ${path.basename(this.pythonPath)} (${tools.length} tools discovered)`,
        latencyMs: Date.now() - started,
      };
      cachedHealth = { health: h, timestamp: Date.now() };
      return h;
    } catch (err: unknown) {
      return {
        status: "DEGRADED",
        available: false,
        version: "2.34.0",
        transport: "stdio",
        activeModeEnabled: false,
        toolCount: 0,
        tools: [],
        detail: `OpenOSINT MCP stdio check failed: ${err instanceof Error ? err.message : String(err)}`,
        latencyMs: Date.now() - started,
      };
    }
  }

  async listTools(forceRefresh = false): Promise<OpenOsintToolDefinition[]> {
    if (!forceRefresh && cachedToolDefinitions && Date.now() - cachedToolDefinitions.timestamp < CACHE_TTL_MS) {
      return cachedToolDefinitions.tools;
    }

    let tools: OpenOsintToolDefinition[] = [];

    if (this.baseUrl) {
      try {
        const url = new URL("/tools", this.baseUrl).toString();
        const headers: Record<string, string> = { accept: "application/json" };
        if (this.serviceToken) headers.authorization = `Bearer ${this.serviceToken}`;

        const res = await safePublicFetch(url, { headers, signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const body = (await res.json()) as { tools: OpenOsintToolDefinition[] };
          tools = body.tools || [];
        }
      } catch {
        // Fall back to stdio if HTTP fails
      }
    }

    if (tools.length === 0 && this.pythonPath) {
      try {
        tools = await this.listToolsFromStdio(AbortSignal.timeout(8000));
      } catch {
        // Keep empty if both fail
      }
    }

    if (tools.length > 0) {
      cachedToolDefinitions = { tools, timestamp: Date.now() };
    }

    return tools;
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    options: {
      signal?: AbortSignal;
      timeoutMs?: number;
      allowActive?: boolean;
    } = {},
  ): Promise<OpenOsintToolResult> {
    const started = Date.now();
    const timeoutMs = options.timeoutMs ?? 25_000;

    // 1. Try HTTP bridge if available
    if (this.baseUrl) {
      try {
        return await this.callToolHttp(toolName, args, options, started);
      } catch {
        // Fallback to stdio
      }
    }

    // 2. Use Stdio MCP server
    if (this.pythonPath) {
      return this.callToolStdio(toolName, args, options, started);
    }

    return {
      tool: toolName,
      status: "NOT_CONFIGURED",
      data: {},
      records: [],
      warnings: ["OpenOSINT runtime is not configured or reachable."],
      durationMs: Date.now() - started,
      error: "openosint_not_configured",
    };
  }

  private async callToolHttp(
    toolName: string,
    args: Record<string, unknown>,
    options: { signal?: AbortSignal; timeoutMs?: number; allowActive?: boolean },
    started: number,
  ): Promise<OpenOsintToolResult> {
    const url = new URL(`/run/${encodeURIComponent(toolName)}`, this.baseUrl!).toString();
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json",
    };
    if (this.serviceToken) headers.authorization = `Bearer ${this.serviceToken}`;

    const res = await safePublicFetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        arguments: args,
        timeout_seconds: Math.floor((options.timeoutMs ?? 25_000) / 1000),
        allow_active: options.allowActive ?? false,
      }),
      signal: options.signal ?? AbortSignal.timeout(options.timeoutMs ?? 25_000),
    });

    if (!res.ok) {
      throw new Error(`OpenOSINT bridge HTTP ${res.status}`);
    }

    const payload = (await res.json()) as {
      tool: string;
      target?: string;
      success: boolean;
      status: string;
      output: Record<string, unknown>;
      raw_text?: string;
      warnings?: string[];
      key_required?: string;
      execution_time_ms: number;
    };

    return this.normalizeToolPayload(toolName, payload.target, payload.output, payload.warnings || [], payload.key_required, Date.now() - started);
  }

  private async listToolsFromStdio(signal: AbortSignal): Promise<OpenOsintToolDefinition[]> {
    if (!this.pythonPath) return [];

    return new Promise((resolve, reject) => {
      const proc = spawn(this.pythonPath!, ["-m", "openosint.mcp_server"], {
        cwd: this.upstreamDir,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });
      proc.stdin.on("error", () => {});

      let stdout = "";
      let stderr = "";

      const cleanup = () => {
        if (!proc.killed) {
          try { proc.kill(); } catch { /* ignore */ }
        }
      };

      signal.addEventListener("abort", () => {
        cleanup();
        reject(new Error("openosint_tool_list_aborted"));
      }, { once: true });

      proc.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
        const lines = stdout.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("{")) continue;
          try {
            const msg = JSON.parse(trimmed) as { id?: number; result?: { tools?: OpenOsintToolDefinition[] } };
            if (msg.id === 1) {
              // Initialized, now request tools/list
              proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
              proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }) + "\n");
            } else if (msg.id === 2 && msg.result?.tools) {
              cleanup();
              resolve(msg.result.tools);
              return;
            }
          } catch {
            // Wait for complete frame
          }
        }
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });

      proc.on("error", (err) => {
        cleanup();
        reject(err);
      });

      proc.on("exit", (code) => {
        if (code !== 0 && !proc.killed) {
          reject(new Error(`OpenOSINT MCP exited with code ${code}: ${stderr}`));
        }
      });

      // Send initialize frame
      proc.stdin.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "disha-mcp-client", version: "6.6.0" },
          },
        }) + "\n",
      );
    });
  }

  private async callToolStdio(
    toolName: string,
    args: Record<string, unknown>,
    options: { signal?: AbortSignal; timeoutMs?: number; allowActive?: boolean },
    started: number,
  ): Promise<OpenOsintToolResult> {
    if (!this.pythonPath) {
      return {
        tool: toolName,
        status: "NOT_CONFIGURED",
        data: {},
        records: [],
        warnings: ["Python executable not found."],
        durationMs: Date.now() - started,
      };
    }

    const timeoutMs = options.timeoutMs ?? 25_000;
    const allowActive = options.allowActive ?? false;

    return new Promise((resolve) => {
      const proc = spawn(this.pythonPath!, ["-m", "openosint.mcp_server"], {
        cwd: this.upstreamDir,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
          ...(allowActive ? { OPENOSINT_ALLOW_ACTIVE: "1" } : {}),
        },
        stdio: ["pipe", "pipe", "pipe"],
      });
      proc.stdin.on("error", () => {});

      let stdout = "";
      let stderr = "";
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { proc.kill(); } catch { /* ignore */ }
          resolve({
            tool: toolName,
            status: "TIMED_OUT",
            data: {},
            records: [],
            warnings: [`Tool execution exceeded timeout of ${timeoutMs}ms`],
            durationMs: Date.now() - started,
            error: "timeout",
          });
        }
      }, timeoutMs);

      if (options.signal) {
        options.signal.addEventListener("abort", () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            try { proc.kill(); } catch { /* ignore */ }
            resolve({
              tool: toolName,
              status: "FAILED",
              data: {},
              records: [],
              warnings: ["Execution cancelled by user abort signal."],
              durationMs: Date.now() - started,
              error: "aborted",
            });
          }
        }, { once: true });
      }

      proc.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
        const lines = stdout.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("{")) continue;
          try {
            const msg = JSON.parse(trimmed) as {
              id?: number;
              result?: { content?: Array<{ type: string; text: string }>; isError?: boolean };
              error?: { message?: string };
            };

            if (msg.id === 1) {
              proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
              proc.stdin.write(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id: 2,
                  method: "tools/call",
                  params: {
                    name: toolName,
                    arguments: {
                      ...args,
                      json_output: true,
                    },
                  },
                }) + "\n",
              );
            } else if (msg.id === 2) {
              clearTimeout(timer);
              if (!resolved) {
                resolved = true;
                try { proc.kill(); } catch { /* ignore */ }

                if (msg.error) {
                  resolve({
                    tool: toolName,
                    status: "FAILED",
                    data: {},
                    records: [],
                    warnings: [msg.error.message || "Unknown MCP error"],
                    durationMs: Date.now() - started,
                    error: msg.error.message,
                  });
                  return;
                }

                const rawText = msg.result?.content?.[0]?.text ?? "";
                let parsed: Record<string, unknown> = {};
                try {
                  parsed = JSON.parse(rawText) as Record<string, unknown>;
                } catch {
                  parsed = { raw: rawText };
                }

                const target = typeof args.domain === "string"
                  ? args.domain
                  : typeof args.ip === "string"
                    ? args.ip
                    : typeof args.target === "string"
                      ? args.target
                      : typeof args.query === "string"
                        ? args.query
                        : typeof args.email === "string"
                          ? args.email
                          : typeof args.username === "string"
                            ? args.username
                            : "";

                resolve(this.normalizeToolPayload(toolName, target, parsed, [], undefined, Date.now() - started, rawText));
              }
              return;
            }
          } catch {
            // Incomplete JSON frame, wait for more data
          }
        }
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        if (!resolved) {
          resolved = true;
          resolve({
            tool: toolName,
            status: "FAILED",
            data: {},
            records: [],
            warnings: [`Failed to spawn OpenOSINT process: ${err.message}`],
            durationMs: Date.now() - started,
            error: err.message,
          });
        }
      });

      proc.stdin.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "disha-mcp-client", version: "6.6.0" },
          },
        }) + "\n",
      );
    });
  }

  private normalizeToolPayload(
    tool: string,
    target: string | undefined,
    data: Record<string, unknown>,
    existingWarnings: string[],
    keyRequiredFromBridge?: string,
    durationMs = 0,
    rawOutput?: string,
  ): OpenOsintToolResult {
    const warnings = [...existingWarnings];
    let status: OpenOsintToolResult["status"] = "COMPLETED";
    let keyRequired = keyRequiredFromBridge;

    // Detect disabled in passive mode
    if (data.status === "disabled_in_passive_mode" || (typeof data.reason === "string" && data.reason.includes("rate limits"))) {
      return {
        tool,
        target,
        status: "BLOCKED_BY_POLICY",
        data,
        records: [],
        warnings: [String(data.reason || "Tool requires explicit active reconnaissance authorization.")],
        durationMs,
        rawOutput,
      };
    }

    // Inspect results lines for [key_required] markers
    const results = Array.isArray(data.results) ? data.results : [];
    const records: Record<string, unknown>[] = [];

    for (const item of results) {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) continue;
        if (trimmed.includes("[key_required]")) {
          const key = trimmed.split("[key_required]").pop()?.trim() || "";
          keyRequired = key;
          status = "AUTH_REQUIRED";
          warnings.push(`OpenOSINT requires ${key} API credential.`);
        } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
          records.push({
            url: trimmed,
            summary: trimmed,
            tool,
            target,
          });
        } else if (/^\[[^\]]+\]/.test(trimmed)) {
          const clean = trimmed.replace(/^\[[^\]]+\]\s*/, "");
          records.push({
            summary: clean,
            raw: trimmed,
            tool,
            target,
          });
        } else if (!trimmed.endsWith(":") && trimmed.length > 3) {
          records.push({
            summary: trimmed,
            tool,
            target,
          });
        }
      } else if (item && typeof item === "object") {
        records.push(item as Record<string, unknown>);
      }
    }

    if (records.length > 0 && status === "COMPLETED") {
      status = "SUCCESS";
    } else if (records.length === 0 && status === "COMPLETED") {
      status = "NO_RESULTS";
    }

    return {
      tool,
      target,
      status,
      data,
      records,
      warnings,
      durationMs,
      keyRequired,
      rawOutput,
    };
  }
}

export const openosintClient = new OpenOsintMcpClient();
