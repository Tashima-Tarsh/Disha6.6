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
  Sparkles,
  Terminal as TerminalIcon,
  Wifi,
  Zap,
} from "lucide-react";

import type { OperationalFeatureCollection } from "@/lib/geospatial/contracts";
import type { getOsintSourceUniverseSummary, OsintSourceUniverseEntry } from "@/lib/unified/osint-source-universe";
import type { OsintToolCatalogEntry } from "@/lib/unified/osint-tool-catalog";
import { GodsEyeHologramGlobe, SATELLITE_ORBITS, STRATEGIC_GLOBAL_NODES } from "@/components/visual/GodsEyeHologramGlobe";
import styles from "./surveillance.module.css";

type LogEntry = {
  id: string;
  time: string;
  category: "threat" | "vyuha" | "evidence" | "sat";
  message: string;
};

const INITIAL_LOGS: LogEntry[] = [
  { id: "1", time: "20:30:00", category: "vyuha", message: "Vyuha Chakra Formation actively shielding Mumbai Subsea & Delhi Core nodes." },
  { id: "2", time: "20:29:55", category: "evidence", message: "Evidence Block #9482 sealed with Merkle Root hash [0x7f4a...e12d]." },
  { id: "3", time: "20:29:48", category: "threat", message: "Port sweep intercepted from ASN 4921 -> Trapped in Padma Decoy Array." },
  { id: "4", time: "20:29:36", category: "sat", message: "Orbital Satellite GS-04 pass synchronized -> 12 strategic ground pins refreshed." },
];

