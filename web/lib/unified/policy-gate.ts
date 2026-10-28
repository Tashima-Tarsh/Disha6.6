import type { DishaLensResult, DishaSignal, PolicyDecision } from "./contracts";

export type ConstitutionalOffice =
  | "Diksha_Sharma_Chairman"
  | "Nitish_Kumar_Joint_Manager"
  | null;

export type ConstitutionalDecision =
  | { decision: "ALLOW"; reason: string; office: ConstitutionalOffice }
  | { decision: "DENY"; reason: string; office: ConstitutionalOffice };

const CHAIRMAN_OFFICE = "Diksha_Sharma_Chairman";
const JOINT_MANAGER_OFFICE = "Nitish_Kumar_Joint_Manager";

const GOD_MODE_ACTIONS = new Set([
  "god_mode",
  "write_main",
  "amend_constitution",
  "veto",
]);

const CO_MANAGE_ACTIONS = new Set([
  "co_manage",
  "propose_high_risk",
]);

export function resolveConstitutionalOffice(actorId: string): ConstitutionalOffice {
  const id = String(actorId ?? "").toLowerCase().trim();
  if (id.includes("diksha") || id === CHAIRMAN_OFFICE) return CHAIRMAN_OFFICE;
  if (id.includes("nitish") || id === JOINT_MANAGER_OFFICE) return JOINT_MANAGER_OFFICE;
  return null;
}

export function verifyConstitutionalSignature(
  _office: ConstitutionalOffice,
  _signature: unknown,
  _context: Record<string, unknown>,
): boolean {
  // Stub: production path verifies the Ed25519 signature registered in
  // CONSTITUTION.KEYS against the action payload. Returns false until keys are
  // registered and the verifier is wired to the keystore.
  return false;
}

export function constitutionalAccessDecision(
  actorId: string,
  action: string,
  context: Record<string, unknown> = {},
): ConstitutionalDecision {
  const office = resolveConstitutionalOffice(actorId);

  if (GOD_MODE_ACTIONS.has(action.toLowerCase())) {
    if (office !== CHAIRMAN_OFFICE) {
      return { decision: "DENY", reason: "God Mode reserved for Chairman and Founder (Diksha Sharma)", office };
    }
    if (!verifyConstitutionalSignature(office, context.signature, context)) {
      return { decision: "DENY", reason: "Invalid or missing constitutional signature for God Mode", office };
    }
    return { decision: "ALLOW", reason: "God Mode — Chairman and Founder", office };
  }

  if (CO_MANAGE_ACTIONS.has(action.toLowerCase())) {
    if (office === CHAIRMAN_OFFICE) {
      return { decision: "ALLOW", reason: "Chairman co-management", office };
    }
    if (office === JOINT_MANAGER_OFFICE) {
      if (!verifyConstitutionalSignature(office, context.signature, context)) {
        return { decision: "DENY", reason: "Invalid or missing constitutional signature for Joint Manager", office };
      }
      if (context.chairman_notified !== true) {
        return { decision: "DENY", reason: "Chairman must be notified of Joint Manager co-management actions", office };
      }
      return { decision: "ALLOW", reason: "Joint Manager — Nitish Kumar", office };
    }
    return { decision: "DENY", reason: "No co-management authority", office };
  }

  return { decision: "ALLOW", reason: "Read-only observation permitted", office };
}

const offensiveActions = [
  "hack back",
  "exploit",
  "ddos",
  "brute force",
  "credential theft",
  "malware",
  "unauthorized scan",
  "attack third party",
  "bypass authentication",
];

const controlledRoles = new Set(["admin", "operator"]);

