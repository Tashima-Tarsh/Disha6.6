"use client";

import {
  AlertTriangle,
  ArrowRight,
  Archive,
  CheckCircle2,
  Clipboard,
  Database,
  FileText,
  GitBranch,
  Globe2,
  Landmark,
  Loader2,
  LockKeyhole,
  Network,
  Play,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useEffect } from "react";

import styles from "./workbench.module.css";

type Sensitivity = "public" | "internal" | "controlled" | "classified";

type PolicyDecision = {
  decision: string;
  reasons: string[];
  riskScore: number;
  safeFallback: string;
  requiredApprovals?: string[];
  evidenceEventId?: string;
};

type EvidenceItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  evidenceClass: string;
  summary: string;
  provenanceHash: string;
  retrievedAt: string;
  url?: string;
};

type LensResult = {
  lens: string;
  summary: string;
  findings: Array<{
    id: string;
    title: string;
    severity: "info" | "low" | "medium" | "high" | "critical";
    description: string;
    evidenceIds: string[];
  }>;
  confidence: number;
  riskScore: number;
  evidence: EvidenceItem[];
  recommendedActions: Array<{ id: string; label: string; action: string; risk: number; requiresApproval: boolean }>;
  policyRequired: boolean;
};

type MissionResult = {
  missionId: string;
  signal: {
    id: string;
    timestamp: string;
    input: { rawText: string; requestedAction?: string; indicators: Array<{ type: string; value: string; source?: string }> };
    context: { intent: string; sensitivity: Sensitivity; entities: Array<{ type: string; value: string }>; dataSources: Array<{ sourceId: string; name: string }> };
    riskContext: { userRole: string; actionRisk: number; dataSensitivityRisk: number; telemetryRisk?: number };
  };
  selectedLenses: string[];
  lensResults: LensResult[];
  fusedIntelligence: {
    executiveSummary: string;
    topFindings: string[];
    riskDrivers: string[];
    confidence: number;
    uncertainty: string[];
    requiredApprovals: string[];
    recommendedSafeActions: string[];
    verifyRequiredItems: string[];
  };
  fusedSummary: string;
  riskScore: number;
  policyDecision: PolicyDecision;
  approvalRequired: boolean;
  safeExecution: string;
  evidenceEventIds: string[];
};

type GovernedExtensionResult = {
  extensionId: string;
  title: string;
  summary: string;
  status: string;
  defensivePosture: string;
  lensResult: LensResult;
  policyDecision: PolicyDecision;
  actionPolicyDecisions: Array<{ actionId: string; policyActionId: string; decision: PolicyDecision }>;
  evidenceEventIds: string[];
  proposedActions: Array<{
    id: string;
    label: string;
    policyActionId: string;
    description: string;
    risk: number;
    requiresApproval: boolean;
    scope: string;
  }>;
  claims?: Array<{
    claimId: string;
    text: string;
    confidence: number;
    sourceHashes: string[];
    sourceRefs: string[];
    verifyRequired: boolean;
  }>;
  limitations: string[];
};

type AgenticMissionResult = {
  mission: MissionResult;
  governedExtensions: {
    results: GovernedExtensionResult[];
    failures: Array<{ extensionId: string; stage: string; reason: string; evidenceEventIds: string[] }>;
    skipped: Array<{ extensionId: string; reason: string }>;
    lifecycle: Array<{ extensionId: string; phase: string; evidenceEventId: string }>;
    evidenceEventIds: string[];
  };
  modelIntelligence: {
    status: string;
    provider: string;
    model: string;
    summary: string;
    confidence: number;
    verifyRequired: string[];
    recommendedNextSteps: string[];
  };
  learning: { memoryId: string; sourceEventIds: string[]; evidenceHashes: string[]; redacted: boolean } | null;
  evidenceEventIds: string[];
};

type EvidenceEvent = {
  eventId: string;
  missionId: string;
  chainIndex: number;
  timestamp: string;
  actor: string;
  action: string;
  inputHash: string;
  outputHash?: string;
  policyDecision?: PolicyDecision;
  lensResults?: string[];
  parentEventId?: string;
  previousHash?: string;
  eventHash: string;
};

