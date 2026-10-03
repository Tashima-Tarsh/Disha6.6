import crypto from "node:crypto";
import { getDbPool } from "../server/db";
import { hashValue } from "./hash";

export type EvidenceVaultArtifact = {
  artifactId: string;
  sourceUri: string;
  content: string;
  contentHash: string;
  sourceAuthority: string;
  mimeType: string;
  retrievalMethod: "http_get" | "api" | "cli_worker" | "osint_stream" | "manual_upload";
  collectorVersion: string;
  missionId?: string;
  policyDecisionRef?: string;
  accessClassification: "public" | "internal" | "controlled" | "classified";
  versionIndex: number;
  previousArtifactId?: string;
  createdAt: string;
};

export type EvidenceVaultDiff = {
  diffId: string;
  previousArtifactId: string;
  newArtifactId: string;
  sourceUri: string;
  changeType: "content_modified" | "metadata_updated" | "superseded";
  addedLinesCount: number;
  removedLinesCount: number;
  patchSummary: string;
  changeTimestamp: string;
};

export type StoreArtifactInput = {
  sourceUri: string;
  content: string;
  sourceAuthority: string;
  mimeType?: string;
  retrievalMethod?: "http_get" | "api" | "cli_worker" | "osint_stream" | "manual_upload";
  collectorVersion?: string;
  missionId?: string;
  policyDecisionRef?: string;
  accessClassification?: "public" | "internal" | "controlled" | "classified";
};

const memoryArtifacts = new Map<string, EvidenceVaultArtifact>();
const memoryDiffs = new Map<string, EvidenceVaultDiff[]>();
const memoryUriIndex = new Map<string, string[]>(); // sourceUri -> artifactId[]

function computeSha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

function computeDiff(contentA: string, contentB: string): { added: number; removed: number; summary: string } {
  const linesA = contentA.split(/\r?\n/);
  const linesB = contentB.split(/\r?\n/);
  const setA = new Set(linesA);
  const setB = new Set(linesB);

  const added = linesB.filter((l) => !setA.has(l)).length;
  const removed = linesA.filter((l) => !setB.has(l)).length;

  const summary = `Diff: +${added} lines, -${removed} lines across versions (v1: ${linesA.length} lines, v2: ${linesB.length} lines).`;
  return { added, removed, summary };
}

