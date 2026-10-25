/**
 * DISHA 6.6 — Langfuse AI Observability & Tracing Bridge
 * Connects to upstream langfuse/langfuse service with persistent telemetry backup.
 */
import fs from "node:fs";
import path from "node:path";
import { hashValue } from "@/lib/unified/hash";

export type TraceSpan = {
  spanId: string;
  name: string;
  startTime: string;
  endTime?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: "SUCCESS" | "ERROR" | "PENDING";
  metadata?: Record<string, unknown>;
};

export type MissionTrace = {
  traceId: string;
  missionId: string;
  userId?: string;
  timestamp: string;
  spans: TraceSpan[];
  metadata: Record<string, unknown>;
  syncedToUpstream?: boolean;
};

export type LangfuseHealth = {
  status: "ONLINE" | "OFFLINE" | "NOT_CONFIGURED";
  baseUrl: string | null;
  storedTracesCount: number;
};

const TRACE_STORAGE_FILE = path.resolve(process.cwd(), "..", "data", "langfuse-telemetry.json");

function loadTraces(): Map<string, MissionTrace> {
  const store = new Map<string, MissionTrace>();
  try {
    if (fs.existsSync(TRACE_STORAGE_FILE)) {
      const raw = fs.readFileSync(TRACE_STORAGE_FILE, "utf-8");
      const list: MissionTrace[] = JSON.parse(raw);
      for (const item of list) {
        store.set(item.traceId, item);
      }
    }
  } catch (err) {
    console.warn("[langfuse-telemetry] Could not load persisted traces:", err);
  }
  return store;
}

function saveTraces(store: Map<string, MissionTrace>): void {
  try {
    const list = Array.from(store.values());
    fs.mkdirSync(path.dirname(TRACE_STORAGE_FILE), { recursive: true });
    fs.writeFileSync(TRACE_STORAGE_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.warn("[langfuse-telemetry] Could not persist traces to disk:", err);
  }
}

let persistedTraces = loadTraces();

export class LangfuseTelemetry {
  private static baseUrl = process.env.LANGFUSE_BASE_URL || "http://127.0.0.1:3000";
  private static publicKey = process.env.LANGFUSE_PUBLIC_KEY || "";
  private static secretKey = process.env.LANGFUSE_SECRET_KEY || "";

  static async checkHealth(): Promise<LangfuseHealth> {
    if (!process.env.LANGFUSE_BASE_URL) {
      return {
        status: "NOT_CONFIGURED",
        baseUrl: null,
        storedTracesCount: persistedTraces.size,
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/public/health`, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      return {
        status: res.ok ? "ONLINE" : "OFFLINE",
        baseUrl: this.baseUrl,
        storedTracesCount: persistedTraces.size,
      };
    } catch {
      return {
        status: "OFFLINE",
        baseUrl: this.baseUrl,
        storedTracesCount: persistedTraces.size,
      };
    }
  }

  static createTrace(missionId: string, metadata: Record<string, unknown> = {}): MissionTrace {
    const traceId = `trace-${hashValue(`${missionId}:${Date.now()}`).slice(0, 16)}`;
    const trace: MissionTrace = {
      traceId,
      missionId,
      timestamp: new Date().toISOString(),
      spans: [],
      metadata,
      syncedToUpstream: false,
    };
    persistedTraces.set(traceId, trace);
    saveTraces(persistedTraces);

    if (process.env.LANGFUSE_BASE_URL && this.publicKey && this.secretKey) {
      this.sendTraceToUpstream(trace).catch(() => {});
    }

    return trace;
  }

  static async sendTraceToUpstream(trace: MissionTrace): Promise<boolean> {
    try {
      const auth = Buffer.from(`${this.publicKey}:${this.secretKey}`).toString("base64");
      const res = await fetch(`${this.baseUrl}/api/public/ingestion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          batch: [
            {
              id: trace.traceId,
              type: "trace-create",
              timestamp: trace.timestamp,
              body: {
                id: trace.traceId,
                name: trace.missionId,
                metadata: trace.metadata,
              },
            },
          ],
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        trace.syncedToUpstream = true;
        persistedTraces.set(trace.traceId, trace);
        saveTraces(persistedTraces);
        return true;
      }
    } catch {
      // Offline fallback preserved
    }
    return false;
  }

  static addSpan(
    traceId: string,
    name: string,
    input?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): TraceSpan | null {
    const trace = persistedTraces.get(traceId);
    if (!trace) return null;

    const spanId = `span-${hashValue(`${name}:${Date.now()}`).slice(0, 12)}`;
    const span: TraceSpan = {
      spanId,
      name,
      startTime: new Date().toISOString(),
      input,
      status: "PENDING",
      metadata,
    };
    trace.spans.push(span);
    saveTraces(persistedTraces);
    return span;
  }

  static endSpan(
    traceId: string,
    spanId: string,
    status: "SUCCESS" | "ERROR",
    output?: Record<string, unknown>,
  ): boolean {
    const trace = persistedTraces.get(traceId);
    if (!trace) return false;

    const span = trace.spans.find((s) => s.spanId === spanId);
    if (!span) return false;

    span.endTime = new Date().toISOString();
    span.status = status;
    span.output = output;
    saveTraces(persistedTraces);
    return true;
  }

  static getTrace(traceId: string): MissionTrace | null {
    return persistedTraces.get(traceId) ?? null;
  }

  static listTraces(limit = 20): MissionTrace[] {
    return Array.from(persistedTraces.values()).slice(-limit);
  }

  static clearForTests(): void {
    persistedTraces.clear();
    saveTraces(persistedTraces);
  }
}

