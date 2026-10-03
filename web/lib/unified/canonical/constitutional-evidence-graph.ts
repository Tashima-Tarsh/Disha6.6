import { hashValue } from "../hash";
import { getDbPool } from "../../server/db";
import {
  type DISHAClaim,
  type DISHAEntity,
  type DISHAEvidence,
  type DISHARelationship,
  type DISHAEvidenceChain,
  dishaEvidenceChainSchema,
  dishaEntitySchema,
  dishaRelationshipSchema,
} from "./types";
import { EvidenceVault, type EvidenceVaultArtifact } from "../evidence-vault";

export type ClaimToProofDetail = {
  claim: DISHAClaim;
  evidenceChain: DISHAEvidenceChain;
  supportingArtifacts: Array<{
    evidenceId: string;
    exactPassage: string;
    sourceAuthority: string;
    sourceTier: string;
    contentHash: string;
    retrievalTime: string;
    vaultArtifact?: EvidenceVaultArtifact | null;
  }>;
  reviewState: string;
  isVerified: boolean;
  unverifiedReason?: string;
};

const memoryEntities = new Map<string, DISHAEntity>();
const memoryRelationships = new Map<string, DISHARelationship>();
const memoryClaims = new Map<string, DISHAClaim>();
const memoryEvidence = new Map<string, DISHAEvidence>();

export class ConstitutionalEvidenceGraph {
  static async addEntity(entity: DISHAEntity): Promise<DISHAEntity> {
    const parsed = dishaEntitySchema.parse(entity);
    const pool = getDbPool();
    if (!pool) {
      memoryEntities.set(parsed.entityId, parsed);
      return parsed;
    }

    try {
      await pool.query(
        `insert into disha_constitutional_entities
          (entity_id, entity_type, name, canonical_identifier, aliases, attributes, confidence, first_observed_at, last_observed_at, provenance_hash)
         values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10)
         on conflict (entity_id) do update set
           aliases = excluded.aliases,
           attributes = excluded.attributes,
           confidence = excluded.confidence,
           last_observed_at = excluded.last_observed_at`,
        [
          parsed.entityId,
          parsed.entityType,
          parsed.name,
          parsed.canonicalIdentifier,
          JSON.stringify(parsed.aliases),
          JSON.stringify(parsed.attributes),
          parsed.confidence,
          parsed.firstObservedAt,
          parsed.lastObservedAt,
          parsed.provenanceHash,
        ],
      );
      return parsed;
    } catch {
      memoryEntities.set(parsed.entityId, parsed);
      return parsed;
    }
  }

  static async getEntity(entityId: string): Promise<DISHAEntity | null> {
    const pool = getDbPool();
    if (!pool) {
      return memoryEntities.get(entityId) ?? null;
    }

    try {
      const res = await pool.query<{
        entity_id: string;
        entity_type: string;
        name: string;
        canonical_identifier: string;
        aliases: string[];
        attributes: Record<string, unknown>;
        confidence: number;
        first_observed_at: Date;
        last_observed_at: Date;
        provenance_hash: string;
      }>("select * from disha_constitutional_entities where entity_id = $1", [entityId]);

      const r = res.rows[0];
      if (!r) return null;

      return dishaEntitySchema.parse({
        entityId: r.entity_id,
        entityType: r.entity_type,
        name: r.name,
        canonicalIdentifier: r.canonical_identifier,
        aliases: r.aliases,
        attributes: r.attributes,
        confidence: Number(r.confidence),
        firstObservedAt: r.first_observed_at.toISOString(),
        lastObservedAt: r.last_observed_at.toISOString(),
        provenanceHash: r.provenance_hash,
      });
    } catch {
      return memoryEntities.get(entityId) ?? null;
    }
  }

