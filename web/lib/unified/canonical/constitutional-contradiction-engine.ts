import { hashValue } from "../hash";
import { getDbPool } from "../../server/db";
import {
  type ContradictionType,
  type DISHAClaim,
  type DISHAEvidence,
  type DISHAContradiction,
  dishaContradictionSchema,
} from "./types";

const memoryContradictions = new Map<string, DISHAContradiction>();

const SAFETY_PREAMBLE = "[INVESTIGATORY SIGNAL - NOT A FINDING OF WRONGDOING OR FRAUD]";

export class ConstitutionalContradictionEngine {
  static detectContradiction(
    claimA: DISHAClaim,
    claimB: DISHAClaim,
    evidenceA?: DISHAEvidence,
    evidenceB?: DISHAEvidence,
  ): DISHAContradiction | null {
    if (claimA.claimId === claimB.claimId) return null;
    if (claimA.subject.toLowerCase() !== claimB.subject.toLowerCase()) return null;
    if (claimA.predicate.toLowerCase() !== claimB.predicate.toLowerCase()) return null;

    let conflictType: ContradictionType | null = null;
    let reason = "";

    const valA = claimA.value;
    const valB = claimB.value;

    const numA = typeof valA === "number" ? valA : Number(valA);
    const numB = typeof valB === "number" ? valB : Number(valB);

    if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
      if (Math.abs(numA - numB) > 0.001) {
        conflictType = "amount_inconsistency";
        reason = `Discrepancy in recorded quantity for '${claimA.subject} ${claimA.predicate}': ${valA} vs ${valB}.`;
      }
    } else if (typeof valA === "boolean" && typeof valB === "boolean") {
      if (valA !== valB) {
        conflictType = "statement_vs_statement";
        reason = `Direct binary assertion conflict for '${claimA.subject} ${claimA.predicate}': ${valA} vs ${valB}.`;
      }
    } else {
      const strA = String(valA).trim().toLowerCase();
      const strB = String(valB).trim().toLowerCase();

      if (strA !== strB) {
        const dateA = Date.parse(strA);
        const dateB = Date.parse(strB);
        if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
          conflictType = "date_inconsistency";
          reason = `Conflicting milestone/timeline dates recorded for '${claimA.subject}': ${strA} vs ${strB}.`;
        } else if (
          claimA.sourceAuthority.toLowerCase().includes("court") ||
          claimB.sourceAuthority.toLowerCase().includes("court")
        ) {
          conflictType = "court_order_vs_implementation";
          reason = `Judicial directive from '${claimA.sourceAuthority}' conflicts with subsequent implementation statement from '${claimB.sourceAuthority}'.`;
        } else if (
          claimA.sourceAuthority.toLowerCase().includes("gov") ||
          claimB.sourceAuthority.toLowerCase().includes("gov") ||
          claimA.sourceAuthority.toLowerCase().includes("board") ||
          claimB.sourceAuthority.toLowerCase().includes("board") ||
          claimA.sourceAuthority.toLowerCase().includes("ministry") ||
          claimB.sourceAuthority.toLowerCase().includes("ministry") ||
          claimA.sourceFamilyId.toLowerCase().includes("gov") ||
          claimB.sourceFamilyId.toLowerCase().includes("gov")
        ) {
          conflictType = "gov_reply_vs_record";
          reason = `Official institutional disclosure from '${claimA.sourceAuthority}' diverges from recorded observation from '${claimB.sourceAuthority}'.`;
        } else {
          conflictType = "statement_vs_statement";
          reason = `Direct factual contradiction between '${claimA.sourceAuthority}' and '${claimB.sourceAuthority}': "${valA}" vs "${valB}".`;
        }
      }
    }

    if (!conflictType) return null;

    const sourceIndependence = claimA.sourceFamilyId !== claimB.sourceFamilyId;
    const confidence = Number(
      Math.min(0.95, (claimA.confidence + claimB.confidence) / 2 + (sourceIndependence ? 0.1 : 0)).toFixed(2),
    );

    const timestamp = new Date().toISOString();
    const sortedIds = [claimA.claimId, claimB.claimId].sort();
    const contradictionId = `contra_${hashValue(`${sortedIds[0]}_${sortedIds[1]}_${conflictType}`).slice(0, 16)}`;

    const explanation = `${SAFETY_PREAMBLE}: ${reason}`;

    return dishaContradictionSchema.parse({
      contradictionId,
      claimA: claimA.claimId,
      claimB: claimB.claimId,
      evidenceA: evidenceA?.evidenceId ?? claimA.supportingEvidence[0] ?? `ev_${claimA.claimId}`,
      evidenceB: evidenceB?.evidenceId ?? claimB.supportingEvidence[0] ?? `ev_${claimB.claimId}`,
      conflictType,
      explanation,
      confidence,
      sourceIndependence,
      reviewRequired: true,
      resolutionState: "investigating",
      createdAt: timestamp,
    });
  }

  static evaluateClaims(
    claims: DISHAClaim[],
    evidenceMap?: Map<string, DISHAEvidence>,
  ): DISHAContradiction[] {
    const results: DISHAContradiction[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const a = claims[i];
        const b = claims[j];
        if (!a || !b) continue;

        const contra = this.detectContradiction(
          a,
          b,
          evidenceMap?.get(a.supportingEvidence[0] ?? ""),
          evidenceMap?.get(b.supportingEvidence[0] ?? ""),
        );

        if (contra && !seen.has(contra.contradictionId)) {
          seen.add(contra.contradictionId);
          results.push(contra);
        }
      }
    }

    return results;
  }

  static async persistContradiction(contra: DISHAContradiction): Promise<DISHAContradiction> {
    const pool = getDbPool();
    if (!pool) {
      memoryContradictions.set(contra.contradictionId, contra);
      return contra;
    }

    try {
      await pool.query(
        `insert into disha_canonical_contradictions
          (contradiction_id, claim_a, claim_b, evidence_a, evidence_b, conflict_type, explanation, confidence, source_independence, review_required, resolution_state, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         on conflict (contradiction_id) do update set
           explanation = excluded.explanation,
           confidence = excluded.confidence,
           source_independence = excluded.source_independence,
           review_required = excluded.review_required,
           resolution_state = excluded.resolution_state`,
        [
          contra.contradictionId,
          contra.claimA,
          contra.claimB,
          contra.evidenceA,
          contra.evidenceB,
          contra.conflictType,
          contra.explanation,
          contra.confidence,
          contra.sourceIndependence,
          contra.reviewRequired,
          contra.resolutionState,
          contra.createdAt,
        ],
      );
      return contra;
    } catch {
      memoryContradictions.set(contra.contradictionId, contra);
      return contra;
    }
  }

  static async listContradictions(): Promise<DISHAContradiction[]> {
    const pool = getDbPool();
    if (!pool) {
      return [...memoryContradictions.values()];
    }

    try {
      const res = await pool.query<{
        contradiction_id: string;
        claim_a: string;
        claim_b: string;
        evidence_a: string;
        evidence_b: string;
        conflict_type: ContradictionType;
        explanation: string;
        confidence: number;
        source_independence: boolean;
        review_required: boolean;
        resolution_state: "investigating" | "sub judice" | "resolved_temporal" | "confirmed_contradiction" | "dismissed";
        created_at: Date;
      }>("select * from disha_canonical_contradictions order by created_at desc limit 100");

      return res.rows.map((r) => ({
        contradictionId: r.contradiction_id,
        claimA: r.claim_a,
        claimB: r.claim_b,
        evidenceA: r.evidence_a,
        evidenceB: r.evidence_b,
        conflictType: r.conflict_type,
        explanation: r.explanation,
        confidence: Number(r.confidence),
        sourceIndependence: r.source_independence,
        reviewRequired: true,
        resolutionState: r.resolution_state,
        createdAt: r.created_at.toISOString(),
      }));
    } catch {
      return [...memoryContradictions.values()];
    }
  }

  static clearMemoryForTests(): void {
    memoryContradictions.clear();
  }
}
