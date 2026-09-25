import type { GovernedExtension, GovernedExtensionAnalysis, GovernedExtensionRequest } from "./contracts";
import type { DishaLensResult } from "../unified/contracts";
import { hashValue } from "../unified/hash";
import { repoEvidence, severityForRisk } from "../unified/adapters/shared";
import { surveillanceTools } from "../surveillance/tool-registry";

const SOURCE_PATH = "web/lib/surveillance/tool-registry.ts";

export const surveillanceIntelligenceExtension: GovernedExtension = {
  manifest: {
    id: "surveillance-intelligence-suite",
    title: "Surveillance Intelligence Suite",
    kind: "defense",
    maturity: "active",
    description: "Governed integration surface for public-source OSINT, mobile privacy, tracker detection and consent-based mobile forensics tools.",
    sourcePaths: [SOURCE_PATH],
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
  title: "Surveillance Intelligence Suite",
  description: "One governed DISHA surface for OSINT, tracker analysis and consent-based mobile forensics.",
  sourcePath: SOURCE_PATH,

  shouldRun(mission) {
    return /surveillance|tracker|spyware|apk|mobile forensic|osint|inmobi|silverpush|mvt|mobsf/i.test(
      mission.signal.input.rawText,
    );
  },

  async analyze({ mission }: GovernedExtensionRequest): Promise<GovernedExtensionAnalysis> {
    const signal = mission.signal;
    const evidence = surveillanceTools.map((tool) =>
      repoEvidence(signal, SOURCE_PATH, `${tool.name}: ${tool.purpose} Boundary: ${tool.safetyBoundary}`),
    );
    const readyCount = surveillanceTools.filter((tool) => tool.status === "adapter_ready").length;
    const runtimeCount = surveillanceTools.filter((tool) => tool.status === "external_runtime_required").length;
    const riskScore = 0.32;

    const lensResult: DishaLensResult = {
      lens: "cyber",
      summary: `Surveillance Intelligence Suite catalogued ${surveillanceTools.length} governed tools; ${readyCount} adapters are live and ${runtimeCount} require isolated external runtimes.`,
      findings: [
        {
          id: `surveillance-suite-${hashValue({ missionId: mission.missionId, tools: surveillanceTools.map((tool) => tool.id) }).slice(0, 10)}`,
          title: "Governed surveillance research toolchain available",
          severity: severityForRisk(riskScore),
          description:
            "DISHA can unify results from geospatial OSINT, privacy SDK analysis, network tracker observation and consent-based mobile forensics while preserving tool isolation and provenance.",
          evidenceIds: evidence.map((item) => item.id),
        },
      ],
      confidence: 0.86,
      riskScore,
      evidence,
      recommendedActions: [],
      policyRequired: true,
    };

    return {
      extensionId: "surveillance-intelligence-suite",
      title: "Surveillance Intelligence Suite",
      summary: lensResult.summary,
      defensivePosture: "defensive_only",
      lensResult,
      proposedActions: [],
      limitations: [
        "No external tool is executed until its adapter, runtime isolation and license review are complete.",
        "Raw leaked personal data and stolen credentials are outside this integration boundary.",
      ],
    };
  },
};