export function evaluatePolicy(signal: DishaSignal, lensResults: DishaLensResult[] = []): PolicyDecision {
  const reasons: string[] = [];
  const requestedAction = signal.input.requestedAction?.toLowerCase() ?? "";
  const rawText = signal.input.rawText.toLowerCase();
  const lensRisk = Math.max(0, ...lensResults.map((result) => result.riskScore));
  const averageConfidence = lensResults.length
    ? lensResults.reduce((sum, result) => sum + result.confidence, 0) / lensResults.length
    : 1;
  const highFindingCount = lensResults.flatMap((result) => result.findings).filter((finding) =>
    finding.severity === "high" || finding.severity === "critical"
  ).length;
  const missingEvidence = lensResults.some((result) => result.evidence.length === 0);
  const verifyRequired = lensResults.some((result) =>
    result.summary.includes("[VERIFY REQUIRED]") ||
    result.findings.some((finding) => finding.description.includes("[VERIFY REQUIRED]")) ||
    result.evidence.some((item) => item.summary.includes("[VERIFY REQUIRED]")),
  );
  const riskScore = clamp(
    signal.riskContext.actionRisk * 0.35 +
      signal.riskContext.dataSensitivityRisk * 0.25 +
      (1 - signal.riskContext.deviceTrust) * 0.2 +
      (signal.riskContext.telemetryRisk ?? 0) * 0.1 +
      lensRisk * 0.1 +
      Math.min(highFindingCount * 0.04, 0.12),
  );

  if (offensiveActions.some((term) => requestedAction.includes(term) || rawText.includes(term))) {
    return decision("DENY", riskScore, [
      "Requested action is offensive, retaliatory, destructive, or unauthorized.",
      "DISHA No-First-Use permits defensive and evidence-preserving actions only.",
    ]);
  }

  if (signal.context.sensitivity === "classified") {
    if (!controlledRoles.has(signal.riskContext.userRole) || !signal.missionId) {
      return decision("DENY", riskScore, [
        "Classified data requires an authorized role and mission binding.",
        "Controlled/classified connectors are deny-by-default.",
      ]);
    }
    return decision("ESCALATE", Math.max(riskScore, 0.85), [
      "Classified data access requires explicit mission approval and evidence logging.",
    ], ["mission-owner", "security-officer"]);
  }

  if (signal.context.sensitivity === "controlled" && signal.riskContext.userRole === "analyst") {
    return decision("READ_ONLY", Math.max(riskScore, 0.65), [
      "Controlled data requested by analyst role.",
      "Read-only fallback prevents unsafe data movement.",
    ]);
  }

  if (signal.context.sensitivity === "controlled" && !controlledRoles.has(signal.riskContext.userRole)) {
    return decision("READ_ONLY", Math.max(riskScore, 0.65), [
      "Controlled data is restricted to admin/operator roles.",
      "Read-only fallback prevents unsafe data movement.",
    ]);
  }

  if (signal.riskContext.deviceTrust < 0.35) {
    return decision("SANDBOX_ONLY", Math.max(riskScore, 0.7), [
      "Device trust is below execution threshold.",
      "Analysis may continue in sandbox/read-only mode.",
    ]);
  }

  if ((lensRisk >= 0.7 || riskScore >= 0.65) && averageConfidence < 0.55) {
    return decision("ESCALATE", Math.max(riskScore, lensRisk), [
      "Lens risk is high while confidence is low.",
      "Human review is required before relying on uncertain high-risk analysis.",
    ], ["human-controller"]);
  }

  if (missingEvidence || verifyRequired) {
    const reasons = [
      missingEvidence ? "At least one lens returned no evidence item." : "One or more factual claims require verification.",
      "Safe fallback requires source verification before action or publication.",
    ];
    if (riskScore >= 0.55 || lensRisk >= 0.55) return decision("ESCALATE", Math.max(riskScore, lensRisk), reasons, ["source-reviewer"]);
    return decision("ASK_CONFIRMATION", Math.max(riskScore, 0.45), reasons, ["source-reviewer"]);
  }

  if (riskScore >= 0.8 || highFindingCount >= 2) {
    return decision("ESCALATE", riskScore, ["Combined mission risk is high."], ["human-controller"]);
  }

  if (riskScore >= 0.55 || lensResults.some((result) => result.policyRequired)) {
    return decision("ASK_CONFIRMATION", riskScore, [
      "Mission contains elevated risk or a lens requested policy confirmation.",
    ], ["operator"]);
  }

  return decision("ALLOW", riskScore, ["Request is within defensive policy and current authorization."]);
}

function decision(
  decisionValue: PolicyDecision["decision"],
  riskScore: number,
  reasons: string[],
  requiredApprovals?: string[],
): PolicyDecision {
  return {
    decision: decisionValue,
    reasons,
    riskScore: clamp(riskScore),
    requiredApprovals,
    safeFallback: safeFallbackFor(decisionValue),
  };
}

function safeFallbackFor(decisionValue: PolicyDecision["decision"]): string {
  if (decisionValue === "ALLOW") return "Proceed with evidence-logged response.";
  if (decisionValue === "ASK_CONFIRMATION") return "Prepare report and wait for human confirmation.";
  if (decisionValue === "SANDBOX_ONLY") return "Run analysis without external actions or controlled data export.";
  if (decisionValue === "READ_ONLY") return "Return redacted/read-only results.";
  if (decisionValue === "ESCALATE") return "Escalate to approved human authority.";
  return "Deny action and preserve evidence.";
}

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
