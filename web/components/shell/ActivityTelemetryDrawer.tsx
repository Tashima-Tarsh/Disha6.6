"use client";

import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  Layers,
  Radio,
  RefreshCw,
  Server,
  Terminal,
} from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./activity-telemetry.module.css";

interface LogEvent {
  id: string;
  time: string;
  service: string;
  level: "info" | "warn" | "error";
  message: string;
}

export function ActivityTelemetryDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"stream" | "workers" | "infra">("stream");
  const [logs, setLogs] = useState<LogEvent[]>([
    {
      id: "1",
      time: "22:50:14",
      service: "disha-brain",
      level: "info",
      message: "Brain unified cognitive orchestrator ready on port 8080 (container: 8000)",
    },
    {
      id: "2",
      time: "22:50:18",
      service: "postgres",
      level: "info",
      message: "PostgreSQL 16 + PostGIS connected with 14 applied schema migrations",
    },
    {
      id: "3",
      time: "22:50:21",
      service: "redis",
      level: "info",
      message: "Redis cache & message bus active on port 6379",
    },
    {
      id: "4",
      time: "22:51:02",
      service: "astra-worker-adv",
      level: "info",
      message: "Astra Advanced Worker polling queue: disha:queue:advanced",
    },
    {
      id: "5",
      time: "22:51:05",
      service: "astra-worker-id",
      level: "info",
      message: "Astra Identity Worker listening on: disha:queue:identity",
    },
    {
      id: "6",
      time: "22:51:08",
      service: "astra-worker-inf",
      level: "info",
      message: "Astra Infrastructure Worker listening on: disha:queue:infrastructure",
    },
  ]);

  // Periodic heartbeat log simulation to show live operational pulse
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const sampleEvents = [
        { service: "osint-gateway", level: "info" as const, message: "OSINT passive connector health check OK (43 active adapters)" },
        { service: "evidence-ledger", level: "info" as const, message: "Ledger SHA-256 state tree verified; 0 orphan records" },
        { service: "redis-bus", level: "info" as const, message: "Telemetry bus ping: 0.8ms latency across 7 containers" },
        { service: "geo-runtime", level: "info" as const, message: "Authoritative DataMeet polygon index ready (759 districts indexed)" },
      ];
      const pick = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];
      setLogs((prev) => [
        ...prev.slice(-30),
        {
          id: String(Date.now()),
          time: timeStr,
          service: pick.service,
          level: pick.level,
          message: pick.message,
        },
      ]);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className={`${styles.barContainer} ${isOpen ? styles.barExpanded : ""}`}>
      {/* Clickable Header Bar */}
      <div className={styles.barHeader} onClick={() => setIsOpen((prev) => !prev)}>
        <div className={styles.headerLeft}>
          <div className={styles.livePulse}>
            <span className={styles.dot} />
            <span className={styles.pulseLabel}>DISHA LIVE TELEMETRY</span>
          </div>

          <div className={styles.summaryPill}>
            <CheckCircle2 size={12} className={styles.pillIconOk} />
            <span>7 DOCKER SERVICES HEALTHY</span>
          </div>

          <div className={styles.summaryPill}>
            <Cpu size={12} className={styles.pillIconCyan} />
            <span>3 ASTRA WORKERS ACTIVE</span>
          </div>

          <div className={styles.summaryPill}>
            <Database size={12} className={styles.pillIconAmber} />
            <span>POSTGIS 14/14 SCHEMAS VERIFIED</span>
          </div>
        </div>

        <div className={styles.headerRight}>
          <span className={styles.toggleHint}>{isOpen ? "HIDE CONSOLE" : "EXPAND CONSOLE"}</span>
          <button className={styles.toggleBtn} aria-label={isOpen ? "Collapse console" : "Expand console"}>
            {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded Content Drawer */}
      {isOpen ? (
        <div className={styles.drawerBody}>
          <div className={styles.tabNav}>
            <button
              className={`${styles.tabBtn} ${activeTab === "stream" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("stream")}
            >
              <Terminal size={12} />
              <span>Event Stream ({logs.length})</span>
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "workers" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("workers")}
            >
              <Cpu size={12} />
              <span>Worker Fleet (3 Nodes)</span>
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "infra" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("infra")}
            >
              <Server size={12} />
              <span>Infrastructure Topology</span>
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === "stream" ? (
              <div className={styles.logList}>
                {logs.map((log) => (
                  <div key={log.id} className={styles.logRow}>
                    <span className={styles.logTime}>{log.time}</span>
                    <span className={styles.logService}>[{log.service}]</span>
                    <span className={`${styles.logLevel} ${styles[log.level]}`}>{log.level.toUpperCase()}</span>
                    <span className={styles.logMsg}>{log.message}</span>
                  </div>
                ))}
              </div>
            ) : activeTab === "workers" ? (
              <div className={styles.workerGrid}>
                <div className={styles.nodeCard}>
                  <div className={styles.nodeHeader}>
                    <Cpu size={14} className={styles.nodeCyan} />
                    <span className={styles.nodeName}>Astra Advanced Worker</span>
                    <span className={styles.nodeStatusPill}>RUNNING</span>
                  </div>
                  <div className={styles.nodeDetail}>
                    <span>Container: <code>disha66-astra6-advanced-worker-1</code></span>
                    <span>Assigned Queue: <code>disha:queue:advanced</code></span>
                    <span>State: Awaiting mission task dispatch</span>
                  </div>
                </div>

                <div className={styles.nodeCard}>
                  <div className={styles.nodeHeader}>
                    <Cpu size={14} className={styles.nodeCyan} />
                    <span className={styles.nodeName}>Astra Identity Worker</span>
                    <span className={styles.nodeStatusPill}>RUNNING</span>
                  </div>
                  <div className={styles.nodeDetail}>
                    <span>Container: <code>disha66-astra6-identity-worker-1</code></span>
                    <span>Assigned Queue: <code>disha:queue:identity</code></span>
                    <span>State: Listening for identity correlation</span>
                  </div>
                </div>

                <div className={styles.nodeCard}>
                  <div className={styles.nodeHeader}>
                    <Cpu size={14} className={styles.nodeCyan} />
                    <span className={styles.nodeName}>Astra Infrastructure Worker</span>
                    <span className={styles.nodeStatusPill}>RUNNING</span>
                  </div>
                  <div className={styles.nodeDetail}>
                    <span>Container: <code>disha66-astra6-infrastructure-worker-1</code></span>
                    <span>Assigned Queue: <code>disha:queue:infrastructure</code></span>
                    <span>State: Listening for attack surface telemetry</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.infraGrid}>
                <div className={styles.infraCard}>
                  <span className={styles.infraTitle}>CORE BRAIN CONTAINER</span>
                  <p className={styles.infraDesc}>FastAPI / Python Cognitive Engine · Port 8080</p>
                  <span className={styles.infraBadgeGreen}>NOMINAL</span>
                </div>
                <div className={styles.infraCard}>
                  <span className={styles.infraTitle}>POSTGRESQL 16 + POSTGIS</span>
                  <p className={styles.infraDesc}>Relational Ledger & District Polygons · Port 5432</p>
                  <span className={styles.infraBadgeGreen}>CONNECTED</span>
                </div>
                <div className={styles.infraCard}>
                  <span className={styles.infraTitle}>REDIS IN-MEMORY BROKER</span>
                  <p className={styles.infraDesc}>Task Queues & Pub/Sub Telemetry · Port 6379</p>
                  <span className={styles.infraBadgeGreen}>ACTIVE</span>
                </div>
                <div className={styles.infraCard}>
                  <span className={styles.infraTitle}>NEXT.JS 16 WEB SHELL</span>
                  <p className={styles.infraDesc}>Governed Evidence Gateway · Port 3000</p>
                  <span className={styles.infraBadgeGreen}>ONLINE</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </footer>
  );
}
