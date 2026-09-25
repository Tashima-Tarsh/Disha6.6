"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Crosshair,
  Database,
  Globe,
  Radio,
  Satellite,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal as TerminalIcon,
  Zap,
} from "lucide-react";

import { surveillanceTools } from "@/lib/surveillance/tool-registry";
import type { OperationalFeatureCollection, OperationalGeoFeature } from "@/lib/geospatial/contracts";
import styles from "./surveillance.module.css";

const GeospatialCommandMap = dynamic(
  () => import("@/components/geospatial/GeospatialCommandMap").then((m) => m.GeospatialCommandMap),
  { ssr: false, loading: () => <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>Initializing Tactical Map Radar...</div> }
);

type LogEntry = {
  id: string;
  time: string;
  category: "threat" | "vyuha" | "evidence" | "sat";
  message: string;
};

const VYUHA_FORMATIONS = [
  { id: "chakra", name: "Chakra Vyuha", desc: "Multi-layered dynamic containment and honeypot isolation.", activeThreats: 3, containmentScore: "98.4%" },
  { id: "kurma", name: "Kurma Vyuha", desc: "Hardened perimeter lockdown with cryptographic ingress gating.", activeThreats: 1, containmentScore: "99.9%" },
  { id: "padma", name: "Padma Vyuha", desc: "Deception decoy lattice with automated payload diversion.", activeThreats: 5, containmentScore: "94.2%" },
  { id: "garuda", name: "Garuda Vyuha", desc: "High-speed aerial and orbital satellite sensor synchronization.", activeThreats: 0, containmentScore: "96.8%" },
];

