"use client";

import Link from "next/link";
import {
  Bell,
  Building2,
  Car,
  ChevronDown,
  CircleDot,
  FileSearch,
  Globe2,
  Landmark,
  MapPinned,
  Network,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { InvestigationEvidencePanel } from "@/components/osint/InvestigationEvidencePanel";
import { InvestigationSession } from "@/lib/investigation/session";
import type { Investigation } from "@/lib/investigation/types";
import styles from "./investigate.module.css";

type SearchMode = {
  label: string;
  targetType: string;
  icon: typeof Search;
};

type ToolRecord = {
  toolId: string;
  name: string;
  status: string;
  healthStatus: string;
  category: string;
};

const SEARCH_MODES: SearchMode[] = [
  { label: "Universal Search", targetType: "auto", icon: Search },
  { label: "Person", targetType: "person_name", icon: UserRound },
  { label: "Domain", targetType: "domain", icon: Globe2 },
  { label: "Email", targetType: "email", icon: CircleDot },
  { label: "Phone", targetType: "phone", icon: Phone },
  { label: "Company", targetType: "company", icon: Building2 },
  { label: "Location", targetType: "location", icon: MapPinned },
  { label: "Vehicle", targetType: "vehicle_identifier", icon: Car },
  { label: "Document", targetType: "auto", icon: FileSearch },
  { label: "Cyber", targetType: "auto", icon: ShieldCheck },
  { label: "Government Data", targetType: "auto", icon: Landmark },
  { label: "OSINT", targetType: "auto", icon: Network },
];

const RESULT_TABS = [
  "Overview",
  "Evidence",
  "Sources",
  "Graph",
  "Timeline",
  "Map",
  "Contradictions",
  "Corroboration",
  "Raw",
] as const;

const INVESTIGATION_MODES = [
  ["Standard Search", "Fast governed retrieval"],
  ["Deep Search", "Expanded approved-source investigation"],
  ["Evidence First", "Prioritise verifiable evidence"],
  ["Continuous Watch", "Run approved recurring monitoring"],
] as const;

const SOURCE_POLICIES = ["Public Sources", "Authoritative", "Government", "All Approved"] as const;
const JURISDICTIONS = ["India", "Global"] as const;
const TIME_RANGES = ["24 Hours", "7 Days", "30 Days", "Custom"] as const;
const MANAGED_TOOL_IDS = new Set([
  "phoneinfoga",
  "sherlock",
  "maigret",
  "holehe",
  "instaloader",
  "telethon",
  "theharvester",
  "amass",
  "owasp-amass",
  "subfinder",
  "spiderfoot",
  "recon-ng",
  "photon",
  "opencti",
  "intelowl",
]);

export function InvestigationClient({ email: _email }: { email: string }) {
  const [active, setActive] = useState<Investigation | null>(null);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [selectedSearchMode, setSelectedSearchMode] = useState("Universal Search");
  const [activeTab, setActiveTab] = useState<(typeof RESULT_TABS)[number]>("Overview");
  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [toolsError, setToolsError] = useState("");
  const session = useRef<InvestigationSession | null>(null);

  const selectedSearch = useMemo(
    () => SEARCH_MODES.find((item) => item.label === selectedSearchMode) ?? SEARCH_MODES[0],
    [selectedSearchMode],
  );

  useEffect(() => {
    const current = new InvestigationSession(
      (value) => {
        setActive(value);
        if (!value) {
          setSelectedEvidence(null);
          setActiveTab("Overview");
        }
      },
      setError,
    );
    session.current = current;
    const leave = () => current.dispose();
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      current.dispose();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/osint/tools?limit=100", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Tool registry unavailable");
        return response.json() as Promise<{ tools?: ToolRecord[] }>;
      })
      .then((payload) => {
        const entries = Array.isArray(payload.tools) ? payload.tools : [];
        setTools(entries.filter((tool) => MANAGED_TOOL_IDS.has(tool.toolId)));
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setToolsError(failure instanceof Error ? failure.message : "Tool registry unavailable");
        }
      });
    return () => controller.abort();
  }, []);

  const start = useCallback(async () => {
    const target = query.trim();
    if (!target || busy || closing || active) return;

    setBusy(true);
    setError("");
    try {
      await session.current?.start({
        target,
        targetType: selectedSearch.targetType,
        identityAuthorization: false,
        activeAuthorization: false,
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "INVESTIGATION SERVICE FAILED");
    } finally {
      setBusy(false);
    }
  }, [active, busy, closing, query, selectedSearch.targetType]);

  const close = useCallback(async () => {
    setClosing(true);
    setError("");
    try {
      await session.current?.close();
      setQuery("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Cleanup could not be confirmed.");
    } finally {
      setClosing(false);
    }
  }, []);

  useEffect(() => {
    const runWithKeyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void start();
      }
    };
    window.addEventListener("keydown", runWithKeyboard);
    return () => window.removeEventListener("keydown", runWithKeyboard);
  }, [start]);

  const evidence = active?.evidence.find((item) => item.evidenceId === selectedEvidence);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void start();
  }

  return (
    <main className={styles.appShell}>
      <header className={styles.header}>
        <div className={styles.sovereignBrand}>
          <span className={styles.emblem} aria-hidden="true" />
          <div>
            <strong>Satyamev Jayate</strong>
            <span className={styles.tricolour} aria-hidden="true" />
          </div>
        </div>

        <Link
          className={styles.productBrand}
          href="/investigate"
          onClick={(event) => {
            if (active) {
              event.preventDefault();
              void close();
            }
          }}
        >
          <strong>DISHA6.6</strong>
          <span>Constitutional Evidence Operating System</span>
        </Link>

        <div className={styles.utilityCluster}>
          <button type="button" aria-label="Notifications">
            <Bell size={16} />
          </button>
          <Link href="/system" aria-label="System">
            <ShieldCheck size={16} />
          </Link>
          <button type="button" aria-label="Settings">
            <Settings size={16} />
          </button>

          <details className={styles.profileMenu}>
            <summary>
              <span className={styles.avatar}>G</span>
              <span>
                <strong>Ghost</strong>
                <small>Intelligence Cell</small>
              </span>
              <ChevronDown size={14} />
            </summary>
            <div>
              <Link href="/system">System</Link>
              <Link href="/workbench">Workbench</Link>
            </div>
          </details>
        </div>
      </header>

      <div className={styles.threePanel}>
        <aside className={styles.leftPanel}>
          <section>
            <div className={styles.panelTitle}>
              <span>Search Universe</span>
              <small>Target type</small>
            </div>

            <nav className={styles.searchModes} aria-label="Search Universe">
              {SEARCH_MODES.map((item) => {
                const Icon = item.icon;
                const selected = selectedSearchMode === item.label;
                return (
                  <button
                    key={item.label}
                    type="button"
                    className={selected ? styles.searchModeActive : styles.searchMode}
                    onClick={() => setSelectedSearchMode(item.label)}
                    disabled={Boolean(active)}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </section>

          <section className={styles.leftNavSection}>
            <div className={styles.divider} />
            <nav className={styles.workspaceNav} aria-label="Investigation workspace navigation">
              <Link href="/investigate">Investigate</Link>
              <Link href="/workbench">Saved Cases</Link>
              <Link href="/operations">Watches</Link>
              <Link href="/vault">Evidence Vault</Link>
              <Link href="/contradictions">Contradictions</Link>
              <Link href="/corroboration">Corroboration</Link>
            </nav>
          </section>
        </aside>

        <section className={styles.centerPanel}>
          <div className={styles.queryComposer}>
            <div className={styles.composerMeta}>
              <span>Investigation Workspace</span>
              <div className={styles.configChips}>
                <span>{selectedSearchMode}</span>
                <span>Automatic governed routing</span>
              </div>
            </div>

            <form className={styles.searchForm} onSubmit={submit}>
              <Search size={20} aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search across connected intelligence sources"
                disabled={busy || Boolean(active)}
                maxLength={512}
                autoComplete="off"
                spellCheck={false}
              />
              <kbd>Ctrl + Enter</kbd>

              {active ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => void close()}
                  disabled={closing}
                >
                  <X size={15} />
                  {closing ? "Closing" : "Close"}
                </button>
              ) : (
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={busy || !query.trim()}
                >
                  {busy ? "Starting" : "Run Search"}
                </button>
              )}
            </form>
          </div>

          <div className={styles.resultTabs} role="tablist" aria-label="Investigation result views">
            {RESULT_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <section className={styles.workspaceSurface}>
            {!active ? (
              <ReadyState />
            ) : activeTab === "Evidence" ? (
              <EvidenceView active={active} onSelect={setSelectedEvidence} />
            ) : activeTab === "Sources" ? (
              <SourceView active={active} />
            ) : activeTab === "Graph" ? (
              <GraphState active={active} />
            ) : activeTab === "Timeline" ? (
              <EmptyState
                title="No timeline events yet"
                text="Timeline events appear only when live evidence provides temporal records."
              />
            ) : activeTab === "Map" ? (
              <EmptyState
                title="No investigation markers"
                text="Map markers appear only when live investigation results contain geospatial evidence."
              />
            ) : activeTab === "Contradictions" ? (
              <EmptyState
                title="No contradiction findings"
                text="Contradictions appear only when the live investigation produces evidence-backed conflicts."
              />
            ) : activeTab === "Corroboration" ? (
              <EmptyState
                title="No corroboration findings"
                text="Corroboration appears only when multiple live sources support the same evidence-backed finding."
              />
            ) : activeTab === "Raw" ? (
              <RawState active={active} />
            ) : (
              <OverviewState active={active} onSelect={setSelectedEvidence} />
            )}
          </section>

          {error ? <div className={styles.errorBanner} role="alert">{error}</div> : null}
        </section>

        <aside className={styles.rightPanel}>
          <div className={styles.panelTitle}>
            <span>Investigation Control</span>
            <small>Configuration</small>
          </div>

          <ControlGroup title="Mode">
            {INVESTIGATION_MODES.map(([label, description], index) => (
              <button
                key={label}
                className={index === 0 ? styles.controlActive : styles.controlRow}
                type="button"
                disabled={index !== 0}
                title={index === 0 ? "Current governed investigation mode" : "Not enabled by the current investigation contract"}
              >
                <span>
                  <strong>{label}</strong>
                  <small>{index === 0 ? description : `${description} · Not enabled`}</small>
                </span>
                <i />
              </button>
            ))}
          </ControlGroup>

          <ControlGroup title="Runtime Tools">
            <p className={styles.neutralState}>Approved tools are selected automatically from the target type and live policy state.</p>
            <div className={styles.toolList}>
              {tools.length ? (
                tools.slice(0, 12).map((tool) => (
                  <div key={tool.toolId} className={styles.toolRow}>
                    <span>
                      <strong>{tool.name}</strong>
                      <small>{humanStatus(tool.status || tool.healthStatus)}</small>
                    </span>
                    <i />
                  </div>
                ))
              ) : (
                <p className={styles.neutralState}>
                  {toolsError || "Loading managed runtime registry…"}
                </p>
              )}
            </div>
          </ControlGroup>

          <ControlGroup title="Source Policy">
            <div className={styles.compactGrid}>
              {SOURCE_POLICIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled
                  title="Source-policy selection is not enabled by the current investigation contract"
                >
                  {item}
                </button>
              ))}
            </div>
          </ControlGroup>

          <ControlGroup title="Jurisdiction">
            <div className={styles.compactGrid}>
              {JURISDICTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled
                  title="Jurisdiction filtering is not enabled by the current investigation contract"
                >
                  {item}
                </button>
              ))}
            </div>
          </ControlGroup>

          <ControlGroup title="Time Range">
            <div className={styles.compactGrid}>
              {TIME_RANGES.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled
                  title="Time-range filtering is not enabled by the current investigation contract"
                >
                  {item}
                </button>
              ))}
            </div>
          </ControlGroup>

          <div className={styles.executionArea}>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={busy || closing || Boolean(active) || !query.trim()}
              onClick={() => void start()}
            >
              {busy ? "Investigation running" : "Run Investigation"}
            </button>
            <button
              type="button"
              className={styles.secondaryWide}
              disabled
              title="Configuration persistence is not enabled by the current investigation contract"
            >
              Save Configuration
            </button>
          </div>
        </aside>
      </div>

      {evidence ? (
        <InvestigationEvidencePanel
          evidence={evidence}
          status={
            active?.runs.find((run) => run.adapterId === evidence.adapterId)?.status ?? "COMPLETED"
          }
          onClose={() => setSelectedEvidence(null)}
        />
      ) : null}
    </main>
  );
}

function ControlGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.controlGroup}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ReadyState() {
  return (
    <div className={styles.readyState}>
      <div className={styles.readyGlyph}>
        <Sparkles size={24} />
      </div>
      <h1>Start an investigation</h1>
      <p>
        Select a search type and run a query. DISHA6.6 routes approved sources automatically
        and builds the evidence workspace only from returned source records.
      </p>

      <div className={styles.capabilityRail}>
        {[
          "Evidence",
          "Sources",
          "Entity Graph",
          "Timeline",
          "Map",
          "Contradictions",
          "Corroboration",
        ].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <div className={styles.graphChamber}>
        <div className={styles.graphGrid} />
        <div>
          <Network size={22} />
          <strong>No entity graph yet</strong>
          <span>Relationships will appear when evidence-backed entities are discovered.</span>
        </div>
      </div>
    </div>
  );
}

function OverviewState({
  active,
  onSelect,
}: {
  active: Investigation;
  onSelect: (id: string) => void;
}) {
  if (active.status !== "COMPLETED") {
    return <LoadingState title="Investigation running" text="Retrieving approved sources" />;
  }

  if (!active.evidence.length) {
    return (
      <EmptyState
        title="No results"
        text="The live investigation completed without source-backed evidence."
      />
    );
  }

  return (
    <div className={styles.liveResults}>
      <div className={styles.liveHeader}>
        <span>Live investigation</span>
        <strong>{active.normalizedTarget}</strong>
      </div>

      <div className={styles.evidenceCards}>
        {active.evidence.map((item) => (
          <button key={item.evidenceId} type="button" onClick={() => onSelect(item.evidenceId)}>
            <small>{item.sourceName}</small>
            <strong>{item.summary}</strong>
            <span>Open evidence</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EvidenceView({
  active,
  onSelect,
}: {
  active: Investigation;
  onSelect: (id: string) => void;
}) {
  if (!active.evidence.length) {
    return (
      <EmptyState
        title="No evidence loaded"
        text="Evidence records will appear here after a live investigation is executed."
      />
    );
  }

  return (
    <div className={styles.evidenceCards}>
      {active.evidence.map((item) => (
        <button key={item.evidenceId} type="button" onClick={() => onSelect(item.evidenceId)}>
          <small>{item.sourceName}</small>
          <strong>{item.summary}</strong>
          <span>Inspect provenance</span>
        </button>
      ))}
    </div>
  );
}

function SourceView({ active }: { active: Investigation }) {
  if (!active.runs.length) {
    return (
      <EmptyState
        title="No sources loaded"
        text="Source activity appears only after a live investigation starts."
      />
    );
  }

  return (
    <div className={styles.sourceRows}>
      {active.runs.map((run) => (
        <div key={run.adapterId}>
          <span>
            <strong>{run.sourceName}</strong>
            <small>{humanStatus(run.status)}</small>
          </span>
          <i data-status={run.status} />
        </div>
      ))}
    </div>
  );
}

function GraphState({ active }: { active: Investigation }) {
  if (!active.edges.length) {
    return (
      <div className={styles.graphOnly}>
        <div className={styles.graphGrid} />
        <div>
          <Network size={22} />
          <strong>No entity graph yet</strong>
          <span>Relationships will appear when evidence-backed entities are discovered.</span>
        </div>
      </div>
    );
  }

  return (
    <EmptyState
      title="Graph data available"
      text="Evidence-backed relationships are present in the active investigation."
    />
  );
}

function RawState({ active }: { active: Investigation }) {
  return (
    <pre className={styles.rawView}>
      {JSON.stringify(
        {
          investigationId: active.investigationId,
          targetType: active.targetType,
          status: active.status,
          runs: active.runs,
          evidence: active.evidence,
          candidateClusters: active.candidateClusters,
          edges: active.edges,
        },
        null,
        2,
      )}
    </pre>
  );
}

function LoadingState({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.spinner} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.emptyState}>
      <CircleDot size={22} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function humanStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}
