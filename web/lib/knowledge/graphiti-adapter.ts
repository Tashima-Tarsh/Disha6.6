/**
 * DISHA 6.6 — Graphiti Temporal Knowledge Graph Adapter
 * Inspired by getzep/graphiti. Tracks time-bounded entity relationships and temporal updates.
 */
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
};

const temporalGraph = new Map<string, TemporalRelationship>();

export class GraphitiTemporalGraph {
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
    };
    temporalGraph.set(edgeId, rel);
    return rel;
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
    return true;
  }

  static clearForTests(): void {
    temporalGraph.clear();
  }
}

