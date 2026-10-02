export type Sensitivity = "public" | "internal" | "controlled" | "classified";
export type RiskLevel = "Low" | "Moderate" | "High" | "Escalate";
export type LensId = "governance" | "strategy" | "cyber" | "geospatial" | "yudh_view" | "quantum";
export type StageStatus = "waiting" | "active" | "complete";

export type WorkbenchSignal = {
  id: string;
  missionId: string;
  timestamp: string;
  rawText: string;
  domain: string;
  tags: string[];
  entities: string[];
  sensitivity: Sensitivity;
  sensitivityScore: number;
  riskLevel: RiskLevel;
  riskScore: number;
  intent: string;
};

export type LensRecommendation = {
  id: LensId;
  label: string;
  reason: string;
  confidence: number;
  selectedByDefault: boolean;
};

export type LensFinding = {
  id: string;
  title: string;
  description: string;
  evidence: string[];
  confidence: number;
  uncertainty: string;
  actions: string[];
};

export type LensExecution = LensRecommendation & {
  status: StageStatus;
  findings: LensFinding[];
};

export type FusionResult = {
  agreements: string[];
  conflicts: string[];
  synthesis: string[];
};

export type PolicyResult = {
  decision: "READ_ONLY" | "ASK_CONFIRMATION" | "ESCALATE";
  reasons: string[];
  requiredHumanStep: string;
};

export type GovernedExtensionPreview = {
  id: string;
  title: string;
  status: "not_applicable" | "policy_gated";
  summary: string;
  proposedActions: Array<{
    label: string;
    policyActionId: string;
    requiresApproval: boolean;
  }>;
};

export type EvidenceNode = {
  id: string;
  label: string;
  action: string;
  actor: string;
  previousHash: string;
  hash: string;
};

const LENS_LABELS: Record<LensId, string> = {
  governance: "Governance Lens",
  strategy: "Strategy Lens",
  cyber: "Cyber Lens",
  geospatial: "Geospatial Lens",
  yudh_view: "Yudh View",
  quantum: "Simulation Lens",
};

const ENTITY_PATTERNS: Array<[RegExp, string]> = [
  [/article\s*12/i, "Article 12"],
  [/\bcag\b|comptroller/i, "CAG audit"],
  [/ministry|department/i, "Ministry / department"],
  [/district|village|panchayat|state|union territory/i, "Administrative geography"],
  [/cyber|malware|worm|digital arrest|loan app|telegram/i, "Cyber incident pattern"],
  [/flood|ndma|disaster|river|infrastructure/i, "Disaster / infrastructure risk"],
  [/budget|tax|finance|procurement|expenditure/i, "Public finance"],
  [/police|fir|bns|ipc|law/i, "Law enforcement / statute"],
];

export const EXAMPLE_MISSIONS = [
  {
    title: "Public Finance Audit",
    text: "Review a state public works procurement pattern where CAG observations, budget allocations, district-level spending, and citizen complaints appear inconsistent. Keep the output read-only and evidence-first.",
  },
  {
    title: "Cyber Harm Pattern",
    text: "Assess reported digital arrest and loan-app harm patterns across districts, identify public-source evidence needs, route cyber and governance lenses, and prevent any operational or retaliatory action.",
  },
  {
    title: "Flood Preparedness",
    text: "Map flood preparedness claims for a river belt using NDMA advisories, district administration notices, infrastructure status, and citizen-facing risk communication gaps.",
  },
];