export class EvidenceVault {
  static async store(input: StoreArtifactInput): Promise<{
    artifact: EvidenceVaultArtifact;
    isNewVersion: boolean;
    diff?: EvidenceVaultDiff;
  }> {
    const contentHash = computeSha256(input.content);
    const pool = getDbPool();

    if (!pool) {
      return this.storeInMemory(input, contentHash);
    }

    try {
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [input.sourceUri]);

        const prevRes = await client.query<{
          artifact_id: string;
          content: string;
          content_hash: string;
          version_index: number;
        }>(
          "select artifact_id, content, content_hash, version_index from disha_evidence_vault_artifacts where source_uri = $1 order by version_index desc limit 1",
          [input.sourceUri],
        );

        const latest = prevRes.rows[0];

        if (latest && latest.content_hash === contentHash) {
          await client.query("commit");
          const existing = await this.getArtifact(latest.artifact_id);
          if (existing) {
            return { artifact: existing, isNewVersion: false };
          }
        }

        const versionIndex = latest ? latest.version_index + 1 : 1;
        const previousArtifactId = latest ? latest.artifact_id : undefined;
        const timestamp = new Date().toISOString();
        const artifactId = `art_${hashValue(`${input.sourceUri}_v${versionIndex}_${timestamp}`).slice(0, 16)}`;

        const artifact: EvidenceVaultArtifact = {
          artifactId,
          sourceUri: input.sourceUri,
          content: input.content,
          contentHash,
          sourceAuthority: input.sourceAuthority,
          mimeType: input.mimeType ?? "text/plain",
          retrievalMethod: input.retrievalMethod ?? "http_get",
          collectorVersion: input.collectorVersion ?? "6.6.0",
          missionId: input.missionId,
          policyDecisionRef: input.policyDecisionRef,
          accessClassification: input.accessClassification ?? "public",
          versionIndex,
          previousArtifactId,
          createdAt: timestamp,
        };

        await client.query(
          `insert into disha_evidence_vault_artifacts
            (artifact_id, source_uri, content, content_hash, source_authority, mime_type, retrieval_method, collector_version, mission_id, policy_decision_ref, access_classification, version_index, previous_artifact_id, created_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            artifact.artifactId,
            artifact.sourceUri,
            artifact.content,
            artifact.contentHash,
            artifact.sourceAuthority,
            artifact.mimeType,
            artifact.retrievalMethod,
            artifact.collectorVersion,
            artifact.missionId ?? null,
            artifact.policyDecisionRef ?? null,
            artifact.accessClassification,
            artifact.versionIndex,
            artifact.previousArtifactId ?? null,
            artifact.createdAt,
          ],
        );

        let createdDiff: EvidenceVaultDiff | undefined;
        if (latest) {
          const { added, removed, summary } = computeDiff(latest.content, input.content);
          const diffId = `diff_${hashValue(`${latest.artifact_id}_${artifact.artifactId}`).slice(0, 16)}`;

          createdDiff = {
            diffId,
            previousArtifactId: latest.artifact_id,
            newArtifactId: artifact.artifactId,
            sourceUri: input.sourceUri,
            changeType: "content_modified",
            addedLinesCount: added,
            removedLinesCount: removed,
            patchSummary: summary,
            changeTimestamp: timestamp,
          };

          await client.query(
            `insert into disha_evidence_vault_diffs
              (diff_id, previous_artifact_id, new_artifact_id, source_uri, change_type, added_lines_count, removed_lines_count, patch_summary, change_timestamp)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              createdDiff.diffId,
              createdDiff.previousArtifactId,
              createdDiff.newArtifactId,
              createdDiff.sourceUri,
              createdDiff.changeType,
              createdDiff.addedLinesCount,
              createdDiff.removedLinesCount,
              createdDiff.patchSummary,
              createdDiff.changeTimestamp,
            ],
          );
        }

        await client.query("commit");
        return { artifact, isNewVersion: Boolean(latest), diff: createdDiff };
      } catch (err) {
        await client.query("rollback");
        throw err;
      } finally {
        client.release();
      }
    } catch {
      return this.storeInMemory(input, contentHash);
    }
  }

  private static storeInMemory(
    input: StoreArtifactInput,
    contentHash: string,
  ): {
    artifact: EvidenceVaultArtifact;
    isNewVersion: boolean;
    diff?: EvidenceVaultDiff;
  } {
    const existingIds = memoryUriIndex.get(input.sourceUri) ?? [];
    const latestId = existingIds.at(-1);
    const latest = latestId ? memoryArtifacts.get(latestId) : undefined;

    if (latest && latest.contentHash === contentHash) {
      return { artifact: latest, isNewVersion: false };
    }

    const versionIndex = latest ? latest.versionIndex + 1 : 1;
    const previousArtifactId = latest ? latest.artifactId : undefined;
    const timestamp = new Date().toISOString();
    const artifactId = `art_${hashValue(`${input.sourceUri}_v${versionIndex}_${timestamp}`).slice(0, 16)}`;

    const artifact: EvidenceVaultArtifact = {
      artifactId,
      sourceUri: input.sourceUri,
      content: input.content,
      contentHash,
      sourceAuthority: input.sourceAuthority,
      mimeType: input.mimeType ?? "text/plain",
      retrievalMethod: input.retrievalMethod ?? "http_get",
      collectorVersion: input.collectorVersion ?? "6.6.0",
      missionId: input.missionId,
      policyDecisionRef: input.policyDecisionRef,
      accessClassification: input.accessClassification ?? "public",
      versionIndex,
      previousArtifactId,
      createdAt: timestamp,
    };

    memoryArtifacts.set(artifactId, artifact);
    existingIds.push(artifactId);
    memoryUriIndex.set(input.sourceUri, existingIds);

    let createdDiff: EvidenceVaultDiff | undefined;
    if (latest) {
      const { added, removed, summary } = computeDiff(latest.content, input.content);
      const diffId = `diff_${hashValue(`${latest.artifactId}_${artifact.artifactId}`).slice(0, 16)}`;
      createdDiff = {
        diffId,
        previousArtifactId: latest.artifactId,
        newArtifactId: artifact.artifactId,
        sourceUri: input.sourceUri,
        changeType: "content_modified",
        addedLinesCount: added,
        removedLinesCount: removed,
        patchSummary: summary,
        changeTimestamp: timestamp,
      };

      const diffList = memoryDiffs.get(input.sourceUri) ?? [];
      diffList.push(createdDiff);
      memoryDiffs.set(input.sourceUri, diffList);
    }

    return { artifact, isNewVersion: Boolean(latest), diff: createdDiff };
  }

  static async getArtifact(artifactId: string): Promise<EvidenceVaultArtifact | null> {
    const pool = getDbPool();
    if (!pool) {
      return memoryArtifacts.get(artifactId) ?? null;
    }

    try {
      const res = await pool.query<{
        artifact_id: string;
        source_uri: string;
        content: string;
        content_hash: string;
        source_authority: string;
        mime_type: string;
        retrieval_method: "http_get" | "api" | "cli_worker" | "osint_stream" | "manual_upload";
        collector_version: string;
        mission_id: string | null;
        policy_decision_ref: string | null;
        access_classification: "public" | "internal" | "controlled" | "classified";
        version_index: number;
        previous_artifact_id: string | null;
        created_at: Date;
      }>("select * from disha_evidence_vault_artifacts where artifact_id = $1", [artifactId]);

      const r = res.rows[0];
      if (!r) return memoryArtifacts.get(artifactId) ?? null;

      return {
        artifactId: r.artifact_id,
        sourceUri: r.source_uri,
        content: r.content,
        contentHash: r.content_hash,
        sourceAuthority: r.source_authority,
        mimeType: r.mime_type,
        retrievalMethod: r.retrieval_method,
        collectorVersion: r.collector_version,
        missionId: r.mission_id ?? undefined,
        policyDecisionRef: r.policy_decision_ref ?? undefined,
        accessClassification: r.access_classification,
        versionIndex: r.version_index,
        previousArtifactId: r.previous_artifact_id ?? undefined,
        createdAt: r.created_at.toISOString(),
      };
    } catch {
      return memoryArtifacts.get(artifactId) ?? null;
    }
  }

  static async verifyIntegrity(artifactId: string): Promise<{
    valid: boolean;
    computedHash: string;
    expectedHash: string;
    artifact?: EvidenceVaultArtifact;
  }> {
    const artifact = await this.getArtifact(artifactId);
    if (!artifact) {
      throw new Error(`Artifact ${artifactId} not found in vault`);
    }

    const computedHash = computeSha256(artifact.content);
    const valid = computedHash === artifact.contentHash;

    return {
      valid,
      computedHash,
      expectedHash: artifact.contentHash,
      artifact,
    };
  }

  static async getHistory(sourceUri: string): Promise<EvidenceVaultArtifact[]> {
    const pool = getDbPool();
    if (!pool) {
      const ids = memoryUriIndex.get(sourceUri) ?? [];
      return ids.map((id) => memoryArtifacts.get(id)).filter((a): a is EvidenceVaultArtifact => Boolean(a));
    }

    try {
      const res = await pool.query<{
        artifact_id: string;
        source_uri: string;
        content: string;
        content_hash: string;
        source_authority: string;
        mime_type: string;
        retrieval_method: "http_get" | "api" | "cli_worker" | "osint_stream" | "manual_upload";
        collector_version: string;
        mission_id: string | null;
        policy_decision_ref: string | null;
        access_classification: "public" | "internal" | "controlled" | "classified";
        version_index: number;
        previous_artifact_id: string | null;
        created_at: Date;
      }>(
        "select * from disha_evidence_vault_artifacts where source_uri = $1 order by version_index asc",
        [sourceUri],
      );

      return res.rows.map((r) => ({
        artifactId: r.artifact_id,
        sourceUri: r.source_uri,
        content: r.content,
        contentHash: r.content_hash,
        sourceAuthority: r.source_authority,
        mimeType: r.mime_type,
        retrievalMethod: r.retrieval_method,
        collectorVersion: r.collector_version,
        missionId: r.mission_id ?? undefined,
        policyDecisionRef: r.policy_decision_ref ?? undefined,
        accessClassification: r.access_classification,
        versionIndex: r.version_index,
        previousArtifactId: r.previous_artifact_id ?? undefined,
        createdAt: r.created_at.toISOString(),
      }));
    } catch {
      const ids = memoryUriIndex.get(sourceUri) ?? [];
      return ids.map((id) => memoryArtifacts.get(id)).filter((a): a is EvidenceVaultArtifact => Boolean(a));
    }
  }

  static clearMemoryForTests(): void {
    memoryArtifacts.clear();
    memoryDiffs.clear();
    memoryUriIndex.clear();
  }
}
