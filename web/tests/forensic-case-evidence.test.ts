import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";

import { createSession } from "../lib/server/auth";
import {
  ForensicCaseEvidenceService,
} from "../lib/unified/forensic-case-evidence";
import {
  clearEvidenceLedgerForTests,
  getEvidenceEvents,
  verifyEvidenceChain,
} from "../lib/unified/evidence-ledger";
import { clearHybridRetrievalForTests, hybridRetrieve } from "../lib/unified/hybrid-retrieval";
import type { RequestContext } from "../lib/server/types";
import { GET as listEvidenceRoute } from "../app/api/v1/forensics/cases/[caseId]/evidence/route";

vi.mock("../lib/server/audit", () => ({ audit: vi.fn(async () => {}) }));
vi.mock("../lib/server/redis", () => ({ getRedisClient: vi.fn(async () => null) }));

const ctx: RequestContext = {
  requestId: "test-request-forensics",
  principal: {
    userId: "operator-1",
    email: "operator@example.test",
    roles: ["operator"],
  },
};

describe("forensic case evidence ingestion", () => {
  beforeEach(async () => {
    await ForensicCaseEvidenceService.clearForTests();
    await clearEvidenceLedgerForTests();
    clearHybridRetrievalForTests();
  });

  it("creates a case and preserves original evidence bytes with SHA-256 metadata", async () => {
    const service = new ForensicCaseEvidenceService();
    const forensicCase = await service.createCase({
      caseId: "CASE-2026-ICMR-001",
      title: "ICMR breach source review",
      authorizationScope: "Authorized breach documentation review for CASE-2026-ICMR-001",
    }, ctx);
    const bytes = Buffer.from("Reported breach document\nEmail: citizen@example.test\n", "utf8");
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    const result = await service.ingestEvidence({
      caseId: forensicCase.caseId,
      originalFilename: "source-note.txt",
      mimeType: "text/plain",
      bytes,
      acquisitionMethod: "manual_upload_from_authorized_case_file",
      sourceDescription: "Investigator supplied breach-source note",
      authorizationScope: forensicCase.authorizationScope,
      acquiredAt: "2026-10-08T12:00:00.000Z",
    }, ctx);

    expect(result.duplicate).toBe(false);
    expect(result.evidence.caseId).toBe("CASE-2026-ICMR-001");
    expect(result.evidence.sha256).toBe(sha256);
    expect(result.evidence.byteSize).toBe(bytes.length);
    expect(result.evidence.sensitivePersonalDataDetected).toBe(true);
    expect(["memory_base64_test_v1", "postgres_base64_v1"]).toContain(result.evidence.immutableStorage);

    const events = await getEvidenceEvents(forensicCase.caseId);
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe("forensic.evidence.ingested");
    expect(verifyEvidenceChain(events).ok).toBe(true);

    const search = await hybridRetrieve("Reported breach document citizen", { kinds: ["source_record"] });
    const hit = search.hits.find((item) => item.refId === result.evidence.evidenceId);
    expect(hit?.sourceHashes).toContain(sha256);
    expect(hit?.metadata).toMatchObject({
      caseId: "CASE-2026-ICMR-001",
      evidenceId: result.evidence.evidenceId,
      verificationStatus: "preserved",
    });
  });

  it("deduplicates identical evidence bytes within the same case but appends custody events", async () => {
    const service = new ForensicCaseEvidenceService();
    await service.createCase({
      caseId: "CASE-DUP-001",
      title: "Duplicate evidence check",
      authorizationScope: "Authorized duplicate evidence preservation check",
    }, ctx);
    const input = {
      caseId: "CASE-DUP-001",
      originalFilename: "record.json",
      mimeType: "application/json",
      bytes: Buffer.from(JSON.stringify({ subject: "same record" })),
      acquisitionMethod: "manual_upload_from_authorized_case_file",
      sourceDescription: "Same file uploaded twice",
      authorizationScope: "Authorized duplicate evidence preservation check",
    };

    const first = await service.ingestEvidence(input, ctx);
    const second = await service.ingestEvidence(input, ctx);

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.evidence.evidenceId).toBe(first.evidence.evidenceId);

    const events = await getEvidenceEvents("CASE-DUP-001");
    expect(events.map((event) => event.action)).toEqual([
      "forensic.evidence.ingested",
      "forensic.evidence.duplicate_ingest",
    ]);
    expect(verifyEvidenceChain(events)).toEqual({ ok: true, errors: [] });
  });

  it("enforces case-level access before listing or ingesting evidence", async () => {
    const service = new ForensicCaseEvidenceService();
    const owner: RequestContext = {
      requestId: "owner-request",
      principal: { userId: "analyst-owner", email: "owner@example.test", roles: ["analyst"] },
    };
    const outsider: RequestContext = {
      requestId: "outsider-request",
      principal: { userId: "analyst-outsider", email: "outsider@example.test", roles: ["analyst"] },
    };

    await service.createCase({
      caseId: "CASE-PRIVATE-001",
      title: "Private case access check",
      authorizationScope: "Authorized private case access check",
    }, owner);

    await expect(service.listEvidence("CASE-PRIVATE-001", outsider)).rejects.toMatchObject({ status: 403 });
    await expect(service.ingestEvidence({
      caseId: "CASE-PRIVATE-001",
      originalFilename: "outside.txt",
      mimeType: "text/plain",
      bytes: Buffer.from("outside access attempt"),
      acquisitionMethod: "manual_upload_from_authorized_case_file",
      sourceDescription: "Unauthorized upload attempt",
      authorizationScope: "Authorized private case access check",
    }, outsider)).rejects.toMatchObject({ status: 403 });
  });

  it("enforces authentication and case authorization at the evidence API boundary", async () => {
    const service = new ForensicCaseEvidenceService();
    const ownerSession = await createSession("api-owner@example.test", ["analyst"]);
    const outsiderSession = await createSession("api-outsider@example.test", ["analyst"]);
    await service.createCase({
      caseId: "CASE-API-AUTH-001",
      title: "API case auth check",
      authorizationScope: "Authorized API case access check",
    }, {
      requestId: "api-owner-create",
      principal: ownerSession.principal,
    });

    const params = { params: Promise.resolve({ caseId: "CASE-API-AUTH-001" }) };
    expect((await listEvidenceRoute(new NextRequest("https://disha.test/api/v1/forensics/cases/CASE-API-AUTH-001/evidence"), params)).status).toBe(401);

    const denied = await listEvidenceRoute(
      new NextRequest("https://disha.test/api/v1/forensics/cases/CASE-API-AUTH-001/evidence", {
        headers: { authorization: `Bearer ${outsiderSession.accessToken}` },
      }),
      params,
    );
    expect(denied.status).toBe(403);

    const allowed = await listEvidenceRoute(
      new NextRequest("https://disha.test/api/v1/forensics/cases/CASE-API-AUTH-001/evidence", {
        headers: { authorization: `Bearer ${ownerSession.accessToken}` },
      }),
      params,
    );
    expect(allowed.status).toBe(200);
  });
});