export function normalizeMission(rawText: string, domain: string, tags: string[], now = new Date()): WorkbenchSignal {
  const text = rawText.trim();
  const lowered = text.toLowerCase();
  const entities = ENTITY_PATTERNS.filter(([pattern]) => pattern.test(text)).map(([, entity]) => entity);
  const sensitivityScore =
    scoreMatches(lowered, ["classified", "secret", "surveillance", "personal data"], 0.26) +
    scoreMatches(lowered, ["police", "fir", "citizen complaint", "controlled"], 0.15) +
    scoreMatches(lowered, ["public", "cag", "budget", "gazette", "notice"], 0.04);
  const riskScore =
    0.16 +
    scoreMatches(lowered, ["cyber", "malware", "terror", "attack", "digital arrest"], 0.14) +
    scoreMatches(lowered, ["flood", "disaster", "infrastructure", "district"], 0.09) +
    scoreMatches(lowered, ["procurement", "tax", "finance", "audit"], 0.07) +
    Math.min(tags.length * 0.03, 0.12);

  return {
    id: `signal-${stableHash(text + domain).slice(0, 8)}`,
    missionId: `mission-${stableHash(domain + text).slice(0, 10)}`,
    timestamp: now.toISOString(),
    rawText: text,
    domain,
    tags,
    entities: entities.length ? entities : ["Public-interest mission"],
    sensitivity: sensitivityFromScore(sensitivityScore),
    sensitivityScore: clamp(sensitivityScore),
    riskLevel: riskFromScore(riskScore),
    riskScore: clamp(riskScore),
    intent: inferIntent(lowered),
  };
}

export function recommendLenses(signal: WorkbenchSignal): LensRecommendation[] {
  const text = signal.rawText.toLowerCase();
  const base: LensRecommendation[] = [
    recommendation("governance", "Constitutional accountability and public-authority boundaries are central to the mission.", 0.91, true),
    recommendation("strategy", "The mission needs sequencing, safe scope control, and an evidence-first review plan.", 0.86, true),
  ];

  if (/cyber|malware|worm|digital arrest|telegram|loan app|breach|threat/.test(text)) {
    base.push(recommendation("cyber", "Cyber harm indicators appear in the mission text and need defensive, non-offensive analysis.", 0.84, true));
  }
  if (/map|district|village|panchayat|state|flood|river|infrastructure|ndma/.test(text)) {
    base.push(recommendation("geospatial", "The mission depends on place, administrative boundaries, or infrastructure exposure.", 0.82, true));
  }
  if (/risk|scenario|preparedness|terrain|logistics|conflict|yudh/.test(text)) {
    base.push(recommendation("yudh_view", "Scenario reasoning is useful for timing, preparedness, and non-executive strategic interpretation.", 0.74, true));
  }
  if (/simulation|model|uncertainty|optimization|optimisation|forecast/.test(text)) {
    base.push(recommendation("quantum", "The mission asks for simulation or uncertainty framing, suitable for a bounded modelling lens.", 0.68, true));
  }

  return dedupeLensRecommendations(base);
}

export function executeLens(signal: WorkbenchSignal, lens: LensRecommendation): LensExecution {
  const evidenceBase = [
    `Mission text normalized as ${signal.id}`,
    `Sensitivity ${Math.round(signal.sensitivityScore * 100)} / risk ${Math.round(signal.riskScore * 100)}`,
  ];

  const findingMap: Record<LensId, LensFinding[]> = {
    governance: [
      finding(
        lens.id,
        "Authority boundary must stay visible",
        "The mission involves public authority or public-interest accountability. Outputs should separate source-bound public records, analyst interpretation, and source-gap claims.",
        [...evidenceBase, "Governance routing selected by constitutional accountability terms"],
        0.88,
        "Exact statutory and departmental references require source ingestion.",
        ["Keep mission read-only until source records are attached.", "Require provenance for every public claim."],
      ),
    ],
    strategy: [
      finding(
        lens.id,
        "Mission can be decomposed into reviewable steps",
        "The safest route is to normalize the request, collect source references, run lenses, fuse conflicts, and write a ledger event before any report is exported.",
        [...evidenceBase, "Strategy lens is always selected for mission planning"],
        0.86,
        "Operational priority depends on the quality of incoming sources.",
        ["Use staged review gates.", "Avoid action recommendations beyond lawful review steps."],
      ),
    ],
    cyber: [
      finding(
        lens.id,
        "Cyber analysis must remain defensive",
        "The mission contains cyber-harm terms. The workbench should classify patterns, source evidence, and describe protective steps without enabling intrusion or retaliation.",
        [...evidenceBase, "Cyber phrase match in mission text"],
        0.81,
        "Incident prevalence cannot be asserted without official or documented source records.",
        ["Collect source URLs and timestamps.", "Escalate unsafe operational requests to policy review."],
      ),
    ],
    geospatial: [
      finding(
        lens.id,
        "Place-based evidence is required",
        "District, state, village, river, or infrastructure terms indicate that map-linked source records should be attached before claiming geographic coverage.",
        [...evidenceBase, "Geospatial phrase match in mission text"],
        0.8,
        "Boundary and administrative data must be source-versioned.",
        ["Attach official boundary/source references.", "Mark unmapped claims as source gaps."],
      ),
    ],
    yudh_view: [
      finding(
        lens.id,
        "Scenario reasoning should be bounded",
        "Yudh View can compare preparedness, timing, dependencies, and escalation paths, but it should not turn into operational instructions.",
        [...evidenceBase, "Scenario-risk language detected"],
        0.73,
        "Scenario strength depends on verified time-series evidence.",
        ["Use non-executable preparedness language.", "Separate conflicts from consensus in fusion."],
      ),
    ],
    quantum: [
      finding(
        lens.id,
        "Simulation is advisory only",
        "Simulation can expose uncertainty and sensitivity, but must not be presented as fact without calibration data and source provenance.",
        [...evidenceBase, "Simulation or uncertainty language detected"],
        0.67,
        "No calibrated model data is attached in demo mode.",
        ["Label modelled values as estimates.", "Prefer confidence bands over point claims."],
      ),
    ],
  };

  return { ...lens, status: "complete", findings: findingMap[lens.id] };
}

