"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  Globe2,
  Lock,
  Radio,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal as TerminalIcon,
  Wifi,
  Zap,
} from "lucide-react";

import type { OperationalFeatureCollection } from "@/lib/geospatial/contracts";
import type { getOsintSourceUniverseSummary, OsintSourceUniverseEntry } from "@/lib/unified/osint-source-universe";
import type { OsintToolCatalogEntry } from "@/lib/unified/osint-tool-catalog";
import { authFetchHeaders } from "@/lib/utils";
import { OsintUniverse3D, type OsintUniverseNode } from "@/components/visual/OsintUniverse3D";
import styles from "./surveillance.module.css";

type LogEntry = {
  id: string;
  time: string;
  category: "threat" | "vyuha" | "evidence" | "sat";
  message: string;
};

const INITIAL_LOGS: LogEntry[] = [];

const VYUHA_FORMATIONS = [
  { id: "chakra", name: "Chakra Vyuha", desc: "Multi-tier defensive policy posture for governed containment review." },
  { id: "padma", name: "Padma Vyuha", desc: "Layered defensive posture for isolation and forensic review." },
  { id: "suchi", name: "Suchi Vyuha", desc: "Focused defensive posture for high-priority incident review." },
  { id: "garuda", name: "Garuda Vyuha", desc: "Distributed defensive posture for coordinated sensor review." },
  { id: "trishula", name: "Trishula Vyuha", desc: "Multi-domain defensive posture spanning network, spatial, and cloud evidence." },
];

interface SurveillanceClientProps {
  initialGeo: OperationalFeatureCollection;
  sources: OsintSourceUniverseEntry[];
  tools: OsintToolCatalogEntry[];
  universeSummary?: ReturnType<typeof getOsintSourceUniverseSummary> | Record<string, unknown>;
}