  static async addRelationship(rel: DISHARelationship): Promise<DISHARelationship> {
    const parsed = dishaRelationshipSchema.parse(rel);
    const pool = getDbPool();
    if (!pool) {
      memoryRelationships.set(parsed.relationshipId, parsed);
      return parsed;
    }

    try {
      await pool.query(
        `insert into disha_constitutional_relationships
          (relationship_id, source_entity_id, target_entity_id, relation_type, source_ref, retrieval_timestamp, confidence, evidence_ref, content_hash, admission_status, review_status, actor, policy_decision_ref)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         on conflict (relationship_id) do update set
           confidence = excluded.confidence,
           admission_status = excluded.admission_status,
           review_status = excluded.review_status`,
        [
          parsed.relationshipId,
          parsed.sourceEntityId,
          parsed.targetEntityId,
          parsed.relationType,
          parsed.sourceRef,
          parsed.retrievalTimestamp,
          parsed.confidence,
          parsed.evidenceRef,
          parsed.contentHash,
          parsed.admissionStatus,
          parsed.reviewStatus,
          parsed.actor,
          parsed.policyDecisionRef ?? null,
        ],
      );
      return parsed;
    } catch {
      memoryRelationships.set(parsed.relationshipId, parsed);
      return parsed;
    }
  }

  static registerClaim(claim: DISHAClaim): void {
    memoryClaims.set(claim.claimId, claim);
  }

  static registerEvidence(ev: DISHAEvidence): void {
    memoryEvidence.set(ev.evidenceId, ev);
  }

  static async expandClaimToProofChain(claimId: string): Promise<ClaimToProofDetail> {
    const claim = memoryClaims.get(claimId);
    if (!claim) {
      throw new Error(`Claim not found in registry: ${claimId}`);
    }

    const supportingArtifacts: ClaimToProofDetail["supportingArtifacts"] = [];
    const chainSteps: DISHAEvidenceChain["steps"] = [];

    let stepIndex = 0;
    chainSteps.push({
      stepIndex: stepIndex++,
      phase: "SOURCE",
      refId: claim.sourceFamilyId,
      contentHash: hashValue(claim.sourceFamilyId),
      sourceAuthority: claim.sourceAuthority,
      timestamp: claim.createdAt,
      actor: claim.createdBy,
      isAiActor: true,
    });

    for (const evId of claim.supportingEvidence) {
      const ev = memoryEvidence.get(evId);
      if (ev) {
        const vaultArtifact = await EvidenceVault.getArtifact(ev.vaultArtifactId);
        supportingArtifacts.push({
          evidenceId: ev.evidenceId,
          exactPassage: ev.exactPassage,
          sourceAuthority: ev.sourceAuthority,
          sourceTier: ev.sourceTier,
          contentHash: ev.contentHash,
          retrievalTime: ev.retrievedAt,
          vaultArtifact,
        });

        chainSteps.push({
          stepIndex: stepIndex++,
          phase: "EVIDENCE",
          refId: ev.evidenceId,
          contentHash: ev.contentHash,
          sourceAuthority: ev.sourceAuthority,
          timestamp: ev.retrievedAt,
          actor: "agent_claim_to_proof",
          isAiActor: true,
        });
      }
    }

    const overallIntegrityHash = hashValue(chainSteps);
    const evidenceChain = dishaEvidenceChainSchema.parse({
      chainId: `chain_${hashValue(`${claimId}_${overallIntegrityHash}`).slice(0, 16)}`,
      claimId,
      steps: chainSteps,
      overallIntegrityHash,
    });

    const isVerified = claim.reviewState === "verified";
    const unverifiedReason = isVerified
      ? undefined
      : "Claim is currently unverified. Constitutional rules mandate that AI outputs cannot assign verified status without analyst review or primary official order.";

    return {
      claim,
      evidenceChain,
      supportingArtifacts,
      reviewState: claim.reviewState,
      isVerified,
      unverifiedReason,
    };
  }

  static clearMemoryForTests(): void {
    memoryEntities.clear();
    memoryRelationships.clear();
    memoryClaims.clear();
    memoryEvidence.clear();
  }
}
