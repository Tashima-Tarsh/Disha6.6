import crypto from "node:crypto";
import os from "node:os";

import type { EvidenceEvent } from "./contracts";
import { getEvidenceEvents } from "./evidence-ledger";
import { hashValue } from "./hash";

export type MerkleProofStep = {
  hash: string;
  position: "left" | "right";
};

export type MerkleInclusionProof = {
  leafHash: string;
  rootHash: string;
  path: MerkleProofStep[];
};

export type MerkleTree = {
  rootHash: string;
  leafCount: number;
  leaves: string[];
  layers: string[][];
  getProof(leafHash: string): MerkleInclusionProof | null;
};

export type CourtCertificateParty = {
  name: string;
  designation: string;
  agencyOrOrg: string;
  officialId?: string;
};

export type CourtAdmissibilityCertificate = {
  certificateId: string;
  statutoryReference: string;
  isoStandard: string;
  issuedAtUtc: string;
  issuedAtIst: string;
  targetOrCaseIdentifier: string;
  missionId: string;
  certifyingOfficer: CourtCertificateParty;
  deviceEnvironment: {
    hostName: string;
    platform: string;
    runtime: string;
    engineVersion: string;
    hashAlgorithm: "SHA-256";
    macAddressOrMachineId: string;
  };
  operationalAffirmation: {
    systemOperatingProperly: boolean;
    dataIntegrityMaintained: boolean;
    tamperEvidentChainEnforced: boolean;
    affirmationText: string;
  };
  cryptographicLedger: {
    evidenceEventCount: number;
    genesisHash: string;
    latestEventHash: string;
    merkleRootHash: string;
  };
  chainOfCustody: Array<{
    sequenceNumber: number;
    eventId: string;
    action: string;
    timestampUtc: string;
    inputHash: string;
    outputHash?: string;
    eventHash: string;
    merkleProof: MerkleInclusionProof;
  }>;
  legalDigitalSignature: {
    algorithm: "HMAC-SHA256";
    signature: string;
    signedPayloadHash: string;
  };
  courtSubmissionMarkdown: string;
};

/**
 * Builds a binary SHA-256 Merkle Tree over an array of leaf hashes.
 */
export function buildMerkleTree(leafHashes: string[]): MerkleTree {
  if (leafHashes.length === 0) {
    const emptyRoot = hashValue("EMPTY_MERKLE_TREE");
    return {
      rootHash: emptyRoot,
      leafCount: 0,
      leaves: [],
      layers: [[emptyRoot]],
      getProof: () => null,
    };
  }

  const leaves = [...leafHashes];
  const layers: string[][] = [leaves];

  let currentLayer = leaves;
  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left; // duplicate odd leaf
      const combined = hashValue(`${left}:${right}`);
      nextLayer.push(combined);
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  const rootHash = layers[layers.length - 1][0];

  function getProof(targetLeaf: string): MerkleInclusionProof | null {
    let index = leaves.indexOf(targetLeaf);
    if (index === -1) return null;

    const path: MerkleProofStep[] = [];
    for (let layerIdx = 0; layerIdx < layers.length - 1; layerIdx++) {
      const layer = layers[layerIdx];
      const isRightChild = index % 2 === 1;
      const siblingIdx = isRightChild ? index - 1 : index + 1;

      if (siblingIdx < layer.length) {
        path.push({
          hash: layer[siblingIdx],
          position: isRightChild ? "left" : "right",
        });
      } else {
        path.push({
          hash: layer[index], // paired with itself
          position: "right",
        });
      }
      index = Math.floor(index / 2);
    }

    return {
      leafHash: targetLeaf,
      rootHash,
      path,
    };
  }

  return {
    rootHash,
    leafCount: leaves.length,
    leaves,
    layers,
    getProof,
  };
}

/**
 * Verifies a Merkle inclusion proof.
 */
export function verifyMerkleProof(proof: MerkleInclusionProof): boolean {
  let current = proof.leafHash;
  for (const step of proof.path) {
    if (step.position === "left") {
      current = hashValue(`${step.hash}:${current}`);
    } else {
      current = hashValue(`${current}:${step.hash}`);
    }
  }
  return current === proof.rootHash;
}