export function fuseLensResults(results: LensExecution[]): FusionResult {
  const labels = results.map((result) => result.label);
  return {
    agreements: [
      "Every selected lens requires source-backed provenance before publishing factual claims.",
      "The mission should remain read-only until the policy gate confirms scope and purpose.",
      `${labels.join(", ")} converge on evidence-first review rather than direct action.`,
    ],
    conflicts: results.some((result) => result.id === "quantum")
      ? ["Simulation output may be useful for uncertainty, but cannot replace documentary evidence."]
      : ["No material conflict detected in demo fusion; live mode should record disputed source claims separately."],
    synthesis: [
      "Proceed with a bounded constitutional intelligence review.",
      "Create ledger events for normalization, routing, lens output, fusion, policy decision, and export.",
      "Mark unsupported legal, financial, incident, or government assertions as source gaps.",
    ],
  };
}

export function evaluatePolicy(signal: WorkbenchSignal, results: LensExecution[]): PolicyResult {
  const hasCyber = results.some((result) => result.id === "cyber");
  const hasControlled = signal.sensitivity !== "public";

  if (hasControlled || signal.riskScore > 0.68) {
    return {
      decision: "ESCALATE",
      reasons: ["Mission risk or sensitivity requires human approval before export.", "Only read-only analytical output is allowed in demo mode."],
      requiredHumanStep: "Senior reviewer approval with source list attached.",
    };
  }

  if (hasCyber) {
    return {
      decision: "ASK_CONFIRMATION",
      reasons: ["Cyber content must stay defensive.", "The policy gate blocks operational or retaliatory instructions."],
      requiredHumanStep: "Confirm defensive scope before final report.",
    };
  }

  return {
    decision: "READ_ONLY",
    reasons: ["Mission is suitable for source-backed read-only analysis.", "No action path is enabled without separate authorization."],
    requiredHumanStep: "Analyst confirmation before saving to ledger.",
  };
}

export function previewGovernedExtensions(signal: WorkbenchSignal, results: LensExecution[]): GovernedExtensionPreview[] {
  const text = signal.rawText.toLowerCase();
  const cyberSelected = results.some((result) => result.id === "cyber");

  if (!cyberSelected && !/vyuha|honeypot|contain|quarantine|telemetry|defen[cs]e/.test(text)) {
    return [{
      id: "vyuha-defense-engine",
      title: "Vyuha Defense Engine",
      status: "not_applicable",
      summary: "No defensive extension is needed for this mission scope.",
      proposedActions: [],
    }];
  }

  const proposedActions = [
    { label: "Preserve incident logs", policyActionId: "evidence.preserve", requiresApproval: false },
    { label: "Notify approved administrator", policyActionId: "alert.emit", requiresApproval: false },
  ];

  if (/honeypot|canary|decoy/.test(text)) {
    proposedActions.push({ label: "Prepare owned honeypot deployment", policyActionId: "honeypot.deploy_owned", requiresApproval: true });
  }
  if (/quarantine|malware|ransomware/.test(text)) {
    proposedActions.push({ label: "Quarantine local suspicious file", policyActionId: "file.quarantine", requiresApproval: true });
  }
  if (/contain|isolate|active intrusion/.test(text)) {
    proposedActions.push({ label: "Prepare local isolation profile", policyActionId: "device.isolate", requiresApproval: true });
  }

  return [{
    id: "vyuha-defense-engine",
    title: "Vyuha Defense Engine",
    status: "policy_gated",
    summary: "Defensive proposals are available, but the extension cannot execute them. disha6.6 policy and evidence gates remain mandatory.",
    proposedActions,
  }];
}

