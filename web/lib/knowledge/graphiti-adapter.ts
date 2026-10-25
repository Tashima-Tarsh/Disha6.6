/**
 * DISHA 6.6 — Graphiti Temporal Knowledge Graph Adapter
 * Connects to getzep/graphiti upstream service with persistent temporal storage.
 */
import fs from "node:fs";
import path from "node:path";
import { hashValue } from "@/lib/unified/hash";

export type TemporalRelationship = {
  edgeId: string;
  sourceEntity: string;
  relation: string;
  targetEntity: string;
  validFrom: string;
  validTo?: string;
  confidence: number;
  provenanceHash: string;
  syncedToUpstream?: boolean;
};

export type GraphitiServiceHealth = {
  status: "ONLINE" | "OFFLINE" | "NOT_CONFIGURED";
  upstreamUrl: string | null;
  storedEdgesCount: number;
};

const PERSISTENCE_FILE = path.resolve(process.cwd(), "..", "data", "graphiti-temporal-graph.json");

function loadStore(): Map<string, TemporalRelationship> {
  const store = new Map<string, TemporalRelationship>();
  try {
    if (fs.existsSync(PERSISTENCE_FILE)) {
      const raw = fs.readFileSync(PERSISTENCE_FILE, "utf-8");
      const list: TemporalRelationship[] = JSON.parse(raw);
      for (const item of list) {
        store.set(item.edgeId, item);
      }
    }
  } catch (err) {
    console.warn("[graphiti-adapter] Could not load persisted graph:", err);
  }
  return store;
}

function saveStore(store: Map<string, TemporalRelationship>): void {
  try {
    const list = Array.from(store.values());
    fs.mkdirSync(path.dirname(PERSISTENCE_FILE), { recursive: true });
    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.warn("[graphiti-adapter] Could not persist graph to disk:", err);
  }
}

let temporalGraph = loadStore();

export class GraphitiTemporalGraph {
  private static upstreamUrl = process.env.GRAPHITI_URL || "http://127.0.0.1:8000";

  static async checkHealth(): Promise<GraphitiServiceHealth> {
    if (!process.env.GRAPHITI_URL) {
      return {
        status: "NOT_CONFIGURED",
        upstreamUrl: null,
        storedEdgesCount: temporalGraph.size,
      };
    }

    try {
      const res = await fetch(`${this.upstreamUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      return {
        status: res.ok ? "ONLINE" : "OFFLINE",
        upstreamUrl: this.upstreamUrl,
        storedEdgesCount: temporalGraph.size,
      };
    } catch {
      return {
        status: "OFFLINE",
        upstreamUrl: this.upstreamUrl,
        storedEdgesCount: temporalGraph.size,
      };
    }
  }

  static addRelationship(input: {
    sourceEntity: string;
    relation: string;
    targetEntity: string;
    validFrom?: string;
    validTo?: string;
    confidence?: number;
  }): TemporalRelationship {
    const from = input.validFrom || new Date().toISOString();
    const edgeId = `edge-${hashValue(`${input.sourceEntity}:${input.relation}:${input.targetEntity}:${from}`).slice(0, 16)}`;
    const rel: TemporalRelationship = {
      edgeId,
      sourceEntity: input.sourceEntity.trim().toLowerCase(),
      relation: input.relation.trim().toLowerCase(),
      targetEntity: input.targetEntity.trim(),
      validFrom: from,
      validTo: input.validTo,
      confidence: input.confidence ?? 1.0,
      provenanceHash: hashValue({ ...input, from }),
      syncedToUpstream: false,
    };

    temporalGraph.set(edgeId, rel);
    saveStore(temporalGraph);

    // Asynchronously dispatch upstream sync if configured
    if (process.env.GRAPHITI_URL) {
      this.syncEdgeToUpstream(rel).catch(() => {});
    }

    return rel;
  }

  static async syncEdgeToUpstream(edge: TemporalRelationship): Promise<boolean> {
    try {
      const res = await fetch(`${this.upstreamUrl}/v1/edges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edge),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        edge.syncedToUpstream = true;
        temporalGraph.set(edge.edgeId, edge);
        saveStore(temporalGraph);
        return true;
      }
    } catch {
      // Offline fallback preserved
    }
    return false;
  }

  static queryRelationships(
    entity: string,
    asOf: Date = new Date(),
  ): TemporalRelationship[] {
    const norm = entity.trim().toLowerCase();
    const asOfTime = asOf.getTime();

    return Array.from(temporalGraph.values()).filter((rel) => {
      const matches = rel.sourceEntity === norm || rel.targetEntity.toLowerCase() === norm;
      if (!matches) return false;

      const fromTime = Date.parse(rel.validFrom);
      const toTime = rel.validTo ? Date.parse(rel.validTo) : Infinity;
      return asOfTime >= fromTime && asOfTime <= toTime;
    });
  }

  static supersedeRelationship(edgeId: string, validTo?: string): boolean {
    const rel = temporalGraph.get(edgeId);
    if (!rel) return false;
    rel.validTo = validTo || new Date().toISOString();
    temporalGraph.set(edgeId, rel);
    saveStore(temporalGraph);
    return true;
  }

  static clearForTests(): void {
    temporalGraph.clear();
    saveStore(temporalGraph);
  }
}