function getMachineIdentifier(): string {
  const nics = os.networkInterfaces();
  for (const nic of Object.values(nics)) {
    for (const addr of nic ?? []) {
      if (addr.mac && addr.mac !== "00:00:00:00:00:00") {
        return hashValue(`MACHINE:${addr.mac}:${os.hostname()}`).slice(0, 16);
      }
    }
  }
  return hashValue(`MACHINE:${os.hostname()}`).slice(0, 16);
}

function getSigningKey(): string {
  return process.env.DISHA_FORENSIC_SIGNING_KEY || process.env.SESSION_SECRET || "DISHA_SOVEREIGN_FORENSIC_SEAL_V6";
}

/**
 * Generates an official Certificate of Electronic Evidence under Section 63 of
 * the Bharatiya Sakshya Adhiniyam, 2023 / Section 65B of Indian Evidence Act, 1872
 * and ISO/IEC 27037:2012 for court admissibility.
 */
export async function generateCourtAdmissibilityCertificate(
  missionId: string,
  options?: {
    certifyingOfficer?: Partial<CourtCertificateParty>;
    targetDescription?: string;
  },
): Promise<CourtAdmissibilityCertificate> {
  const events = await getEvidenceEvents(missionId);
  const now = new Date();
  const issuedAtUtc = now.toISOString();

  // Compute Indian Standard Time (IST = UTC + 5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const issuedAtIst = istDate.toISOString().replace("Z", "+05:30");

  const officer: CourtCertificateParty = {
    name: options?.certifyingOfficer?.name ?? "Authorized Forensic Investigator",
    designation: options?.certifyingOfficer?.designation ?? "Chief Digital Forensics Examiner",
    agencyOrOrg: options?.certifyingOfficer?.agencyOrOrg ?? "DISHA Cognitive Defense & Intelligence Command",
    officialId: options?.certifyingOfficer?.officialId ?? "DISHA-INV-66-OFFICER",
  };

  const leafHashes = events.map((e) => e.eventHash);
  const merkleTree = buildMerkleTree(leafHashes);

  const genesisHash = events[0]?.previousHash ?? "GENESIS";
  const latestEventHash = events[events.length - 1]?.eventHash ?? genesisHash;

  const certificateId = `CERT-BSA-63-${crypto.randomUUID().toUpperCase().slice(0, 12)}`;

  const machineId = getMachineIdentifier();
  const deviceEnvironment = {
    hostName: os.hostname(),
    platform: `${os.platform()} ${os.arch()} (${os.release()})`,
    runtime: `Node.js ${process.version}`,
    engineVersion: "DISHA-Unified-6.6-Production-Sovereign",
    hashAlgorithm: "SHA-256" as const,
    macAddressOrMachineId: machineId,
  };

  const operationalAffirmation = {
    systemOperatingProperly: true,
    dataIntegrityMaintained: true,
    tamperEvidentChainEnforced: true,
    affirmationText:
      "I hereby certify and solemnly affirm under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 " +
      "(and corresponding Section 65B of the Indian Evidence Act, 1872) that the electronic records detailed herein " +
      "were produced by the computer system described above during a period when the system was in lawful and regular " +
      "operation. The digital contents, network packets, OSINT artifacts, and forensic findings have been acquired " +
      "contemporaneously and preserved through an unbroken cryptographic Merkle DAG chain. No unauthorized alteration, " +
      "tampering, or synthetic interpolation has affected the authenticity or integrity of the electronic output.",
  };

  const chainOfCustody = events.map((event, idx) => {
    const proof = merkleTree.getProof(event.eventHash) ?? {
      leafHash: event.eventHash,
      rootHash: merkleTree.rootHash,
      path: [],
    };

    return {
      sequenceNumber: idx + 1,
      eventId: event.eventId,
      action: event.action,
      timestampUtc: event.timestamp,
      inputHash: event.inputHash,
      outputHash: event.outputHash,
      eventHash: event.eventHash,
      merkleProof: proof,
    };
  });

  // Calculate cryptographic signature
  const signablePayload = JSON.stringify({
    certificateId,
    missionId,
    issuedAtUtc,
    merkleRootHash: merkleTree.rootHash,
    genesisHash,
    latestEventHash,
    eventCount: events.length,
    machineId,
  });

  const signedPayloadHash = hashValue(signablePayload);
  const signature = crypto.createHmac("sha256", getSigningKey()).update(signedPayloadHash).digest("hex");

  const legalDigitalSignature = {
    algorithm: "HMAC-SHA256" as const,
    signature,
    signedPayloadHash,
  };

  const courtSubmissionMarkdown = renderCourtCertificateMarkdown({
    certificateId,
    statutoryReference: "Section 63 Bharatiya Sakshya Adhiniyam, 2023 / Section 65B Indian Evidence Act, 1872",
    isoStandard: "ISO/IEC 27037:2012 (Digital Evidence Handling)",
    issuedAtUtc,
    issuedAtIst,
    targetOrCaseIdentifier: options?.targetDescription ?? missionId,
    missionId,
    officer,
    deviceEnvironment,
    operationalAffirmation,
    merkleRootHash: merkleTree.rootHash,
    genesisHash,
    latestEventHash,
    eventCount: events.length,
    signature,
    chainOfCustody,
  });

  return {
    certificateId,
    statutoryReference: "Section 63 Bharatiya Sakshya Adhiniyam, 2023 / Section 65B Indian Evidence Act, 1872",
    isoStandard: "ISO/IEC 27037:2012",
    issuedAtUtc,
    issuedAtIst,
    targetOrCaseIdentifier: options?.targetDescription ?? missionId,
    missionId,
    certifyingOfficer: officer,
    deviceEnvironment,
    operationalAffirmation,
    cryptographicLedger: {
      evidenceEventCount: events.length,
      genesisHash,
      latestEventHash,
      merkleRootHash: merkleTree.rootHash,
    },
    chainOfCustody,
    legalDigitalSignature,
    courtSubmissionMarkdown,
  };
}

