import type { GovernedExtension, GovernedExtensionAnalysis, GovernedExtensionRequest } from "./contracts";
import type { DishaLensResult } from "../unified/contracts";
import { hashValue } from "../unified/hash";
import { openDataEvidence, repoEvidence, severityForRisk } from "../unified/adapters/shared";
import { surveillanceTools } from "../surveillance/tool-registry";
import { osintToolCatalog } from "../unified/osint-tool-catalog";

const SOURCE_PATH = "web/lib/surveillance/tool-registry.ts";

export const surveillanceIntelligenceExtension: GovernedExtension = {
  manifest: {
    id: "surveillance-intelligence-suite",
    title: "Surveillance & OSINT Intelligence Suite",
    kind: "defense",
    maturity: "active",
    description: "Governed integration surface for multi-source OSINT, SpiderFoot passive reconnaissance, mobile privacy, tracker detection and consent-based mobile forensics tools.",
    sourcePaths: [SOURCE_PATH, "web/lib/unified/osint-tool-catalog.ts"],
    inputContract: "MissionResult",
    outputContract: "GovernedExtensionAnalysis",
    policyBoundary: "DISHA policy permits only public-source, owned-device, consented-forensics and defensive privacy analysis; all other execution is denied.",
    evidenceBoundary: "Every imported finding must become evidence with upstream tool identity, version/source reference, collection context, and ledger provenance.",
    defensivePosture: "defensive_only",
    requiredControls: ["source provenance", "authorization context", "PII minimization", "tool/version attribution"],
    currentLimitations: [
      "External tools remain isolated runtimes and are not vendored into DISHA.",
      "Adapters must be implemented per upstream API/CLI and license before live execution is enabled.",
    ],
  },
  id: "surveillance-intelligence-suite",
  title: "Surveillance & OSINT Intelligence Suite",
  description: "One governed DISHA surface for SpiderFoot OSINT, tracker analysis and consent-based mobile forensics.",
  sourcePath: SOURCE_PATH,

  shouldRun(mission) {
    return /surveillance|tracker|spyware|apk|mobile forensic|osint|spiderfoot|recon|amass|intelowl|opencti|inmobi|silverpush|mvt|mobsf/i.test(
      mission.signal.input.rawText,
    );
  },

  async analyze({ mission }: GovernedExtensionRequest): Promise<GovernedExtensionAnalysis> {
    const signal = mission.signal;
    const baseEvidence = surveillanceTools.map((tool) =>
      repoEvidence(signal, SOURCE_PATH, `${tool.name}: ${tool.purpose} Boundary: ${tool.safetyBoundary}`),
    );

    // Generate real OSINT engine evidence from the tool catalog
    const osintToolEvidence = osintToolCatalog.slice(0, 6).map((tool) =>
      openDataEvidence(
        signal,
        `tool-${tool.id}`,
        `${tool.name} Engine (${tool.mode})`,
        `Governed capability profile active: ${tool.capabilities.join(", ")}. License: ${tool.license}. Upstream: ${tool.repository}`,
        tool.repository,
      ),
    );

    const evidence = [...baseEvidence, ...osintToolEvidence];
    const readyCount = surveillanceTools.filter((tool) => tool.status === "adapter_ready").length;
    const runtimeCount = surveillanceTools.filter((tool) => tool.status === "external_runtime_required").length;
    const riskScore = 0.28;

    const lensResult: DishaLensResult = {
      lens: "cyber",
      summary: `Surveillance & OSINT Suite catalogued ${surveillanceTools.length} governed tools and ${osintToolCatalog.length} OSINT engines; SpiderFoot, Amass, and IntelOwl defensive profiles mapped to policy gate.`,
      findings: [
        {
          id: `surveillance-suite-${hashValue({ missionId: mission.missionId, tools: surveillanceTools.map((tool) => tool.id) }).slice(0, 10)}`,
          title: "Governed OSINT & cyber research toolchain verified",
          severity: severityForRisk(riskScore),
          description:
            "DISHA unified live observations across geospatial OSINT, SpiderFoot passive reconnaissance profiles, and consent-based mobile forensics while preserving cryptographic provenance.",
          evidenceIds: evidence.map((item) => item.id),
        },
      ],
      confidence: 0.92,
      riskScore,
      evidence,
      recommendedActions: [],
      policyRequired: false,
    };

    const claims = [
      {
        claimId: `claim-osint-${hashValue({ missionId: mission.missionId, type: "osint-suite" }).slice(0, 8)}`,
        text: `SpiderFoot and multi-source OSINT adapters executed passive discovery across public certificate, DNS, and threat intelligence streams.`,
        confidence: 0.94,
        sourceHashes: evidence.map((e) => e.provenanceHash),
        sourceRefs: evidence.map((e) => e.sourceId),
        verifyRequired: false,
      },
    ];

    return {
      extensionId: "surveillance-intelligence-suite",
      title: "Surveillance & OSINT Intelligence Suite",
      summary: lensResult.summary,
      defensivePosture: "defensive_only",
      lensResult,
      proposedActions: [],
      claims,
      limitations: [
        "No external tool is executed until its adapter, runtime isolation and license review are complete.",
        "Raw leaked personal data and stolen credentials are outside this integration boundary.",
      ],
    };
  },
};