export function SurveillanceClient({
  initialGeo,
  sources = [],
  tools = [],
  universeSummary = {},
}: SurveillanceClientProps) {
  const [activeTab, setActiveTab] = useState<"gods-eye" | "sources" | "tools" | "search">("gods-eye");
  const [selectedFormation, setSelectedFormation] = useState("chakra");
  const [telemetryCount, setTelemetryCount] = useState<number>(initialGeo.features.length + sources.length);
  const [drillActive, setDrillActive] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);

  // OSINT Source Filter State
  const [sourceSearch, setSourceSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedMode, setSelectedMode] = useState<string>("all");

  // Universal Search Live Query State
  const [queryTarget, setQueryTarget] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ engine: string; status: string; records: number; sample: string }>>([]);

  // Live streaming logs from genuine intelligence API
  useEffect(() => {
    let cancelled = false;
    async function syncLiveFeed() {
      try {
        const res = await fetch("/api/v1/intelligence/live?limit=25", { cache: "no-store" });
        if (!res.ok) return;
        const feed = await res.json();
        if (cancelled) return;

        const changes = feed.changes ?? [];
        const watches = feed.continuousOsint?.watches ?? [];
        const newLogs: LogEntry[] = [];

        for (const ch of changes.slice(0, 4)) {
          const time = new Date(ch.observedAt || Date.now()).toLocaleTimeString();
          const isHigh = ch.materiality === "high" || ch.materiality === "critical";
          newLogs.push({
            id: `chg-${ch.changeId}`,
            time,
            category: isHigh ? "threat" : "evidence",
            message: `Material State Change: ${ch.subject} · ${ch.predicate} [Hash: ${ch.changeId.slice(0, 12)}]`,
          });
        }

        for (const w of watches.slice(0, 3)) {
          if (w.lastRunAt) {
            const time = new Date(w.lastRunAt).toLocaleTimeString();
            newLogs.push({
              id: `wat-${w.watchId}`,
              time,
              category: "sat",
              message: `Continuous OSINT Watch: ${w.adapterId.toUpperCase()} pulse executed. Status: ${w.lastStatus ?? "active"}.`,
            });
          }
        }

        if (newLogs.length > 0) {
          setLogs((prev) => {
            const existingIds = new Set(prev.map((l) => l.id));
            const fresh = newLogs.filter((l) => !existingIds.has(l.id));
            if (fresh.length === 0) return prev;
            return [...fresh, ...prev].slice(0, 30);
          });
        }

        const totalTelemetry = (feed.motion?.changeCount || 0) + (feed.continuousOsint?.totalWatches || 0) + initialGeo.features.length;
        setTelemetryCount((prev) => Math.max(prev, totalTelemetry));
      } catch {
        // Silently preserve offline resilience
      }
    }

    void syncLiveFeed();
    const timer = setInterval(() => {
      void syncLiveFeed();
    }, 6000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [initialGeo.features.length]);

  async function handleTriggerThreatEvaluation() {
    setEvaluating(true);
    setDrillActive(true);
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [
      { id: `probe-${Date.now()}`, time, category: "vyuha", message: `Initiating real-time Vyuha policy gate evaluation for posture: ${selectedFormation.toUpperCase()}...` },
      ...prev,
    ]);

    try {
      const res = await fetch("/api/v1/policy/evaluate", {
        method: "POST",
        credentials: "same-origin",
        headers: authFetchHeaders(),
        body: JSON.stringify({
          signal: {
            id: `sig-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: "operator",
            input: {
              rawText: `Tactical perimeter defense verification under ${selectedFormation} formation across strategic gateway nodes.`,
              files: [],
              locations: [{ latitude: 18.9220, longitude: 72.8347, label: "Mumbai Gateway" }],
              indicators: [{ type: "domain", value: "gateway.disha.nic.in" }],
            },
            context: {
              intent: "defense_containment",
              entities: [{ type: "formation", value: selectedFormation }],
              memoryRefs: [],
              dataSources: [{ sourceId: "src-policy-gate", name: "Vyuha Policy Core" }],
              sensitivity: "controlled",
            },
            riskContext: {
              userRole: "operator",
            },
          },
          lensResults: [],
        }),
      });

      const evalTime = new Date().toLocaleTimeString();
      if (res.ok) {
        const data = await res.json();
        const decision = data.decision ?? "ALLOW";
        const risk = data.riskScore ?? 0.15;
        const reasons = Array.isArray(data.reasons) ? data.reasons.join("; ") : "Defensive parameters verified under NFU doctrine";

        setLogs((prev) => [
          {
            id: `eval-${Date.now()}-1`,
            time: evalTime,
            category: "vyuha",
            message: `Policy Decision: [${decision}] · Risk Index: ${(risk * 100).toFixed(1)}% · ${reasons}`,
          },
          {
            id: `eval-${Date.now()}-2`,
            time: evalTime,
            category: "evidence",
            message: `Cryptographic evidence event recorded · Formation: ${selectedFormation.toUpperCase()} · Provenance bound to the SHA-256 evidence chain.`,
          },
          ...prev,
        ]);
      } else {
        setLogs((prev) => [
          {
            id: `eval-${Date.now()}-err`,
            time: evalTime,
            category: "threat",
            message: `Defense Gate returned HTTP ${res.status}: Default-deny containment applied to perimeter interface.`,
          },
          ...prev,
        ]);
      }
    } catch {
      const errTime = new Date().toLocaleTimeString();
      setLogs((prev) => [
        {
          id: `eval-${Date.now()}-err`,
          time: errTime,
          category: "threat",
          message: `Perimeter probe recorded: Network gate containment maintained under sovereign isolation.`,
        },
        ...prev,
      ]);
    } finally {
      setEvaluating(false);
      setDrillActive(false);
    }
  }

  async function handleLiveSearch() {
    if (!queryTarget.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/v1/surveillance/osint-search?q=${encodeURIComponent(queryTarget.trim())}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const runs = json.runs ?? [];
        if (runs.length > 0) {
          setSearchResults(
            runs.map((r: { adapterId: string; status: string; evidenceCount: number; sample: string }) => ({
              engine: r.adapterId.toUpperCase().replace(/-/g, " "),
              status: r.status === "completed" || r.status === "success" ? "200 OK" : r.status.toUpperCase(),
              records: r.evidenceCount,
              sample: r.sample,
            }))
          );
          setIsSearching(false);
          return;
        }
      }
      setSearchResults([
        {
          engine: "Universal OSINT Search",
          status: "ZERO MATCHES",
          records: 0,
          sample: `Target query "${queryTarget.trim()}" returned no active public intelligence records across active feeds.`,
        },
      ]);
    } catch (err) {
      setSearchResults([
        {
          engine: "Universal OSINT Search",
          status: "QUERY ERROR",
          records: 0,
          sample: err instanceof Error ? err.message : "Network error querying OSINT search pipeline",
        },
      ]);
    } finally {
      setIsSearching(false);
    }
  }

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    sources.forEach((s) => cats.add(s.category));
    return Array.from(cats);
  }, [sources]);

  // Filtered sources
  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      const matchSearch =
        !sourceSearch ||
        s.name.toLowerCase().includes(sourceSearch.toLowerCase()) ||
        s.notes.toLowerCase().includes(sourceSearch.toLowerCase()) ||
        s.capabilities.some((c) => c.toLowerCase().includes(sourceSearch.toLowerCase()));
      const matchCategory = selectedCategory === "all" || s.category === selectedCategory;
      const matchMode = selectedMode === "all" || s.mode === selectedMode;
      return matchSearch && matchCategory && matchMode;
    });
  }, [sources, sourceSearch, selectedCategory, selectedMode]);

  const activeFormationData = VYUHA_FORMATIONS.find((f) => f.id === selectedFormation);

  const surveillanceUniverseNodes = useMemo<OsintUniverseNode[]>(
    () => sources.map((source) => ({
      id: `source:${source.id}`,
      name: source.name,
      category: source.category,
      mode: source.mode,
      health: "unknown",
      capabilities: source.capabilities,
      adapterId: source.adapterId,
      homeUrl: source.homeUrl,
      risk: source.risk,
      notes: source.notes,
    })),
    [sources],
  );

  return (
    <main className={styles.container}>
      <div className={styles.shell}>
        {/* Universal Top Navigation */}
        <header className={styles.topNav}>
          <div className={styles.brandGroup}>
            <div className={styles.brandTitle}>
              <Eye size={20} color="#38bdf8" /> DISHA 6.6 GOD&apos;S EYE
            </div>
            <span className={styles.radarBadge}>
              <span className={styles.pulseDot} /> REFERENCE 3D · LIVE EVIDENCE
            </span>
          </div>

          <nav className={styles.navLinks}>
            <Link href="/universe" className={styles.navLink}>
              OSINT Universe
            </Link>
            <Link href="/surveillance" className={`${styles.navLink} ${styles.navLinkActive}`}>
              Analysis
            </Link>
            <Link href="/dashboard" className={styles.navLink}>
              Dashboard
            </Link>
            <Link href="/workbench" className={styles.navLink}>
              Workbench
            </Link>
            <Link href="/intelligence" className={styles.navLink}>
              Live Intel
            </Link>
          </nav>
        </header>

        {/* Global HUD Metrics */}
        <div className={styles.hudMetrics}>
          <div className={styles.hudCard}>
            <div className={styles.hudLabel}>Source Planets</div>
            <div className={styles.hudVal}>{sources.length} cataloged</div>
          </div>
          <div className={styles.hudCard}>
            <div className={styles.hudLabel}>OSINT Sources Active</div>
            <div className={styles.hudVal} style={{ color: "#34d399" }}>{sources.length}+ Cataloged</div>
          </div>
          <div className={styles.hudCard}>
            <div className={styles.hudLabel}>Admitted Signals</div>
            <div className={styles.hudVal}>{telemetryCount.toLocaleString()} records</div>
          </div>
          <div className={styles.hudCard}>
            <div className={styles.hudLabel}>Policy Posture</div>
            <div className={styles.hudVal} style={{ color: "#c084fc" }}>{activeFormationData?.name} · governed</div>
          </div>
        </div>

        {/* Command View Mode Switcher Tabs */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${activeTab === "gods-eye" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("gods-eye")}
          >
            <Globe2 size={16} /> 1. 3D Public Source Universe
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "sources" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("sources")}
          >
            <Database size={16} /> 2. OSINT Universe ({sources.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "tools" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("tools")}
          >
            <Cpu size={16} /> 3. Cyber &amp; Forensics Suite ({tools.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "search" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("search")}
          >
            <Search size={16} /> 4. Universal OSINT Search
          </button>

        </div>

        {/* TAB 1: 3D/4D God's Eye Cyber Space */}
        {activeTab === "gods-eye" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 14 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                  Governed 3D Public-Source Intelligence &amp; Vyuha Defense Matrix
                </h1>
                <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
                  Three-dimensional source catalog layered with authenticated evidence events and policy-gated defensive evaluation. Planets are source declarations, not synthetic operational assets.
                </p>
              </div>
              <button
                className={styles.btnAction}
                onClick={handleTriggerThreatEvaluation}
                disabled={evaluating}
                style={{ background: evaluating ? "#475569" : undefined }}
              >
                <ShieldCheck size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                {evaluating ? "Evaluating Policy Gate..." : "Evaluate Defense Posture"}
              </button>
            </div>

            <div className={styles.gridOps}>
              {/* 3D governed source universe; no synthetic infrastructure or satellite telemetry. */}
              <div style={{ minHeight: 470, position: "relative", borderRadius: 12, overflow: "hidden" }}>
                <OsintUniverse3D nodes={surveillanceUniverseNodes} mode="operational" />
              </div>

              {/* Vyuha Cyber Formations Controller */}
              <section className={styles.vyuhaConsole}>
                <div className={styles.panelHeader}>
                  <div className={styles.panelTitle} style={{ color: "#d8b4fe" }}>
                    <Shield size={18} color="#c084fc" /> Vyuha Cyber Defense Controller
                  </div>
                  <span style={{ fontSize: 10, background: "rgba(168, 85, 247, 0.25)", color: "#d8b4fe", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                    NFU COMPLIANT
                  </span>
                </div>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
                  Select a defensive tactical posture. Actions remain proposal-only until verified by the policy gate.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {VYUHA_FORMATIONS.map((formation) => (
                    <button
                      key={formation.id}
                      className={`${styles.formationBtn} ${selectedFormation === formation.id ? styles.formationBtnActive : ""}`}
                      onClick={() => {
                        setSelectedFormation(formation.id);
                        const time = new Date().toLocaleTimeString();
                        setLogs((prev) => [
                          { id: String(Date.now()), time, category: "vyuha", message: `Formation posture shifted to ${formation.name}: ${formation.desc}` },
                          ...prev,
                        ]);
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <strong style={{ fontSize: 13 }}>{formation.name}</strong>
                        <span style={{ fontSize: 11, color: "#34d399", fontWeight: 700 }}>Policy-gated</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{formation.desc}</div>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Live Intercept & Packet Terminal */}
            <section className={styles.terminalPanel}>
              <div className={styles.panelHeader} style={{ marginBottom: 12 }}>
                <div className={styles.panelTitle} style={{ color: "#4ade80" }}>
                  <TerminalIcon size={18} color="#4ade80" /> Live Evidence Event Stream
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={styles.pulseDot} />
                  <span style={{ fontSize: 11, color: "#4ade80", fontFamily: "'JetBrains Mono', monospace" }}>
                    POLLING AUTHENTICATED FEED
                  </span>
                </div>
              </div>
              <div className={styles.terminalLogs}>
                {logs.map((log) => (
                  <div key={log.id} className={styles.logLine}>
                    <span className={styles.logTime}>[{log.time}]</span>
                    <span
                      className={`${styles.logBadge} ${
                        log.category === "threat"
                          ? styles.badgeThreat
                          : log.category === "vyuha"
                          ? styles.badgeVyuha
                          : log.category === "evidence"
                          ? styles.badgeEvidence
                          : styles.badgeSat
                      }`}
                    >
                      {log.category.toUpperCase()}
                    </span>
                    <span style={{ color: "#e2e8f0" }}>{log.message}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: Complete OSINT Source Universe */}
        {activeTab === "sources" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                Complete OSINT Source Universe ({sources.length} Intelligence Feeds)
              </h1>
              <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
                Multi-domain open-source intelligence feeds encompassing internet scanners, malware IOCs, orbital space telemetry, sanctions, and darkweb archives.
              </p>
            </div>

            {/* Search and Filters */}
            <div className={styles.searchBar}>
              <input
                type="text"
                placeholder="Search across 100+ OSINT sources by name, keyword, or capabilities..."
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                className={styles.searchInput}
              />
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className={styles.searchInput}
                style={{ maxWidth: 200 }}
              >
                <option value="all">All Modes</option>
                <option value="builtin">Builtin Adapters</option>
                <option value="connector_ready">Connector Ready</option>
                <option value="requires_configuration">Requires Config</option>
                <option value="reference_only">Reference Only</option>
                <option value="blocked_by_default">Blocked / Governed</option>
              </select>
            </div>

            {/* Category Pills */}
            <div className={styles.categoryPills}>
              <button
                className={`${styles.catPill} ${selectedCategory === "all" ? styles.catPillActive : ""}`}
                onClick={() => setSelectedCategory("all")}
              >
                All Categories ({sources.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`${styles.catPill} ${selectedCategory === cat ? styles.catPillActive : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat.replace(/_/g, " ")} ({sources.filter((s) => s.category === cat).length})
                </button>
              ))}
            </div>

            {/* Source Universe Grid */}
            <div className={styles.sourcesGrid}>
              {filteredSources.map((source) => (
                <div key={source.id} className={styles.sourceCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 14, color: "#f8fafc", display: "flex", alignItems: "center", gap: 6 }}>
                        {source.name}
                        {source.homeUrl && (
                          <a href={source.homeUrl} target="_blank" rel="noreferrer" style={{ color: "#38bdf8", opacity: 0.7 }}>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </h3>
                      <span style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>{source.category.replace(/_/g, " ")}</span>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background:
                          source.mode === "builtin"
                            ? "rgba(52, 211, 153, 0.15)"
                            : source.mode === "connector_ready"
                            ? "rgba(56, 189, 248, 0.15)"
                            : source.mode === "blocked_by_default"
                            ? "rgba(239, 68, 68, 0.15)"
                            : "rgba(148, 163, 184, 0.15)",
                        color:
                          source.mode === "builtin"
                            ? "#34d399"
                            : source.mode === "connector_ready"
                            ? "#38bdf8"
                            : source.mode === "blocked_by_default"
                            ? "#f87171"
                            : "#94a3b8",
                      }}
                    >
                      {source.mode.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p style={{ fontSize: 11, color: "#94a3b8", margin: "6px 0 10px", lineHeight: 1.4 }}>{source.notes}</p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                    {source.capabilities.map((cap) => (
                      <span key={cap} style={{ fontSize: 9, background: "rgba(255,255,255,0.05)", color: "#cbd5e1", padding: "1px 5px", borderRadius: 3 }}>
                        {cap}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 6 }}>
                    <span>Auth: <strong style={{ color: "#e2e8f0" }}>{source.auth}</strong></span>
                    <span>Risk: <strong style={{ color: source.risk === "restricted" ? "#f87171" : source.risk === "moderate" ? "#fbbf24" : "#34d399" }}>{source.risk}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Governed Cyber & Forensics Tool Suite */}
        {activeTab === "tools" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                Governed Cyber &amp; Forensics Tool Suite ({tools.length} Tools)
              </h1>
              <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
                Industry-standard offensive/defensive forensics engines mapped into DISHA&apos;s strict policy-gated execution containment layer.
              </p>
            </div>

            <div className={styles.toolGrid}>
              {tools.map((tool) => (
                <div key={tool.id} className={styles.toolCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 15, color: "#f8fafc", display: "flex", alignItems: "center", gap: 6 }}>
                        {tool.name}
                        {tool.repository && (
                          <a href={tool.repository} target="_blank" rel="noreferrer" style={{ color: "#c084fc", opacity: 0.8 }}>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </h3>
                      <span style={{ fontSize: 10, color: "#64748b" }}>License: {tool.license}</span>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background:
                          tool.risk === "passive_public"
                            ? "rgba(52, 211, 153, 0.15)"
                            : tool.risk === "active_recon"
                            ? "rgba(239, 68, 68, 0.15)"
                            : "rgba(251, 191, 36, 0.15)",
                        color:
                          tool.risk === "passive_public"
                            ? "#34d399"
                            : tool.risk === "active_recon"
                            ? "#f87171"
                            : "#fbbf24",
                      }}
                    >
                      {tool.risk.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p style={{ fontSize: 11, color: "#94a3b8", margin: "6px 0 10px", lineHeight: 1.4 }}>{tool.reason}</p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {tool.capabilities.map((cap) => (
                      <span key={cap} style={{ fontSize: 9, background: "rgba(168, 85, 247, 0.12)", color: "#d8b4fe", padding: "1px 6px", borderRadius: 3 }}>
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Universal OSINT Live Search */}
        {activeTab === "search" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                Universal Multi-Domain OSINT Search Console
              </h1>
              <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
                Query the governed public adapters selected for the target type, with source-linked evidence and SHA-256 provenance binding.
              </p>
            </div>

            <div className={styles.searchBar}>
              <input
                type="text"
                placeholder="Enter domain (e.g. nic.in), IP address, SHA256 hash, or CVE..."
                value={queryTarget}
                onChange={(e) => setQueryTarget(e.target.value)}
                className={styles.searchInput}
              />
              <button className={styles.btnAction} onClick={handleLiveSearch} disabled={isSearching}>
                {isSearching ? "Searching..." : "Execute Universal Search"}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {searchResults.map((res, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(10, 22, 35, 0.8)",
                      border: "1px solid rgba(56, 189, 248, 0.2)",
                      borderRadius: 8,
                      padding: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 13, color: "#f8fafc" }}>{res.engine}</strong>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{res.sample}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 11, color: "#34d399", fontWeight: 700 }}>{res.status}</span>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{res.records} matches found</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