type PrincipalView = {
  email: string;
  roles: string[];
};

type CommandFeedSummary = {
  generatedAt: string;
  commandReadiness: {
    score: number;
    sourceRegistry: number;
    connectorManifest: number;
  };
  globalFlow: {
    nodes: Array<{ id: string; label: string; kind: string }>;
    flows: Array<{ id: string; label: string; status: string; cadence: string }>;
  };
  claimChains: Array<{ claimId: string; title: string; domain: string; status: string }>;
};

const DEFAULT_MISSION =
  "Assess a public-interest governance concern involving district infrastructure claims, CAG audit references, citizen complaints, and cyber-enabled fraud patterns. Produce a read-only evidence plan with policy gates and source-gap markers.";

const EXAMPLES = [
  {
    title: "CAG + District Accountability",
    text: "Review CAG audit references, district road procurement claims, citizen complaints, and Article 12 accountability. Produce a source-first evidence brief without asserting unverified facts.",
  },
  {
    title: "Cyber Harm + Citizen Protection",
    text: "Assess digital arrest and loan-app fraud complaints as public-interest cyber harm. Identify lawful defensive evidence steps, policy gates, and missing official sources.",
  },
  {
    title: "Disaster Preparedness Review",
    text: "Review flood preparedness claims, NDMA references, district response capacity, river basin context, and public finance evidence gaps for a read-only governance report.",
  },
];

const SENSITIVITIES: Sensitivity[] = ["public", "internal", "controlled", "classified"];