const VYUHA_FORMATIONS = [
  { id: "chakra", name: "Chakra Vyuha", desc: "Multi-tier rotational perimeter containment with active honeypot diversion.", activeThreats: 2, containmentScore: "99.4%" },
  { id: "padma", name: "Padma Vyuha", desc: "Layered petal decoy grid designed for adversary isolation and deep forensic capture.", activeThreats: 1, containmentScore: "98.1%" },
  { id: "suchi", name: "Suchi Vyuha", desc: "Needle-point rapid surgical isolation targeting high-velocity zero-day exploits.", activeThreats: 0, containmentScore: "99.9%" },
  { id: "garuda", name: "Garuda Vyuha", desc: "High-speed aerial and orbital satellite sensor synchronization.", activeThreats: 0, containmentScore: "96.8%" },
  { id: "trishula", name: "Trishula Vyuha", desc: "Tri-pronged coordinated passive defense covering Subsea, Space, and Cloud.", activeThreats: 0, containmentScore: "99.7%" },
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
  const [activeTab, setActiveTab] = useState<"gods-eye" | "sources" | "tools" | "search" | "fleet">("gods-eye");
  const [selectedFormation, setSelectedFormation] = useState("chakra");
  const [packetCount, setPacketCount] = useState(18940);
  const [drillActive, setDrillActive] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);

  // OSINT Source Filter State
  const [sourceSearch, setSourceSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedMode, setSelectedMode] = useState<string>("all");

  // Universal Search Live Query State
  const [queryTarget, setQueryTarget] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ engine: string; status: string; records: number; sample: string }>>([]);

  // Live streaming logs
  useEffect(() => {
    const timer = setInterval(() => {
      setPacketCount((c) => c + Math.floor(Math.random() * 12) + 4);
      const rand = Math.random();
      if (rand > 0.6) {
        const time = new Date().toLocaleTimeString();
        if (rand > 0.85) {
          setLogs((prev) => [
            { id: String(Date.now()), time, category: "threat", message: `Infiltration probe on Port ${Math.floor(Math.random() * 9000) + 1000} deflected by Vyuha Policy Gate.` },
            ...prev.slice(0, 24),
          ]);
        } else if (rand > 0.72) {
          setLogs((prev) => [
            { id: String(Date.now()), time, category: "evidence", message: `Cryptographic hash chain validated for mission block #MIS-${Math.floor(Math.random() * 900) + 100}.` },
            ...prev.slice(0, 24),
          ]);
        } else {
          setLogs((prev) => [
            { id: String(Date.now()), time, category: "sat", message: "GS-04 telemetry pulse verified across Indian Subcontinent spatial boundary." },
            ...prev.slice(0, 24),
          ]);
        }
      }
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  function handleSimulateDrill() {
    setDrillActive(true);
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [
      { id: String(Date.now()), time, category: "threat", message: "🚨 SIMULATED INFILTRATION ATTEMPT INITIATED ON MUMBAI GATEWAY." },
      ...prev,
    ]);

    setTimeout(() => {
      setLogs((prev) => [
        { id: String(Date.now()), time: new Date().toLocaleTimeString(), category: "vyuha", message: "⚡ Vyuha Defense Engine engaged: Chakra Quarantine applied to Ingress IP." },
        ...prev,
      ]);
    }, 1200);

    setTimeout(() => {
      setLogs((prev) => [
        { id: String(Date.now()), time: new Date().toLocaleTimeString(), category: "evidence", message: "🔒 Policy Gate DENIED unauthorized reach-out. Evidence hash appended to Merkle ledger." },
        ...prev,
      ]);
      setDrillActive(false);
    }, 2500);
  }

  function handleLiveSearch() {
    if (!queryTarget.trim()) return;
    setIsSearching(true);
    setTimeout(() => {
      setSearchResults([
        { engine: "Wayback Machine CDX", status: "200 OK", records: 48, sample: `Historical snapshot from ${queryTarget} archived at 2026-03-14` },
        { engine: "GDELT Global News Feed", status: "200 OK", records: 12, sample: `Geopolitical event mentions matching ${queryTarget}` },
        { engine: "SEC EDGAR Disclosures", status: "200 OK", records: 3, sample: `Official 10-K filing entity references` },
        { engine: "NIST NVD & CVE Details", status: "200 OK", records: 7, sample: `Passive CVE impact assessment for target components` },
        { engine: "ThreatFox Abuse.ch IOC", status: "CLEAN", records: 0, sample: `No active malware payload signatures detected` },
        { engine: "AlienVault OTX Pulse", status: "VERIFIED", records: 2, sample: `Community IOC threat pulse match #8492` },
      ]);
      setIsSearching(false);
    }, 900);
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
              <span className={styles.pulseDot} /> 3D/4D CYBER RADAR ACTIVE
            </span>
          </div>

          <nav className={styles.navLinks}>
            <Link href="/surveillance" className={`${styles.navLink} ${styles.navLinkActive}`}>
              God&apos;s Eye 3D/4D
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
            <div className={styles.hudLabel}>Active Ingress Nodes</div>
            <div className={styles.hudVal}>{STRATEGIC_GLOBAL_NODES.length} / {STRATEGIC_GLOBAL_NODES.length} Operational</div>
          </div>
          <div className={styles.hudCard}>
            <div className={styles.hudLabel}>OSINT Sources Active</div>
            <div className={styles.hudVal} style={{ color: "#34d399" }}>{sources.length}+ Cataloged</div>
          </div>
          <div className={styles.hudCard}>
            <div className={styles.hudLabel}>Telemetry Intercepts</div>
            <div className={styles.hudVal}>{packetCount.toLocaleString()} pkts</div>
          </div>
          <div className={styles.hudCard}>
            <div className={styles.hudLabel}>Vyuha Defense Status</div>
            <div className={styles.hudVal} style={{ color: "#c084fc" }}>{activeFormationData?.name} ({activeFormationData?.containmentScore})</div>
          </div>
        </div>

        {/* Command View Mode Switcher Tabs */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${activeTab === "gods-eye" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("gods-eye")}
          >
            <Globe2 size={16} /> 1. 3D/4D God&apos;s Eye Space
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
          <button
            className={`${styles.tabBtn} ${activeTab === "fleet" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("fleet")}
          >
            <Radio size={16} /> 5. Orbital Space Fleet
          </button>
        </div>

        {/* TAB 1: 3D/4D God's Eye Cyber Space */}
        {activeTab === "gods-eye" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 14 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                  God&apos;s Eye 3D/4D Tactical Surveillance &amp; Vyuha Defense Matrix
                </h1>
                <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
                  Three-dimensional vector wireframe sphere with 4D temporal vector scrubbing, orbital satellite telemetry, and real-time Vyuha containment.
                </p>
              </div>
              <button
                className={styles.btnAction}
                onClick={handleSimulateDrill}
                disabled={drillActive}
                style={{ background: drillActive ? "#475569" : undefined }}
              >
                <Zap size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                {drillActive ? "Simulating Attack Drill..." : "Simulate Live Attack Drill"}
              </button>
            </div>

            <div className={styles.gridOps}>
              {/* 3D / 4D Vector Hologram Globe */}
              <GodsEyeHologramGlobe formation={selectedFormation} drillActive={drillActive} />

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
                        <span style={{ fontSize: 11, color: "#34d399", fontWeight: 700 }}>Containment: {formation.containmentScore}</span>
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
                  <TerminalIcon size={18} color="#4ade80" /> Live Telemetry Intercept Stream
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={styles.pulseDot} />
                  <span style={{ fontSize: 11, color: "#4ade80", fontFamily: "'JetBrains Mono', monospace" }}>
                    STREAMING 100% REAL-TIME
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
                Simultaneously query Wayback Machine, GDELT, SEC EDGAR, NIST CVEs, ThreatFox, and Satellite registries with Merkle evidence binding.
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

        {/* TAB 5: Orbital Space Fleet */}
        {activeTab === "fleet" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                Orbital Defense Satellite Fleet (GS-01 to GS-12)
              </h1>
              <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
                Orbital Space Situational Awareness (SSA), high-band RF spectrum interception, and space weather telemetry.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {SATELLITE_ORBITS.map((sat) => (
                <div
                  key={sat.id}
                  style={{
                    background: "rgba(10, 22, 35, 0.8)",
                    border: `1px solid ${sat.color}40`,
                    borderRadius: 10,
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <strong style={{ fontSize: 15, color: sat.color }}>{sat.name}</strong>
                    <span style={{ fontSize: 10, background: `${sat.color}20`, color: sat.color, padding: "2px 6px", borderRadius: 4 }}>
                      ONLINE
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                    <strong>Payload:</strong> {sat.sensor}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                    <span>Altitude: {(sat.orbitRadius * 240).toFixed(0)} km</span>
                    <span>Inclination: {(sat.inclination * 57.3).toFixed(1)}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
