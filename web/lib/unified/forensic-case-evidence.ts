import crypto from "node:crypto";
import { getDbPool } from "../server/db";
import { audit } from "../server/audit";
import type { RequestContext } from "../server/types";
import { appendEvidenceEvent } from "./evidence-ledger";
import { indexSearchDocument } from "./hybrid-retrieval";

export type ForensicCaseStatus = "open" | "restricted" | "closed" | "sealed";

export type ForensicCase = {
  caseId: string;
  title: string;
  description?: string;
  status: ForensicCaseStatus;
  authorizationScope: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ForensicEvidencePackage = {
  evidenceId: string;
  caseId: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  acquisitionMethod: string;
  sourceDescription: string;
  authorizationScope: string;
  acquiringActor: string;
  acquiredAt: string;
  immutableStorage: string;
  sensitivePersonalDataDetected: boolean;
  status: "preserved" | "parsed" | "quarantined" | "superseded";
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CreateCaseInput = {
  caseId?: string;
  title: string;
  description?: string;
  authorizationScope: string;
};

export type IngestEvidenceInput = {
  caseId: string;
  originalFilename: string;
  mimeType: string;
  bytes: Buffer;
  acquisitionMethod: string;
  sourceDescription: string;
  authorizationScope: string;
  acquiredAt?: string;
  metadata?: Record<string, unknown>;
};

export type ForensicCaseAccessMode = "read" | "write";

const memoryCases = new Map<string, ForensicCase>();
const memoryEvidence = new Map<string, ForensicEvidencePackage & { originalBytesBase64: string }>();

function sha256(bytes: Buffer): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function makeId(prefix: string, value: string): string {
  return `${prefix}_${crypto.createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function detectSensitivePersonalData(bytes: Buffer, mimeType: string): boolean {
  if (!/^text\/|json|xml|csv|html|message\/rfc822/i.test(mimeType)) return false;
  const text = bytes.toString("utf8", 0, Math.min(bytes.length, 256_000));
  return [
    /\b\d{4}\s?\d{4}\s?\d{4}\b/,
    /\b[A-Z]{5}\d{4}[A-Z]\b/i,
    /\b(?:\+?91[\s-]?)?[6-9]\d{9}\b/,
    /\b[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}\b/i,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  ].some((pattern) => pattern.test(text));
}

function publicEvidence(value: ForensicEvidencePackage & { originalBytesBase64?: string }): ForensicEvidencePackage {
  const { originalBytesBase64: _originalBytesBase64, ...view } = value;
  return view;
}

function canAccessCase(forensicCase: ForensicCase, ctx: RequestContext, mode: ForensicCaseAccessMode): boolean {
  if (ctx.principal.roles.includes("admin")) return true;
  if (ctx.principal.roles.includes("operator")) return true;
  if (forensicCase.status === "sealed" || forensicCase.status === "closed") return false;
  if (forensicCase.createdBy !== ctx.principal.userId) return false;
  return mode === "read" || ctx.principal.roles.includes("analyst");
}

function assertCaseAccess(forensicCase: ForensicCase, ctx: RequestContext, mode: ForensicCaseAccessMode): void {
  if (!canAccessCase(forensicCase, ctx, mode)) {
    throw Object.assign(new Error("Forbidden for this forensic case"), { status: 403 });
  }
}

function isIndexableTextEvidence(mimeType: string, byteSize: number): boolean {
  return byteSize <= 1_000_000 && (/^text\//i.test(mimeType) || /(?:json|xml|csv|html|markdown|yaml)/i.test(mimeType));
}

function extractIndexableText(bytes: Buffer, mimeType: string): string | null {
  if (!isIndexableTextEvidence(mimeType, bytes.length)) return null;
  const text = bytes.toString("utf8").replace(/\u0000/g, "").trim();
  if (!text) return null;
  return text.slice(0, 50_000);
}

function rowToCase(row: {
  case_id: string;
  title: string;
  description: string | null;
  status: ForensicCaseStatus;
  authorization_scope: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}): ForensicCase {
  return {
    caseId: row.case_id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    authorizationScope: row.authorization_scope,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function rowToEvidence(row: {
  evidence_id: string;
  case_id: string;
  original_filename: string;
  mime_type: string;
  byte_size: string | number;
  sha256: string;
  acquisition_method: string;
  source_description: string;
  authorization_scope: string;
  acquiring_actor: string;
  acquired_at: Date;
  immutable_storage: string;
  sensitive_personal_data_detected: boolean;
  status: ForensicEvidencePackage["status"];
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}): ForensicEvidencePackage {
  return {
    evidenceId: row.evidence_id,
    caseId: row.case_id,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    byteSize: Number(row.byte_size),
    sha256: row.sha256,
    acquisitionMethod: row.acquisition_method,
    sourceDescription: row.source_description,
    authorizationScope: row.authorization_scope,
    acquiringActor: row.acquiring_actor,
    acquiredAt: row.acquired_at.toISOString(),
    immutableStorage: row.immutable_storage,
    sensitivePersonalDataDetected: row.sensitive_personal_data_detected,
    status: row.status,
    metadata: row.metadata ?? {},
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class ForensicCaseEvidenceService {
  async createCase(input: CreateCaseInput, ctx: RequestContext): Promise<ForensicCase> {
    const caseId = input.caseId?.trim() || makeId("case", `${ctx.principal.userId}:${input.title}:${Date.now()}`);
    if (!/^[A-Za-z0-9_.:-]{3,96}$/.test(caseId)) {
      throw Object.assign(new Error("Invalid case identifier"), { status: 400 });
    }

    const pool = getDbPool();
    if (!pool) {
      const now = new Date().toISOString();
      const value: ForensicCase = {
        caseId,
        title: input.title,
        description: input.description,
        status: "open",
        authorizationScope: input.authorizationScope,
        createdBy: ctx.principal.userId,
        createdAt: now,
        updatedAt: now,
      };
      memoryCases.set(caseId, value);
      return value;
    }

    const result = await pool.query(
      `insert into forensic_cases (case_id, title, description, authorization_scope, created_by)
       values ($1, $2, $3, $4, $5)
       on conflict (case_id) do update
         set title=excluded.title,
             description=excluded.description,
             authorization_scope=excluded.authorization_scope,
             updated_at=now()
       returning *`,
      [caseId, input.title, input.description ?? null, input.authorizationScope, ctx.principal.userId],
    );
    return rowToCase(result.rows[0]);
  }

  async getCase(caseId: string): Promise<ForensicCase | null> {
    const pool = getDbPool();
    if (!pool) return memoryCases.get(caseId) ?? null;
    const result = await pool.query("select * from forensic_cases where case_id=$1", [caseId]);
    return result.rows[0] ? rowToCase(result.rows[0]) : null;
  }

  async requireCaseAccess(caseId: string, ctx: RequestContext, mode: ForensicCaseAccessMode): Promise<ForensicCase> {
    const forensicCase = await this.getCase(caseId);
    if (!forensicCase) throw Object.assign(new Error("Forensic case not found"), { status: 404 });
    assertCaseAccess(forensicCase, ctx, mode);
    return forensicCase;
  }

  async ingestEvidence(input: IngestEvidenceInput, ctx: RequestContext): Promise<{
    evidence: ForensicEvidencePackage;
    duplicate: boolean;
    ledgerEventId: string;
  }> {
    const forensicCase = await this.requireCaseAccess(input.caseId, ctx, "write");
    if (input.bytes.length === 0) throw Object.assign(new Error("Evidence file is empty"), { status: 400 });
    if (input.bytes.length > 50 * 1024 * 1024) throw Object.assign(new Error("Evidence file exceeds 50 MB limit"), { status: 413 });
    const digest = sha256(input.bytes);
    const acquiredAt = input.acquiredAt ?? new Date().toISOString();
    const sensitive = detectSensitivePersonalData(input.bytes, input.mimeType);
    const evidenceId = makeId("ev", `${input.caseId}:${digest}`);
    const originalBytesBase64 = input.bytes.toString("base64");
    const indexableText = extractIndexableText(input.bytes, input.mimeType || "application/octet-stream");

    let evidence: ForensicEvidencePackage;
    let duplicate = false;
    const pool = getDbPool();

    if (!pool) {
      const existing = [...memoryEvidence.values()].find((item) => item.caseId === input.caseId && item.sha256 === digest);
      if (existing) {
        evidence = publicEvidence(existing);
        duplicate = true;
      } else {
        const now = new Date().toISOString();
        const value: ForensicEvidencePackage & { originalBytesBase64: string } = {
          evidenceId,
          caseId: input.caseId,
          originalFilename: input.originalFilename,
          mimeType: input.mimeType || "application/octet-stream",
          byteSize: input.bytes.length,
          sha256: digest,
          originalBytesBase64,
          acquisitionMethod: input.acquisitionMethod,
          sourceDescription: input.sourceDescription,
          authorizationScope: input.authorizationScope,
          acquiringActor: ctx.principal.userId,
          acquiredAt,
          immutableStorage: "memory_base64_test_v1",
          sensitivePersonalDataDetected: sensitive,
          status: "preserved",
          metadata: input.metadata ?? {},
          createdAt: now,
          updatedAt: now,
        };
        memoryEvidence.set(evidenceId, value);
        evidence = publicEvidence(value);
      }
    } else {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const caseResult = await client.query("select case_id from forensic_cases where case_id=$1", [input.caseId]);
        if (caseResult.rowCount === 0) throw Object.assign(new Error("Forensic case not found"), { status: 404 });
        const existing = await client.query("select * from forensic_evidence_packages where case_id=$1 and sha256=$2", [input.caseId, digest]);
        if (existing.rows[0]) {
          evidence = rowToEvidence(existing.rows[0]);
          duplicate = true;
        } else {
          const inserted = await client.query(
            `insert into forensic_evidence_packages (
              evidence_id, case_id, original_filename, mime_type, byte_size, sha256, original_bytes_base64,
              acquisition_method, source_description, authorization_scope, acquiring_actor, acquired_at,
              sensitive_personal_data_detected, metadata
            ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            returning *`,
            [
              evidenceId,
              input.caseId,
              input.originalFilename,
              input.mimeType || "application/octet-stream",
              input.bytes.length,
              digest,
              originalBytesBase64,
              input.acquisitionMethod,
              input.sourceDescription,
              input.authorizationScope,
              ctx.principal.userId,
              acquiredAt,
              sensitive,
              input.metadata ?? {},
            ],
          );
          evidence = rowToEvidence(inserted.rows[0]);
        }
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    }

    const event = await appendEvidenceEvent({
      missionId: input.caseId,
      actor: ctx.principal.userId,
      action: duplicate ? "forensic.evidence.duplicate_ingest" : "forensic.evidence.ingested",
      input: {
        caseId: input.caseId,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        byteSize: input.bytes.length,
        sha256: digest,
        acquisitionMethod: input.acquisitionMethod,
        authorizationScope: input.authorizationScope,
      },
      output: {
        evidenceId: evidence.evidenceId,
        preserved: true,
        immutableStorage: evidence.immutableStorage,
        sensitivePersonalDataDetected: evidence.sensitivePersonalDataDetected,
      },
    });

    await audit({
      requestId: ctx.requestId,
      userId: ctx.principal.userId,
      action: duplicate ? "forensic.evidence.duplicate_ingest" : "forensic.evidence.ingested",
      resource: evidence.evidenceId,
      outcome: "success",
      metadata: {
        caseId: input.caseId,
        sha256: digest,
        byteSize: input.bytes.length,
        mimeType: input.mimeType,
        sensitivePersonalDataDetected: evidence.sensitivePersonalDataDetected,
        ledgerEventId: event.eventId,
      },
    });

    if (!duplicate && indexableText) {
      try {
        await indexSearchDocument({
          docKind: "source_record",
          refId: evidence.evidenceId,
          subject: input.caseId,
          title: `${input.originalFilename} (${input.caseId})`,
          content: indexableText,
          sourceHashes: [digest],
          metadata: {
            caseId: input.caseId,
            evidenceId: evidence.evidenceId,
            sha256: digest,
            mimeType: evidence.mimeType,
            byteSize: evidence.byteSize,
            acquisitionMethod: evidence.acquisitionMethod,
            verificationStatus: "preserved",
            authorizationScope: forensicCase.authorizationScope,
            sensitivePersonalDataDetected: evidence.sensitivePersonalDataDetected,
          },
          observedAt: evidence.acquiredAt,
        });
      } catch (error) {
        await audit({
          requestId: ctx.requestId,
          userId: ctx.principal.userId,
          action: "forensic.evidence.search_index_failed",
          resource: evidence.evidenceId,
          outcome: "failure",
          metadata: {
            caseId: input.caseId,
            sha256: digest,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    return { evidence, duplicate, ledgerEventId: event.eventId };
  }

  async listEvidence(caseId: string, ctx?: RequestContext): Promise<ForensicEvidencePackage[]> {
    if (ctx) await this.requireCaseAccess(caseId, ctx, "read");
    const pool = getDbPool();
    if (!pool) {
      return [...memoryEvidence.values()]
        .filter((item) => item.caseId === caseId)
        .map(publicEvidence)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    const result = await pool.query(
      "select * from forensic_evidence_packages where case_id=$1 order by created_at desc",
      [caseId],
    );
    return result.rows.map(rowToEvidence);
  }

  static async clearForTests(): Promise<void> {
    memoryCases.clear();
    memoryEvidence.clear();
    const pool = getDbPool();
    if (pool) {
      await pool.query("truncate table forensic_evidence_packages, forensic_cases cascade");
    }
  }

  static clearMemoryForTests(): void {
    memoryCases.clear();
    memoryEvidence.clear();
  }
}

export const forensicCaseEvidence = new ForensicCaseEvidenceService();
