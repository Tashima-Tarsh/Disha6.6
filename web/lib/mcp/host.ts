// DISHA 6.6 — MCP Host Client
//
// Mounts external MCP servers (stdio, SSE, streamable-HTTP) inside DISHA's
// governed spine. Each server is a registry entry; every discovered tool is
// namespaced (serverId.toolName) and wrapped by the governance wrapper before
// it can be executed.
//
// R1: Nothing calls outside the policy gate.
// R9: Mount, do not merge — upstream tools stay in their own processes.

import { execFileSync, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import { URL } from "node:url";
import { z } from "zod";

export type McpTransport = "stdio" | "sse" | "streamable-http";

export type SideEffectClass = "read" | "write" | "execute" | "exploit";

export type McpTrustLevel = "untrusted" | "restricted" | "trusted";

export interface McpServerEntry {
  id: string;                     // e.g. "nuclei", "hexstrike", "pentagi"
  name: string;
  transport: McpTransport;
  // For stdio: the executable command + args. For SSE/streamable-HTTP: base URL.
  command?: string[];
  url?: string;
  auth?: { header: string; value: string }; // optional bearer/api-key header
  allowList?: string[];            // tool names allowed from this server
  denyList?: string[];             // tool names explicitly denied
  sideEffectClass: SideEffectClass; // default class applied to all tools
  trustLevel: McpTrustLevel;
  timeoutMs: number;
  concurrencyCap: number;
  budgetPerMission?: number;       // max tool-call cost units per mission
  enabled: boolean;
  notes?: string;
}

export interface DiscoveredTool {
  serverId: string;
  namespacedName: string;          // e.g. "nuclei.scan"
  inputSchema: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  description: string;
  sideEffectClass: SideEffectClass;
  timeoutMs: number;
  concurrencyCap: number;
  costEstimate: number;
  annotations?: { title?: string; readOnlyHint?: boolean; destructiveHint?: boolean };
}

export interface McpToolResult {
  ok: boolean;
  structuredContent?: unknown;
  content?: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  isError?: boolean;
  error?: string;
}

export interface McpListToolsResult {
  tools: Array<{
    name: string;
    description?: string;
    inputSchema?: unknown;
    outputSchema?: unknown;
    annotations?: unknown;
  }>;
}

// JSON-RPC 2.0 envelope used by stdio and streamable-HTTP transports.
function jsonRpcRequest(method: string, params?: unknown, id?: string | number) {
  return JSON.stringify({ jsonrpc: "2.0", id: id ?? crypto.randomUUID(), method, params });
}

function parseJsonRpcResponse(text: string): { id: string | number; result?: unknown; error?: unknown } {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON-RPC response");
  return parsed as { id: string | number; result?: unknown; error?: unknown };
}

export class McpHostClient extends EventEmitter {
  private servers = new Map<string, McpServerEntry>();
  private tools = new Map<string, DiscoveredTool>(); // namespacedName -> tool
  private processes = new Map<string, { proc: import("node:child_process").ChildProcess; stdin: NodeJS.WritableStream }>();
  private pendingStdio = new Map<string, { resolve: (value: unknown) => void; reject: (err: Error) => void }>();
  private stdioBuffers = new Map<string, string>();
  private seq = 0;

  registerServer(entry: McpServerEntry): void {
    this.servers.set(entry.id, entry);
  }

  listServers(): McpServerEntry[] {
    return [...this.servers.values()].filter((s) => s.enabled);
  }

  getServer(id: string): McpServerEntry | undefined {
    return this.servers.get(id);
  }

  listTools(): DiscoveredTool[] {
    return [...this.tools.values()];
  }

  getTool(namespacedName: string): DiscoveredTool | undefined {
    return this.tools.get(namespacedName);
  }

  // ── stdio transport ────────────────────────────────────────────────────

  private async startStdio(entry: McpServerEntry): Promise<void> {
    if (!entry.command) throw new Error(`Server ${entry.id} has no stdio command`);
    const [cmd, ...args] = entry.command;
    const proc = spawn(cmd, args, {
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdin = proc.stdin!;
    if (!stdin) throw new Error(`Server ${entry.id} stdio stdin unavailable`);
    this.processes.set(entry.id, { proc, stdin });

    proc.stdout.on("data", (chunk: Buffer) => {
      const buf = (this.stdioBuffers.get(entry.id) ?? "") + chunk.toString("utf8");
      this.stdioBuffers.set(entry.id, buf);
      let idx: number;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx);
        this.stdioBuffers.set(entry.id, buf.slice(idx + 1));
        this.handleStdioLine(entry.id, line.trim());
      }
    });
    proc.stderr.on("data", () => {});
    proc.on("exit", () => {
      this.processes.delete(entry.id);
      this.stdioBuffers.delete(entry.id);
      this.emit("serverDown", entry.id);
    });
    proc.on("error", (err) => {
      this.emit("serverError", entry.id, err);
    });

    // Give the child process' readline interface a moment to attach to stdin
    // before we dispatch the initialize request (avoids startup races in tests).
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Initialize: send initialize (request) + initialized (notification), then listTools.
    await this.stdioCallWithRetry(entry.id, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "disha-6.6-mcp-host", version: "6.6.0" },
    }, entry.timeoutMs);
    // `initialized` is a notification (no response expected) — fire and forget.
    stdin.write(jsonRpcRequest("initialized", {}, String(this.seq++)) + "\n");
    await this.discoverStdioTools(entry.id);
  }

  private handleStdioLine(serverId: string, line: string): void {
    if (!line) return;
    try {
      const parsed = parseJsonRpcResponse(line);
      const id = String(parsed.id);
      const pending = this.pendingStdio.get(id);
      if (!pending) return;
      this.pendingStdio.delete(id);
      if (parsed.error) {
        pending.reject(new Error(`MCP ${serverId}: ${JSON.stringify(parsed.error)}`));
      } else {
        pending.resolve(parsed.result);
      }
    } catch (err) {
      // ignore malformed lines
    }
  }

  private async stdioCall(serverId: string, method: string, params?: unknown, timeoutMs = 10000): Promise<unknown> {
    const entry = this.servers.get(serverId);
    if (!entry) throw new Error(`Unknown MCP server ${serverId}`);
    const procInfo = this.processes.get(serverId);
    if (!procInfo) throw new Error(`MCP server ${serverId} stdio process not running`);
    const id = String(this.seq++);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingStdio.delete(id);
        reject(new Error(`MCP stdio call ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pendingStdio.set(id, {
        resolve: (v: unknown) => { clearTimeout(timer); resolve(v); },
        reject: (e: Error) => { clearTimeout(timer); reject(e); },
      });
      procInfo.stdin.write(jsonRpcRequest(method, params, id) + "\n");
    });
  }

  /** Retry a stdio call on timeout to survive child-process startup races. */
  private async stdioCallWithRetry(serverId: string, method: string, params?: unknown, timeoutMs = 10000, retries = 2): Promise<unknown> {
    let lastError: Error | undefined;
    for (let i = 0; i <= retries; i++) {
      try {
        return await this.stdioCall(serverId, method, params, timeoutMs);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (i < retries) await new Promise((r) => setTimeout(r, 300 * (i + 1)));
      }
    }
    throw lastError ?? new Error(`MCP stdio call ${method} failed`);
  }

  private async discoverStdioTools(serverId: string): Promise<void> {
    const entry = this.servers.get(serverId)!;
    const result = await this.stdioCallWithRetry(serverId, "tools/list", {}, entry.timeoutMs);
    const list = result as McpListToolsResult;
    for (const tool of list.tools ?? []) {
      this.registerDiscoveredTool({
        serverId,
        namespacedName: `${serverId}.${tool.name}`,
        inputSchema: tool.inputSchema ? (tool.inputSchema as z.ZodTypeAny) : z.any(),
        outputSchema: tool.outputSchema ? (tool.outputSchema as z.ZodTypeAny) : undefined,
        description: tool.description ?? "",
        sideEffectClass: entry.sideEffectClass,
        timeoutMs: entry.timeoutMs,
        concurrencyCap: entry.concurrencyCap,
        costEstimate: entry.sideEffectClass === "read" ? 1 : entry.sideEffectClass === "write" ? 3 : entry.sideEffectClass === "execute" ? 10 : 50,
        annotations: tool.annotations as any,
      });
    }
  }

  async callStdioTool(serverId: string, toolName: string, args: unknown): Promise<McpToolResult> {
    const result = await this.stdioCall(serverId, "tools/call", { name: toolName, arguments: args }, 30000);
    return this.normalizeToolResult(result);
  }

  // ── SSE / streamable-HTTP transport ───────────────────────────────────

  private async httpJsonRpc(url: string, method: string, params?: unknown, headers: Record<string, string> = {}): Promise<unknown> {
    const body = jsonRpcRequest(method, params, this.seq++);
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === "https:";
      const client = isHttps ? https : http;
      const opts: http.RequestOptions & { rejectUnauthorized?: boolean; timeout?: number } = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept": "application/json, text/event-stream",
          "content-length": Buffer.byteLength(body),
          ...headers,
        },
        rejectUnauthorized: false,
        timeout: 15000,
      };
      const req = client.request(opts, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(parseJsonRpcResponse(data));
          } catch (err) {
            reject(new Error(`MCP HTTP ${method}: invalid response ${data.slice(0, 200)}`));
          }
        });
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error(`MCP HTTP ${method} timed out`)); });
      req.write(body);
      req.end();
    });
  }

  async discoverHttpTools(entry: McpServerEntry): Promise<void> {
    if (!entry.url) throw new Error(`Server ${entry.id} has no URL`);
    const headers: Record<string, string> = {};
    if (entry.auth) headers[entry.auth.header] = entry.auth.value;
    const result = await this.httpJsonRpc(`${entry.url}/mcp`, "tools/list", {}, headers);
    const list = result as McpListToolsResult;
    for (const tool of list.tools ?? []) {
      this.registerDiscoveredTool({
        serverId: entry.id,
        namespacedName: `${entry.id}.${tool.name}`,
        inputSchema: tool.inputSchema ? (tool.inputSchema as z.ZodTypeAny) : z.any(),
        outputSchema: tool.outputSchema ? (tool.outputSchema as z.ZodTypeAny) : undefined,
        description: tool.description ?? "",
        sideEffectClass: entry.sideEffectClass,
        timeoutMs: entry.timeoutMs,
        concurrencyCap: entry.concurrencyCap,
        costEstimate: entry.sideEffectClass === "read" ? 1 : entry.sideEffectClass === "write" ? 3 : entry.sideEffectClass === "execute" ? 10 : 50,
        annotations: tool.annotations as any,
      });
    }
  }

  async callHttpTool(entry: McpServerEntry, toolName: string, args: unknown): Promise<McpToolResult> {
    if (!entry.url) throw new Error(`Server ${entry.id} has no URL`);
    const headers: Record<string, string> = {};
    if (entry.auth) headers[entry.auth.header] = entry.auth.value;
    const result = await this.httpJsonRpc(`${entry.url}/mcp`, "tools/call", { name: toolName, arguments: args }, headers);
    return this.normalizeToolResult(result);
  }

  // ── lifecycle ──────────────────────────────────────────────────────────

  async mountServer(entry: McpServerEntry): Promise<void> {
    this.registerServer(entry);
    try {
      if (entry.transport === "stdio") {
        await this.startStdio(entry);
      } else if (entry.transport === "sse" || entry.transport === "streamable-http") {
        await this.discoverHttpTools(entry);
      } else {
        throw new Error(`Unsupported MCP transport ${entry.transport}`);
      }
      this.emit("serverUp", entry.id);
    } catch (err) {
      this.emit("serverError", entry.id, err as Error);
      throw err;
    }
  }

  async unmountServer(serverId: string): Promise<void> {
    const proc = this.processes.get(serverId);
    if (proc) {
      try { proc.proc.kill(); } catch {}
      this.processes.delete(serverId);
    }
    this.servers.delete(serverId);
    for (const [ns, tool] of [...this.tools.entries()]) {
      if (tool.serverId === serverId) this.tools.delete(ns);
    }
    this.emit("serverDown", serverId);
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private registerDiscoveredTool(tool: DiscoveredTool): void {
    this.tools.set(tool.namespacedName, tool);
    this.emit("toolDiscovered", tool);
  }

  private normalizeToolResult(result: unknown): McpToolResult {
    if (!result || typeof result !== "object") return { ok: false, error: "empty tool result" };
    const r = result as { isError?: boolean; structuredContent?: unknown; content?: unknown; error?: unknown };
    if (r.isError) return { ok: false, error: String(r.error ?? "tool error"), structuredContent: r.structuredContent, content: r.content as any };
    return { ok: true, structuredContent: r.structuredContent, content: r.content as any };
  }

  async shutdown(): Promise<void> {
    for (const [serverId] of [...this.processes.keys()]) {
      await this.unmountServer(serverId);
    }
  }
}

export const mcpHost = new McpHostClient();