export function DishaWorkbench({ principal }: { principal: PrincipalView }) {
  const [missionText, setMissionText] = useState(DEFAULT_MISSION);
  const [sensitivity, setSensitivity] = useState<Sensitivity>("public");
  const [indicatorType, setIndicatorType] = useState("domain");
  const [indicatorValue, setIndicatorValue] = useState("");
  const [requestedAction, setRequestedAction] = useState("read-only governed workbench analysis");
  const [result, setResult] = useState<AgenticMissionResult | null>(null);
  const [evidence, setEvidence] = useState<EvidenceEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "complete" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [commandFeed, setCommandFeed] = useState<CommandFeedSummary | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);

  const mission = result?.mission ?? null;
  const selectedEvent = evidence.find((event) => event.eventId === selectedEventId) ?? evidence[0] ?? null;
  const memoryGraph = result?.governedExtensions.results.find((extension) => extension.extensionId === "memory-graph") ?? null;
  const coreEvidenceCount = useMemo(() => mission?.lensResults.reduce((sum, lens) => sum + lens.evidence.length, 0) ?? 0, [mission]);
  const extensionClaimCount = useMemo(
    () => result?.governedExtensions.results.reduce((sum, extension) => sum + (extension.claims?.length ?? 0), 0) ?? 0,
    [result],
  );

  const spineStages = [
    {
      label: "Mission",
      caption: mission ? "Intent captured" : "Awaiting input",
      detail: mission?.signal.context.intent ?? "Start with a public-interest question.",
      complete: Boolean(mission),
    },
    {
      label: "Signal",
      caption: mission ? "Normalized" : "Not created",
      detail: mission?.signal.id ?? "The mission becomes a typed signal.",
      complete: Boolean(mission?.signal),
    },
    {
      label: "Lenses",
      caption: mission ? `${mission.selectedLenses.length} routed` : "Not routed",
      detail: mission?.selectedLenses.join(", ") ?? "Evidence-aware lenses are selected.",
      complete: Boolean(mission?.lensResults.length),
    },
    {
      label: "Fusion",
      caption: mission ? "Synthesized" : "Not fused",
      detail: mission ? `${Math.round(mission.fusedIntelligence.confidence * 100)}% confidence` : "Conflicts and uncertainty stay visible.",
      complete: Boolean(mission?.fusedSummary),
    },
    {
      label: "Policy",
      caption: mission?.policyDecision.decision ?? "Not evaluated",
      detail: mission?.safeExecution ?? "The gate decides what may happen next.",
      complete: Boolean(mission?.policyDecision),
    },
    {
      label: "Ledger",
      caption: evidence.length ? `${evidence.length} events` : "No events",
      detail: evidence.length ? "Chain loaded and inspectable." : "Every stage will leave a trace.",
      complete: evidence.length > 0,
    },
    {
      label: "Report",
      caption: result ? "Evidence-bound" : "Pending",
      detail: result ? "Export is tied to the governed run." : "No conclusion before the chain.",
      complete: Boolean(result),
    },
  ];
  const firstPendingSpineStage = spineStages.findIndex((stage) => !stage.complete);
  const activeSpineStage = firstPendingSpineStage === -1 ? spineStages.length - 1 : firstPendingSpineStage;

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/dashboard/command", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(readApiError(payload, response.status));
        setCommandFeed(payload as CommandFeedSummary);
        setCommandError(null);
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setCommandError(caught instanceof Error ? caught.message : "Command feed unavailable.");
        }
      });
    return () => controller.abort();
  }, []);

  async function runWorkbenchMission() {
    setStatus("running");
    setError(null);
    setResult(null);
    setEvidence([]);
    setSelectedEventId(null);

    try {
      const indicators = indicatorValue.trim()
        ? [{ type: indicatorType, value: indicatorValue.trim(), source: "workbench-input" }]
        : [];
      const response = await fetch("/api/v1/agentic/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          rawText: missionText,
          requestedAction,
          sensitivity,
          indicators,
          operatorInstruction: "Workbench run: return governed, evidence-first analysis only. Do not execute external actions.",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(readApiError(payload, response.status));

      const agenticResult = payload as AgenticMissionResult;
      setResult(agenticResult);

      const evidenceResponse = await fetch(`/api/v1/evidence/${encodeURIComponent(agenticResult.mission.missionId)}`, {
        credentials: "same-origin",
      });
      const evidencePayload = await evidenceResponse.json();
      if (!evidenceResponse.ok) throw new Error(readApiError(evidencePayload, evidenceResponse.status));
      const ledgerEvents = evidencePayload.events as EvidenceEvent[];
      const events = ledgerEvents.length
        ? ledgerEvents
        : buildEvidenceReferenceChain(agenticResult.mission.missionId, agenticResult.evidenceEventIds);
      setEvidence(events);
      setSelectedEventId(events[0]?.eventId ?? null);
      setStatus("complete");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Workbench mission failed.");
      setStatus("error");
    }
  }

  async function copyReport() {
    const report = buildReport(result, evidence);
    try {
      await navigator.clipboard.writeText(report);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = report;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify({ result, evidence, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${mission?.missionId ?? "disha-workbench"}-evidence.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={styles.shell}>
      <section className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>disha6.6 Workbench</p>
          <h1>Constitutional Evidence Workbench</h1>
          <p>
            Run a governed mission, inspect the real policy decision, review live source flow context, and walk the ledger event by event.
          </p>
        </div>
        <div className={styles.statusPanel}>
          <span>Runtime status</span>
          <strong>{statusLabel(status)}</strong>
          <small>{mission ? `Mission ${mission.missionId}` : `${principal.email} / ${principal.roles.join(", ")}`}</small>
        </div>
      </section>

      <section className={styles.grid}>
        <aside className={styles.sidebar} aria-label="Workbench navigation">
          <NavItem label="Mission Input" target="mission-input" active />
          <NavItem label="Analysis Results" target="analysis-results" active={Boolean(mission)} />
          <NavItem label="Policy Decision" target="policy-decision" active={Boolean(mission?.policyDecision)} />
          <NavItem label="Evidence Chain" target="evidence-chain" active={evidence.length > 0} />
          <NavItem label="Memory / Graph" target="memory-graph" active={Boolean(memoryGraph)} />
        </aside>

        <div className={styles.workspace}>
          <section className={styles.liveStrip}>
            <div>
              <Globe2 size={18} />
              <span>Global source flow</span>
              <strong>{commandFeed ? `${commandFeed.globalFlow.flows.length} moving flows` : commandError ? "Feed needs attention" : "Loading"}</strong>
            </div>
            <div>
              <Database size={18} />
              <span>Source registry</span>
              <strong>{commandFeed ? commandFeed.commandReadiness.sourceRegistry : "-"}</strong>
            </div>
            <div>
              <GitBranch size={18} />
              <span>Connectors</span>
              <strong>{commandFeed ? commandFeed.commandReadiness.connectorManifest : "-"}</strong>
            </div>
            <div>
              <ShieldCheck size={18} />
              <span>Claim chains</span>
              <strong>{commandFeed ? commandFeed.claimChains.length : "-"}</strong>
            </div>
          </section>

          <section className={styles.spinePanel} aria-labelledby="constitutional-spine-title">
            <div className={styles.spineHeader}>
              <div>
                <p className={styles.spineKicker}>The disha6.6 signature</p>
                <h2 id="constitutional-spine-title">Constitutional Spine</h2>
                <p>One inspectable view from intent to evidence-bound output. Nothing disappears behind a black box.</p>
              </div>
              <div className={styles.spineReadout}>
                <span>Current boundary</span>
                <strong>{spineStages[activeSpineStage].label}</strong>
                <small>{statusLabel(status)} · {evidence.length} ledger events</small>
              </div>
            </div>

            <div className={styles.spineTrack} role="list" aria-label="disha6.6 constitutional evidence flow">
              {spineStages.map((stage, index) => (
                <div className={styles.spineStageWrap} key={stage.label}>
                  <div
                    className={styles.spineStage}
                    data-complete={stage.complete}
                    data-current={index === activeSpineStage}
                    role="listitem"
                  >
                    <div className={styles.spineNode}>
                      {stage.complete ? <CheckCircle2 size={17} /> : <span>{index + 1}</span>}
                    </div>
                    <div className={styles.spineStageCopy}>
                      <span>{stage.label}</span>
                      <strong>{stage.caption}</strong>
                      <small>{stage.detail}</small>
                    </div>
                  </div>
                  {index < spineStages.length - 1 ? <ArrowRight className={styles.spineArrow} size={18} aria-hidden="true" /> : null}
                </div>
              ))}
            </div>

            <div className={styles.spineFooter}>
              <span>Evidence-first by construction</span>
              <span>Read-only until policy permits</span>
              <span>Every output traceable</span>
            </div>
          </section>

          <section id="mission-input" className={styles.panel}>
            <PanelTitle icon={<Landmark size={18} />} title="Mission Input" label="Dynamic form" />
            <div className={styles.dynamicBanner}>
              <span>Live backend</span>
              <strong>{commandFeed ? `Readiness ${commandFeed.commandReadiness.score}%` : commandError ?? "Connecting to command feed"}</strong>
              <p>{commandFeed ? `Latest feed: ${new Date(commandFeed.generatedAt).toLocaleString()}` : "Workbench will run only after backend session and command context are available."}</p>
            </div>
            <textarea
              className={styles.textarea}
              value={missionText}
              onChange={(event) => setMissionText(event.target.value)}
              placeholder="Describe the public-interest mission, source context, intended output, and boundaries."
            />
            <div className={styles.formGrid}>
              <label>
                Sensitivity
                <select value={sensitivity} onChange={(event) => setSensitivity(event.target.value as Sensitivity)}>
                  {SENSITIVITIES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                Indicator type
                <select value={indicatorType} onChange={(event) => setIndicatorType(event.target.value)}>
                  {["domain", "ip", "url", "hash", "cve", "email", "other"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                Optional indicator
                <input value={indicatorValue} onChange={(event) => setIndicatorValue(event.target.value)} placeholder="example.gov or 203.0.113.42" />
              </label>
            </div>
            <label className={styles.fullLabel}>
              Requested action
              <input value={requestedAction} onChange={(event) => setRequestedAction(event.target.value)} />
            </label>
            <div className={styles.exampleRow}>
              {EXAMPLES.map((example) => (
                <button key={example.title} type="button" onClick={() => setMissionText(example.text)}>
                  {example.title}
                </button>
              ))}
            </div>
            {error ? (
              <div className={styles.errorBox}>
                <AlertTriangle size={18} />
                <span>{error}</span>
                {error.toLowerCase().includes("unauthorized") ? <a href="/login?mode=password&returnUrl=/dashboard">Sign in</a> : null}
              </div>
            ) : null}
            <button className={styles.primaryButton} type="button" onClick={runWorkbenchMission} disabled={status === "running" || missionText.trim().length < 20}>
              {status === "running" ? <Loader2 className={styles.spin} size={17} /> : <Play size={17} />}
              Run governed mission
            </button>
          </section>

          <section className={styles.summaryGrid}>
            <Metric label="Core lenses" value={mission ? String(mission.selectedLenses.length) : "-"} detail={mission?.selectedLenses.join(", ") ?? "Awaiting mission"} />
            <Metric label="Evidence events" value={String(evidence.length || "-")} detail={evidence.length ? "Ledger chain loaded" : "Run mission to load"} />
            <Metric label="Extension claims" value={String(extensionClaimCount || "-")} detail="Governed extension provenance" />
            <Metric label="Risk score" value={mission ? `${Math.round(mission.riskScore * 100)}%` : "-"} detail={mission?.safeExecution ?? "Not evaluated"} />
          </section>

          <section id="analysis-results" className={styles.panel}>
            <PanelTitle icon={<FileText size={18} />} title="Analysis Results" label="Core governed lenses" />
            {mission ? (
              <div className={styles.resultLayout}>
                {mission.lensResults.map((lens) => <LensCard key={lens.lens} lens={lens} />)}
              </div>
            ) : (
              <EmptyState text="Run a mission to fetch real lens results from the disha6.6 API." />
            )}
          </section>

          <section className={styles.twoColumn}>
            <section className={styles.panel}>
              <PanelTitle icon={<GitBranch size={18} />} title="Fusion Summary" label="Governed synthesis" />
              {mission ? (
                <div className={styles.fusionGrid}>
                  <InfoList title="Top findings" items={mission.fusedIntelligence.topFindings} />
                  <InfoList title="Risk drivers" items={mission.fusedIntelligence.riskDrivers} />
                  <InfoList title="Uncertainty" items={mission.fusedIntelligence.uncertainty} />
                  <InfoList title="Safe actions" items={mission.fusedIntelligence.recommendedSafeActions} />
                </div>
              ) : (
                <EmptyState text="Fusion is produced after core lenses complete." />
              )}
            </section>

            <section id="policy-decision" className={styles.panel}>
              <PanelTitle icon={<LockKeyhole size={18} />} title="Policy Decision" label="Policy evaluated" />
              {mission ? <PolicyPanel policy={mission.policyDecision} approvalRequired={mission.approvalRequired} /> : <EmptyState text="Policy output will appear here." />}
            </section>
          </section>

          <section className={styles.panel}>
            <PanelTitle icon={<ShieldCheck size={18} />} title="Governed Extension Results" label="Extended system outputs" />
            {result ? (
              <div className={styles.extensionGrid}>
                {result.governedExtensions.results.map((extension) => <ExtensionCard key={extension.extensionId} extension={extension} />)}
                {result.governedExtensions.failures.map((failure) => (
                  <article className={styles.failureCard} key={`${failure.extensionId}-${failure.stage}`}>
                    <span>Extension failure</span>
                    <strong>{failure.extensionId}</strong>
                    <p>{failure.stage}: {failure.reason}</p>
                  </article>
                ))}
                {!result.governedExtensions.results.length && !result.governedExtensions.failures.length ? <EmptyState text="No governed extensions were applicable to this mission." /> : null}
              </div>
            ) : (
              <EmptyState text="Extension results load from the governed extension runner." />
            )}
          </section>

          <section className={styles.twoColumn}>
            <section id="evidence-chain" className={styles.panel}>
              <PanelTitle icon={<Database size={18} />} title="Evidence Chain Viewer" label="Evidence Ledger v2" />
              {evidence.length ? (
                <div className={styles.ledgerLayout}>
                  <div className={styles.eventList}>
                    {evidence.map((event) => (
                      <button
                        key={event.eventId}
                        className={styles.eventButton}
                        data-selected={event.eventId === selectedEvent?.eventId}
                        type="button"
                        onClick={() => setSelectedEventId(event.eventId)}
                      >
                        <span>{event.chainIndex}</span>
                        <strong>{event.action}</strong>
                        <small>{event.actor}</small>
                      </button>
                    ))}
                  </div>
                  {selectedEvent ? <EvidenceDetail event={selectedEvent} /> : null}
                </div>
              ) : (
                <EmptyState text="Ledger events will load after mission execution." />
              )}
            </section>

            <section id="memory-graph" className={styles.panel}>
              <PanelTitle icon={<Network size={18} />} title="Memory / Graph Insights" label="When available" />
              {memoryGraph ? <MemoryGraphPanel extension={memoryGraph} /> : <EmptyState text="Memory/Graph runs when the mission asks for context, provenance, source hashes, or graph reasoning." />}
            </section>
          </section>

          <section className={styles.panel}>
            <PanelTitle icon={<Archive size={18} />} title="Report Export" label="Evidence-bound output" />
            {result ? (
              <>
                <pre className={styles.report}>{buildReport(result, evidence)}</pre>
                <div className={styles.exportRow}>
                  <button type="button" onClick={copyReport}><Clipboard size={16} /> Copy report</button>
                  <button type="button" onClick={downloadJson}><Database size={16} /> Export JSON</button>
                  <button type="button" onClick={() => window.print()}><FileText size={16} /> Print / PDF</button>
                </div>
              </>
            ) : (
              <EmptyState text="Export appears after a governed mission completes." />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function PanelTitle({ icon, title, label }: { icon: React.ReactNode; title: string; label: string }) {
  return (
    <header className={styles.panelTitle}>
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <h2>{title}</h2>
      </div>
    </header>
  );
}

function NavItem({ label, target, active }: { label: string; target: string; active: boolean }) {
  return (
    <button
      className={styles.navItem}
      data-active={active}
      type="button"
      onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" })}
    >
      <span />
      {label}
    </button>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function LensCard({ lens }: { lens: LensResult }) {
  return (
    <article className={styles.lensCard}>
      <header>
        <span>Governed Result</span>
        <strong>{formatName(lens.lens)}</strong>
      </header>
      <p>{lens.summary}</p>
      <div className={styles.scoreRow}>
        <span>Confidence {Math.round(lens.confidence * 100)}%</span>
        <span>Risk {Math.round(lens.riskScore * 100)}%</span>
        <span>{lens.policyRequired ? "Policy gated" : "Policy noted"}</span>
      </div>
      <div className={styles.findings}>
        {lens.findings.map((finding) => (
          <div key={finding.id} className={styles.finding} data-severity={finding.severity}>
            <span>{finding.severity}</span>
            <strong>{finding.title}</strong>
            <p>{finding.description}</p>
          </div>
        ))}
      </div>
      <InfoList title={`Evidence (${lens.evidence.length})`} items={lens.evidence.map((item) => `${item.sourceName}: ${item.summary}`)} />
    </article>
  );
}

function PolicyPanel({ policy, approvalRequired }: { policy: PolicyDecision; approvalRequired: boolean }) {
  return (
    <article className={styles.policyPanel} data-decision={policy.decision}>
      <span>Policy Evaluated</span>
      <strong>{policy.decision}</strong>
      <p>{policy.safeFallback}</p>
      <div className={styles.scoreBar}><i style={{ width: `${Math.round(policy.riskScore * 100)}%` }} /></div>
      <InfoList title="Reasons" items={policy.reasons} />
      {approvalRequired ? <div className={styles.approval}>Human confirmation is needed before any next step.</div> : null}
    </article>
  );
}

function ExtensionCard({ extension }: { extension: GovernedExtensionResult }) {
  return (
    <article className={styles.extensionCard}>
      <header>
        <span>{extension.status}</span>
        <strong>{extension.title}</strong>
      </header>
      <p>{extension.summary}</p>
      <div className={styles.scoreRow}>
        <span>{extension.defensivePosture}</span>
        <span>Policy {extension.policyDecision.decision}</span>
        <span>Evidence {extension.evidenceEventIds.length}</span>
      </div>
      <InfoList title="Proposed safe actions" items={extension.proposedActions.map((action) => `${action.label} (${action.policyActionId})`)} />
      {extension.claims?.length ? <InfoList title="Claims" items={extension.claims.map((claim) => `${claim.verifyRequired ? "[SOURCE GAP] " : ""}${claim.text}`)} /> : null}
    </article>
  );
}

function EvidenceDetail({ event }: { event: EvidenceEvent }) {
  return (
    <article className={styles.eventDetail}>
      <span>Ledger event #{event.chainIndex}</span>
      <h3>{event.action}</h3>
      <dl>
        <div><dt>Actor</dt><dd>{event.actor}</dd></div>
        <div><dt>Policy</dt><dd>{event.policyDecision?.decision ?? "recorded"}</dd></div>
        <div><dt>Timestamp</dt><dd>{new Date(event.timestamp).toLocaleString()}</dd></div>
        <div><dt>Input hash</dt><dd><code>{event.inputHash}</code></dd></div>
        <div><dt>Output hash</dt><dd><code>{event.outputHash ?? "none"}</code></dd></div>
        <div><dt>Event hash</dt><dd><code>{event.eventHash}</code></dd></div>
        <div><dt>Previous hash</dt><dd><code>{event.previousHash ?? "GENESIS"}</code></dd></div>
      </dl>
    </article>
  );
}

function MemoryGraphPanel({ extension }: { extension: GovernedExtensionResult }) {
  return (
    <div className={styles.memoryPanel}>
      <p>{extension.summary}</p>
      <InfoList title="Source-bound claims" items={(extension.claims ?? []).map((claim) => `${Math.round(claim.confidence * 100)}%: ${claim.text}`)} />
      <InfoList title="Limitations" items={extension.limitations} />
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={styles.infoList}>
      <h3>{title}</h3>
      {items.length ? (
        <ul>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p>No records returned.</p>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className={styles.empty}>{text}</p>;
}

function statusLabel(status: "idle" | "running" | "complete" | "error") {
  if (status === "running") return "Running";
  if (status === "complete") return "Complete";
  if (status === "error") return "Needs review";
  return "Ready";
}

function formatName(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readApiError(payload: unknown, status: number) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: { message?: string } }).error;
    if (error?.message) return error.message;
  }
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: string }).message;
    if (message) return message;
  }
  return `Request failed with status ${status}`;
}

function buildEvidenceReferenceChain(missionId: string, evidenceEventIds: string[]): EvidenceEvent[] {
  const uniqueIds = Array.from(new Set(evidenceEventIds));
  const timestamp = new Date().toISOString();
  return uniqueIds.map((eventId, index) => ({
    eventId,
    missionId,
    chainIndex: index,
    timestamp,
    actor: "evidence-ledger",
    action: "evidence_event_reference",
    inputHash: eventId,
    outputHash: undefined,
    parentEventId: undefined,
    previousHash: index === 0 ? undefined : uniqueIds[index - 1],
    eventHash: eventId,
  }));
}

function buildReport(result: AgenticMissionResult | null, evidence: EvidenceEvent[]) {
  if (!result) return "No mission result available.";
  const { mission } = result;
  return [
    "disha6.6 Workbench Report",
    `Mission: ${mission.missionId}`,
    `Intent: ${mission.signal.context.intent}`,
    `Sensitivity: ${mission.signal.context.sensitivity}`,
    `Policy: ${mission.policyDecision.decision}`,
    `Risk: ${Math.round(mission.riskScore * 100)}%`,
    "",
    "Core lens results:",
    ...mission.lensResults.map((lens) => `- ${formatName(lens.lens)}: ${lens.summary}`),
    "",
    "Governed extensions:",
    ...result.governedExtensions.results.map((extension) => `- ${extension.title}: ${extension.summary}`),
    "",
    "Model intelligence:",
    `- ${result.modelIntelligence.provider}/${result.modelIntelligence.model}: ${result.modelIntelligence.summary}`,
    "",
    "Evidence chain:",
    ...evidence.map((event) => `- #${event.chainIndex} ${event.action} hash=${event.eventHash}`),
  ].join("\n");
}
