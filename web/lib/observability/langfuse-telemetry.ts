/**
 * DISHA 6.6 — Langfuse AI Observability & Tracing Bridge
 * Inspired by langfuse/langfuse. Emits structured traces for missions, agent steps, and model calls.
 */
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
};

const inMemoryTraces = new Map<string, MissionTrace>();

export class LangfuseTelemetry {
  static createTrace(missionId: string, metadata: Record<string, unknown> = {}): MissionTrace {
    const traceId = `trace-${hashValue(`${missionId}:${Date.now()}`).slice(0, 16)}`;
    const trace: MissionTrace = {
      traceId,
      missionId,
      timestamp: new Date().toISOString(),
      spans: [],
      metadata,
    };
    inMemoryTraces.set(traceId, trace);
    return trace;
  }

  static addSpan(
    traceId: string,
    name: string,
    input?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): TraceSpan | null {
    const trace = inMemoryTraces.get(traceId);
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
    return span;
  }

  static endSpan(
    traceId: string,
    spanId: string,
    status: "SUCCESS" | "ERROR",
    output?: Record<string, unknown>,
  ): boolean {
    const trace = inMemoryTraces.get(traceId);
    if (!trace) return false;

    const span = trace.spans.find((s) => s.spanId === spanId);
    if (!span) return false;

    span.endTime = new Date().toISOString();
    span.status = status;
    span.output = output;
    return true;
  }

  static getTrace(traceId: string): MissionTrace | null {
    return inMemoryTraces.get(traceId) ?? null;
  }

  static listTraces(limit = 20): MissionTrace[] {
    return Array.from(inMemoryTraces.values()).slice(-limit);
  }

  static clearForTests(): void {
    inMemoryTraces.clear();
  }
}