export function buildEvidenceChain(
  signal: WorkbenchSignal,
  results: LensExecution[],
  policy: PolicyResult,
  extensions: GovernedExtensionPreview[] = [],
): EvidenceNode[] {
  const actions = [
    ["Mission captured", "Mission Input"],
    ["Signal normalized", "DishaSignal"],
    ["Lenses routed", results.map((result) => result.label).join(", ")],
    ["Lens findings fused", "Fusion Stage"],
    [`Policy gate: ${policy.decision}`, "Policy Gate"],
    ...(extensions.some((extension) => extension.status === "policy_gated")
      ? ([["Governed extension evaluated", "Vyuha Defense Engine"]] as const)
      : []),
    ["Report prepared", "Final Report"],
  ] as const;

  let previousHash = "GENESIS";
  return actions.map(([action, label], index) => {
    const hash = stableHash(`${signal.missionId}|${index}|${action}|${label}|${previousHash}`);
    const node = {
      id: `EV-${String(index + 1).padStart(3, "0")}`,
      label,
      action,
      actor: index < 2 ? "analyst" : "disha-workbench",
      previousHash,
      hash,
    };
    previousHash = hash;
    return node;
  });
}

export function stableHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < input.length; index += 1) {
    const char = input.charCodeAt(index);
    h1 = Math.imul(h1 ^ char, 2654435761);
    h2 = Math.imul(h2 ^ char, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, "0")}${(h1 >>> 0).toString(16).padStart(8, "0")}`;
}

function scoreMatches(text: string, needles: string[], weight: number): number {
  return needles.reduce((score, needle) => (text.includes(needle) ? score + weight : score), 0);
}

function sensitivityFromScore(score: number): Sensitivity {
  if (score >= 0.68) return "classified";
  if (score >= 0.44) return "controlled";
  if (score >= 0.22) return "internal";
  return "public";
}

function riskFromScore(score: number): RiskLevel {
  if (score >= 0.76) return "Escalate";
  if (score >= 0.52) return "High";
  if (score >= 0.3) return "Moderate";
  return "Low";
}

function inferIntent(text: string): string {
  if (/audit|cag|finance|tax|budget|procurement/.test(text)) return "public-finance evidence review";
  if (/cyber|digital arrest|loan app|malware|telegram/.test(text)) return "defensive cyber harm assessment";
  if (/flood|ndma|disaster|river|infrastructure/.test(text)) return "preparedness and geospatial review";
  return "constitutional accountability analysis";
}

function recommendation(
  id: LensId,
  reason: string,
  confidence: number,
  selectedByDefault: boolean,
): LensRecommendation {
  return {
    id,
    label: LENS_LABELS[id],
    reason,
    confidence,
    selectedByDefault,
  };
}

function finding(
  lens: LensId,
  title: string,
  description: string,
  evidence: string[],
  confidence: number,
  uncertainty: string,
  actions: string[],
): LensFinding {
  return {
    id: `${lens}-${stableHash(title).slice(0, 6)}`,
    title,
    description,
    evidence,
    confidence,
    uncertainty,
    actions,
  };
}

function dedupeLensRecommendations(recommendations: LensRecommendation[]): LensRecommendation[] {
  const seen = new Set<LensId>();
  return recommendations.filter((recommendationItem) => {
    if (seen.has(recommendationItem.id)) return false;
    seen.add(recommendationItem.id);
    return true;
  });
}

function clamp(value: number): number {
  return Math.max(0, Math.min(0.99, Number(value.toFixed(2))));
}