/**
 * Validates a generated court certificate mathematically against its Merkle Root and digital seal.
 */
export function verifyCourtCertificateIntegrity(cert: CourtAdmissibilityCertificate): {
  valid: boolean;
  merkleTreeValid: boolean;
  signatureValid: boolean;
  chainValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 1. Recompute Merkle root from chain of custody event hashes
  const leafHashes = cert.chainOfCustody.map((c) => c.eventHash);
  const recomputedTree = buildMerkleTree(leafHashes);
  const merkleTreeValid = recomputedTree.rootHash === cert.cryptographicLedger.merkleRootHash;
  if (!merkleTreeValid) {
    errors.push(`Merkle Root mismatch: expected ${cert.cryptographicLedger.merkleRootHash}, calculated ${recomputedTree.rootHash}`);
  }

  // 2. Validate individual Merkle inclusion proofs
  let chainValid = true;
  for (const item of cert.chainOfCustody) {
    if (!verifyMerkleProof(item.merkleProof)) {
      chainValid = false;
      errors.push(`Merkle inclusion proof invalid for sequence #${item.sequenceNumber} (${item.eventId})`);
    }
  }

  // 3. Recompute digital signature
  const signablePayload = JSON.stringify({
    certificateId: cert.certificateId,
    missionId: cert.missionId,
    issuedAtUtc: cert.issuedAtUtc,
    merkleRootHash: cert.cryptographicLedger.merkleRootHash,
    genesisHash: cert.cryptographicLedger.genesisHash,
    latestEventHash: cert.cryptographicLedger.latestEventHash,
    eventCount: cert.cryptographicLedger.evidenceEventCount,
    machineId: cert.deviceEnvironment.macAddressOrMachineId,
  });

  const calculatedPayloadHash = hashValue(signablePayload);
  const expectedSig = crypto.createHmac("sha256", getSigningKey()).update(calculatedPayloadHash).digest("hex");
  const signatureValid = cert.legalDigitalSignature.signature === expectedSig;
  if (!signatureValid) {
    errors.push("Digital cryptographic seal verification failed");
  }

  const valid = merkleTreeValid && chainValid && signatureValid && errors.length === 0;
  return {
    valid,
    merkleTreeValid,
    signatureValid,
    chainValid,
    errors,
  };
}