export function SurveillanceClient({ initialGeo }: { initialGeo: OperationalFeatureCollection }) {
  const [selectedFormation, setSelectedFormation] = useState("chakra");
  const [activeNode, setActiveNode] = useState<string | null>("geo-delhi-01");
  const [packetCount, setPacketCount] = useState(14820);
  const [drillActive, setDrillActive] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: "1", time: new Date().toLocaleTimeString(), category: "vyuha", message: "Vyuha Chakra Formation actively shielding Mumbai Subsea & Delhi Core nodes." },
    { id: "2", time: new Date(Date.now() - 5000).toLocaleTimeString(), category: "evidence", message: "Evidence Block #9482 sealed with Merkle Root hash [0x7f4a...e12d]." },
    { id: "3", time: new Date(Date.now() - 12000).toLocaleTimeString(), category: "threat", message: "Port sweep intercepted from ASN 4921 -> Trapped in Padma Decoy Array." },
    { id: "4", time: new Date(Date.now() - 24000).toLocaleTimeString(), category: "sat", message: "Orbital Satellite GS-04 pass synchronized -> 12 strategic ground pins refreshed." },
  ]);

  // Live streaming logs
  useEffect(() => {
    const timer = setInterval(() => {
      setPacketCount((c) => c + Math.floor(Math.random() * 8) + 3);
      const rand = Math.random();
      if (rand > 0.6) {
        const time = new Date().toLocaleTimeString();
        if (rand > 0.85) {
          setLogs((prev) => [
            { id: String(Date.now()), time, category: "threat", message: Infiltration probe on Port  deflected by Vyuha Policy Gate. },
            ...prev.slice(0, 19),
          ]);
        } else if (rand > 0.72) {
          setLogs((prev) => [
            { id: String(Date.now()), time, category: "evidence", message: Cryptographic hash chain validated for mission block #MIS-. },
            ...prev.slice(0, 19),
          ]);
        } else {
          setLogs((prev) => [
            { id: String(Date.now()), time, category: "sat", message: GS-04 telemetry pulse verified across Indian Subcontinent spatial boundary. },
            ...prev.slice(0, 19),
          ]);
        }
      }
    }, 2800);
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
        { id: String(Date.now()), time: new Date().toLocaleTimeString(), category: "evidence", message: "🔒 Policy Gate DENIED unauthorized reach-out. Evidence hash appended to ledger." },
        ...prev,
      ]);
      setDrillActive(false);
    }, 2500);
  }

  const activeFormationData = VYUHA_FORMATIONS.find((f) => f.id === selectedFormation);

  return (
    <main className={styles.container}>
      <div className={styles.shell}>
        {/* Top Header */}
        <header className={styles.topBar}>
          <div className={styles.brandGroup}>
            <Link href="/dashboard" style={{ color: "#38bdf8", display: "flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 13 }}>
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            <span className={styles.radarBadge}>
              <span className={styles.pulseDot} /> God's Eye Live Radar
            </span>
          </div>

          <div className={styles.hudMetrics}>
            <div className={styles.hudCard}>
              <div className={styles.hudLabel}>Active Ingress Nodes</div>
              <div className={styles.hudVal}>12 / 12 Operational</div>
            </div>
            <div className={styles.hudCard}>
              <div className={styles.hudLabel}>Telemetry Intercepts</div>
              <div className={styles.hudVal}>{packetCount.toLocaleString()} pkts</div>
            </div>
            <div className={styles.hudCard}>
              <div className={styles.hudLabel}>Vyuha Status</div>
              <div className={styles.hudVal} style={{ color: "#c084fc" }}>{activeFormationData?.name}</div>
            </div>
            <div className={styles.hudCard}>
              <div className={styles.hudLabel}>Policy Gate</div>
              <div className={styles.hudVal} style={{ color: "#34d399" }}>100% Gated</div>
            </div>
          </div>
        </header>

        {/* Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 className={styles.titleMain}>God's Eye Tactical Surveillance & Cyber Command</h1>
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 14 }}>
              Real-time geospatial intelligence, passive reconnaissance intercept, and No-First-Use Vyuha cyber defense posture.
            </p>
          </div>
          <button className={styles.btnAction} onClick={handleSimulateDrill} disabled={drillActive} style={{ background: drillActive ? "#475569" : undefined }}>
            <Zap size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
            {drillActive ? "Simulating Attack Drill..." : "Simulate Live Attack Drill"}
          </button>
        </div>

        {/* Tactical Grid: Map & Vyuha Formation Controller */}
        <div className={styles.gridOps}>
          {/* Tactical Map */}
          <section className={styles.mapPanel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>
                <Globe size={18} color="#38bdf8" /> Admitted Geospatial Grid & Threat Nodes
              </div>
              <div style={{ fontSize: 12, color: "#64748b", fontFamily: "JetBrains Mono, monospace" }}>
                LAT: 22.5937° N | LON: 78.9629° E
              </div>
            </div>
            <div className={styles.mapContainer}>
              <GeospatialCommandMap
                features={initialGeo}
                selectedFeatureId={activeNode}
                onSelectFeature={(feature: OperationalGeoFeature) => setActiveNode(feature.properties.featureId)}
              />
              <div className={styles.tacticalOverlay}>
                <Crosshair size={12} style={{ display: "inline", marginRight: 4 }} />
                TARGET LOCK: {activeNode ? initialGeo.features.find((f) => f.properties.featureId === activeNode)?.properties.name ?? activeNode : "SELECT NODE"}
              </div>
            </div>
          </section>

          {/* Vyuha Cyber Formations */}
          <section className={styles.vyuhaConsole}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle} style={{ color: "#d8b4fe" }}>
                <Shield size={18} color="#c084fc" /> Vyuha Defense Controller
              </div>
              <span style={{ fontSize: 11, background: "rgba(168, 85, 247, 0.2)", color: "#d8b4fe", padding: "2px 8px", borderRadius: 4 }}>
                NFU COMPLIANT
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
              Select a defensive tactical posture. Actions remain strictly proposal-only until verified by the policy gate.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {VYUHA_FORMATIONS.map((formation) => (
                <button
                  key={formation.id}
                  className={${styles.formationBtn} }
                  onClick={() => {
                    setSelectedFormation(formation.id);
                    const time = new Date().toLocaleTimeString();
                    setLogs((prev) => [
                      { id: String(Date.now()), time, category: "vyuha", message: Formation switched to :  },
                      ...prev,
                    ]);
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <strong style={{ fontSize: 14 }}>{formation.name}</strong>
                    <span style={{ fontSize: 11, color: "#34d399" }}>Score: {formation.containmentScore}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{formation.desc}</div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Live Intercept & Packet Terminal */}
        <section className={styles.terminalPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle} style={{ color: "#4ade80" }}>
              <TerminalIcon size={18} color="#4ade80" /> Live Telemetry Intercept Stream
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className={styles.pulseDot} />
              <span style={{ fontSize: 11, color: "#4ade80" }}>STREAMING 100% REAL-TIME</span>
            </div>
          </div>
          <div className={styles.terminalLogs}>
            {logs.map((log) => (
              <div key={log.id} className={styles.logLine}>
                <span className={styles.logTime}>[{log.time}]</span>
                <span
                  className={${styles.logBadge} }
                >
                  {log.category.toUpperCase()}
                </span>
                <span style={{ color: "#e2e8f0" }}>{log.message}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Surveillance & Forensic Tool Catalog */}
        <section>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <Radio size={18} color="#38bdf8" /> Governed Surveillance & Forensic Adapters
            </div>
            <span style={{ fontSize: 12, color: "#64748b" }}>{surveillanceTools.length} Registered Modules</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {surveillanceTools.map((tool) => (
              <div key={tool.id} style={{ background: "rgba(10, 22, 35, 0.7)", border: "1px solid rgba(56, 189, 248, 0.15)", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 15, color: "#f8fafc" }}>{tool.name}</h3>
                  <span style={{ fontSize: 10, background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" }}>
                    {tool.status}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4, margin: "0 0 10px" }}>{tool.purpose}</p>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                  <span>Upstream: {tool.upstream}</span>
                  <span style={{ color: "#34d399" }}>{tool.integrationMode}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
