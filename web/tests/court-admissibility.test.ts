import { describe, expect, it } from "vitest";
import {
  buildMerkleTree,
  verifyMerkleProof,
  generateCourtAdmissibilityCertificate,
  verifyCourtCertificateIntegrity,
} from "../lib/unified/court-admissibility";
import { appendEvidenceEvent, clearEvidenceLedgerForTests } from "../lib/unified/evidence-ledger";
import { hashValue } from "../lib/unified/hash";

describe("Court Admissibility & Merkle DAG Certification", () => {
  it("builds a cryptographic Merkle tree and generates valid inclusion proofs", () => {
    const leaves = [
      hashValue("finding_1_domain_registration"),
      hashValue("finding_2_ssh_key_fingerprint"),
      hashValue("finding_3_hidden_commit_email"),
      hashValue("finding_4_threat_intel_iocs"),
    ];

    const tree = buildMerkleTree(leaves);
    expect(tree.leafCount).toBe(4);
    expect(tree.rootHash).toMatch(/^[a-f0-9]{64}$/);

    // Verify inclusion proofs for each leaf
    for (const leaf of leaves) {
      const proof = tree.getProof(leaf);
      expect(proof).not.toBeNull();
      if (proof) {
        expect(proof.leafHash).toBe(leaf);
        expect(proof.rootHash).toBe(tree.rootHash);
        expect(verifyMerkleProof(proof)).toBe(true);
      }
    }
  });

  it("detects tampered proofs in the Merkle tree", () => {
    const leaves = [hashValue("node_a"), hashValue("node_b"), hashValue("node_c")];
    const tree = buildMerkleTree(leaves);
    const proof = tree.getProof(leaves[0]);
    expect(proof).not.toBeNull();

    if (proof) {
      // Tamper with the leaf hash
      const tamperedProof = {
        ...proof,
        leafHash: hashValue("forged_data"),
      };
      expect(verifyMerkleProof(tamperedProof)).toBe(false);
    }
  });

  it("generates an official Section 63 BSA / Section 65B Electronic Evidence Certificate with digital signature", async () => {
    await clearEvidenceLedgerForTests();
    const missionId = "court-case-2026-10-15";

    // Append sample forensic findings to ledger
    await appendEvidenceEvent({
      missionId,
      actor: "forensic-investigator-1",
      action: "FETCH_GITHUB_PROFILE",
      input: { handle: "adversary-actor" },
      output: { id: 98765, name: "Target Actor", email: "adversary@disclosed.in" },
    });

    await appendEvidenceEvent({
      missionId,
      actor: "forensic-investigator-1",
      action: "EXTRACT_SSH_PUBLIC_KEYS",
      input: { handle: "adversary-actor" },
      output: { fingerprintSha256: "SHA256:abc123def456", type: "ssh-ed25519" },
    });

    const certificate = await generateCourtAdmissibilityCertificate(missionId, {
      targetDescription: "FIR 412/2026 - Investigation of Unauthorized System Intrusions",
      certifyingOfficer: {
        name: "Devendra Verma",
        designation: "Deputy Director of Digital Forensics",
        agencyOrOrg: "DISHA Sovereign Defense Command",
        officialId: "DFIR-GOV-2026-09",
      },
    });

    expect(certificate.certificateId).toMatch(/^CERT-BSA-63-/);
    expect(certificate.statutoryReference).toContain("Section 63 Bharatiya Sakshya Adhiniyam, 2023");
    expect(certificate.cryptographicLedger.evidenceEventCount).toBe(2);
    expect(certificate.chainOfCustody.length).toBe(2);
    expect(certificate.legalDigitalSignature.signature).toMatch(/^[a-f0-9]{64}$/);

    // Verify markdown text contains required legal affirmations
    expect(certificate.courtSubmissionMarkdown).toContain("CERTIFICATE OF ELECTRONIC EVIDENCE");
    expect(certificate.courtSubmissionMarkdown).toContain("Devendra Verma");
    expect(certificate.courtSubmissionMarkdown).toContain("Deputy Director of Digital Forensics");
    expect(certificate.courtSubmissionMarkdown).toContain("FIR 412/2026");
    expect(certificate.courtSubmissionMarkdown).toContain(certificate.cryptographicLedger.merkleRootHash);

    // Mathematical verification of certificate integrity
    const verification = verifyCourtCertificateIntegrity(certificate);
    expect(verification.valid).toBe(true);
    expect(verification.merkleTreeValid).toBe(true);
    expect(verification.signatureValid).toBe(true);
    expect(verification.chainValid).toBe(true);
    expect(verification.errors.length).toBe(0);
  });

  it("fails verification if the certificate payload is altered after signing", async () => {
    const missionId = "court-case-tamper-test";
    await appendEvidenceEvent({
      missionId,
      actor: "officer-a",
      action: "RECORD_FINDING",
      input: { ip: "198.51.100.1" },
      output: { malicious: true },
    });

    const cert = await generateCourtAdmissibilityCertificate(missionId);

    // Tamper with the recorded root hash
    const forgedCert = {
      ...cert,
      cryptographicLedger: {
        ...cert.cryptographicLedger,
        merkleRootHash: hashValue("tampered_root"),
      },
    };

    const forgedVerification = verifyCourtCertificateIntegrity(forgedCert);
    expect(forgedVerification.valid).toBe(false);
    expect(forgedVerification.merkleTreeValid).toBe(false);
  });
});