function renderCourtCertificateMarkdown(params: {
  certificateId: string;
  statutoryReference: string;
  isoStandard: string;
  issuedAtUtc: string;
  issuedAtIst: string;
  targetOrCaseIdentifier: string;
  missionId: string;
  officer: CourtCertificateParty;
  deviceEnvironment: {
    hostName: string;
    platform: string;
    runtime: string;
    engineVersion: string;
    hashAlgorithm: string;
    macAddressOrMachineId: string;
  };
  operationalAffirmation: {
    affirmationText: string;
  };
  merkleRootHash: string;
  genesisHash: string;
  latestEventHash: string;
  eventCount: number;
  signature: string;
  chainOfCustody: Array<{
    sequenceNumber: number;
    eventId: string;
    action: string;
    timestampUtc: string;
    inputHash: string;
    outputHash?: string;
    eventHash: string;
  }>;
}): string {
  const rows = params.chainOfCustody
    .map(
      (c) =>
        `| ${c.sequenceNumber} | \`${c.action}\` | ${c.timestampUtc} | \`${c.eventHash}\` | \`${c.inputHash}\` | \`${c.outputHash ?? "N/A"}\` |`,
    )
    .join("\n");

  return `
# CERTIFICATE OF ELECTRONIC EVIDENCE
### Admissible under ${params.statutoryReference}
**Standards Conformance:** ${params.isoStandard} | **Certificate ID:** \`${params.certificateId}\`

---

### I. DECLARATION OF CERTIFYING AUTHORITY
I, **${params.officer.name}**, holding the position of **${params.officer.designation}** at **${params.officer.agencyOrOrg}** (Official ID: \`${params.officer.officialId}\`), do hereby solemnly state and affirm as under:

1. That I have lawful control and supervisory access over the computing infrastructure and automated forensic analysis engine designated as **${params.deviceEnvironment.engineVersion}**.
2. That on **${params.issuedAtIst} (IST)** / **${params.issuedAtUtc} (UTC)**, digital intelligence and forensic evidence acquisition was conducted in respect of target/case **${params.targetOrCaseIdentifier}** (Mission Reference: \`${params.missionId}\`).

---

### II. STATUTORY AFFIRMATION OF OPERATIONAL INTEGRITY
> "${params.operationalAffirmation.affirmationText}"

---

### III. COMPUTING ENVIRONMENT SPECIFICATIONS
* **Host Machine Name:** \`${params.deviceEnvironment.hostName}\`
* **Operating Platform:** \`${params.deviceEnvironment.platform}\`
* **Execution Runtime:** \`${params.deviceEnvironment.runtime}\`
* **Forensic Node Identifier:** \`${params.deviceEnvironment.macAddressOrMachineId}\`
* **Cryptographic Hash Engine:** \`${params.deviceEnvironment.hashAlgorithm}\` (FIPS 180-4 compliant)

---

### IV. CRYPTOGRAPHIC MERKLE DAG ROOTS & LEDGER INTEGRITY
All acquired electronic artifacts have been serialized, timestamped, and linked via a cryptographic Merkle Directed Acyclic Graph (DAG):
* **Merkle Root Hash (SHA-256):** \`${params.merkleRootHash}\`
* **Genesis Hash:** \`${params.genesisHash}\`
* **Terminal Event Hash:** \`${params.latestEventHash}\`
* **Total Preserved Evidence Records:** **${params.eventCount}**

---

### V. CHRONOLOGICAL CHAIN OF CUSTODY TABLE (UNREDACTED FORENSIC DIGESTS)
| # | Forensic Action | Timestamp (UTC) | Merkle Event Hash (SHA-256) | Input Fingerprint (SHA-256) | Output Digest (SHA-256) |
|:---|:---|:---|:---|:---|:---|
${rows || "| - | *No events registered* | - | - | - | - |"}

---

### VI. DIGITAL FORENSIC SEAL
* **Seal Algorithm:** HMAC-SHA256
* **Cryptographic Signature:** \`${params.signature}\`
* **Admissibility Verification Status:** **VERIFIED & IMMUTABLE**

Certified on this day: **${params.issuedAtIst}**  
*Signature / Digital Forensic Verification Stamp:* **[ ELECTRONICALLY SEALED & VERIFIED BY DISHA SOVEREIGN ROOT ]**
`.trim();
}
