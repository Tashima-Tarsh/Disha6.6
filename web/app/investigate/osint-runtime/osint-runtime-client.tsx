"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle, AlertTriangle, XCircle, ShieldAlert, BookOpen, RefreshCw, X, Play } from "lucide-react";
import styles from "./osint-runtime.module.css";
import type { OsintToolRecord, OsintRuntimeMetrics } from "@/lib/unified/osint-runtime-service";

export function OsintRuntimeClient() {
  const [tools, setTools] = useState<OsintToolRecord[]>([]);
  const [metrics, setMetrics] = useState<OsintRuntimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRuntime, setSelectedRuntime] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [smokingToolId, setSmokingToolId] = useState<string | null>(null);
  const [smokingAll, setSmokingAll] = useState(false);
  const [detailTool, setDetailTool] = useState<OsintToolRecord | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [toolsRes, healthRes] = await Promise.all([
        fetch("/api/v1/osint/tools?limit=600"),
        fetch("/api/v1/osint/tools/health"),
      ]);

      if (toolsRes.ok) {
        const data = await toolsRes.json();
        setTools(data.tools || []);
      }

      if (healthRes.ok) {
        const hData = await healthRes.json();
        setMetrics(hData);
      }
    } catch (err) {
      console.error("Failed to load OSINT runtime status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSmokeTest = async (toolId: string) => {
    try {
      setSmokingToolId(toolId);
      const res = await fetch(`/api/v1/osint/tools/${toolId}/smoke`, {
        method: "POST",
      });
      if (res.ok) {
        const result = await res.json();
        setTools((prev) =>
          prev.map((t) => {
            if (t.toolId === toolId) {
              return {
                ...t,
                smokeResult: result.smokeResult,
                status: result.smokeResult?.success ? "HEALTHY" : (result.smokeResult?.error?.includes("Requires") ? "AUTH_REQUIRED" : "DEGRADED"),
                lastSmokeTested: new Date().toISOString(),
              };
            }
            return t;
          }),
        );
      }
    } catch (err) {
      console.error(`Failed to smoke test ${toolId}:`, err);
    } finally {
      setSmokingToolId(null);
    }
  };

  const handleSmokeAll = async () => {
    try {
      setSmokingAll(true);
      const res = await fetch("/api/v1/osint/tools/smoke-all", {
        method: "POST",
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to execute batch smoke test:", err);
    } finally {
      setSmokingAll(false);
    }
  };

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          tool.name.toLowerCase().includes(q) ||
          tool.toolId.toLowerCase().includes(q) ||
          tool.fullName.toLowerCase().includes(q) ||
          tool.description.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (selectedCategory !== "all" && tool.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      if (selectedRuntime !== "all" && tool.runtimeType.toLowerCase() !== selectedRuntime.toLowerCase()) {
        return false;
      }

      if (selectedStatus !== "all" && tool.status.toUpperCase() !== selectedStatus.toUpperCase()) {
        return false;
      }

      return true;
    });
  }, [tools, search, selectedCategory, selectedRuntime, selectedStatus]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    tools.forEach((t) => { if (t.category) set.add(t.category); });
    return Array.from(set).sort();
  }, [tools]);

  const runtimes = useMemo(() => {
    const set = new Set<string>();
    tools.forEach((t) => { if (t.runtimeType) set.add(t.runtimeType); });
    return Array.from(set).sort();
  }, [tools]);

  const getStatusBadge = (status: string) => {
    const upper = status.toUpperCase();
    if (upper === "HEALTHY" || upper === "INSTALLED") {
      return <span className={`${styles.statusBadge} ${styles.statusHealthy}`}><CheckCircle size={10} style={{ display: "inline", marginRight: "3px" }} /> {status}</span>;
    }
    if (upper === "DEGRADED" || upper === "EXECUTION_FAILED" || upper === "BUILD_FAILED") {
      return <span className={`${styles.statusBadge} ${styles.statusDegraded}`}><AlertTriangle size={10} style={{ display: "inline", marginRight: "3px" }} /> {status}</span>;
    }
    if (upper === "AUTH_REQUIRED" || upper === "API_KEY_REQUIRED") {
      return <span className={`${styles.statusBadge} ${styles.statusAuth}`}><ShieldAlert size={10} style={{ display: "inline", marginRight: "3px" }} /> AUTH REQUIRED</span>;
    }
    if (upper === "GUI_ONLY" || upper === "DATASET_ONLY" || upper === "LIBRARY_ONLY") {
      return <span className={`${styles.statusBadge} ${styles.statusReference}`}><BookOpen size={10} style={{ display: "inline", marginRight: "3px" }} /> {status}</span>;
    }
    return <span className={`${styles.statusBadge} ${styles.statusUnconfigured}`}><XCircle size={10} style={{ display: "inline", marginRight: "3px" }} /> {status}</span>;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.brandGroup}>
          <Link href="/investigate" className={styles.brand}>
            <span>DISHA 6.6</span>
          </Link>
          <span className={styles.badge}>OSINT Runtime Control Plane</span>
        </div>
        <nav className={styles.navLinks}>
          <Link href="/investigate" className={styles.navLink}>Investigation Universe</Link>
          <Link href="/operations" className={styles.navLink}>Operations</Link>
          <Link href="/system" className={styles.navLink}>System</Link>
        </nav>
      </header>

      <main className={styles.content}>
        <section className={styles.titleSection}>
          <h1>OSINT Upstream Runtime Matrix</h1>
          <p className={styles.subtitle}>
            Authoritative registry and execution status for all cataloged OSINT repositories across DISHA 6.6.
          </p>
          <div className={styles.policyNotice}>
            <strong>ZERO MOCK POLICY:</strong> Upstreams are verified against live GitHub repositories. Missing tools or unconfigured credentials truthfully report <code>UNCONFIGURED</code> or <code>AUTH_REQUIRED</code>. No fake fork URLs or simulated data are permitted.
          </div>
        </section>

        {metrics && (
          <section className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Total Cataloged</span>
              <span className={styles.metricValue}>{metrics.total}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Verified Forks</span>
              <span className={styles.metricValue} style={{ color: "#38bdf8" }}>{metrics.forked}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Fork Pending</span>
              <span className={styles.metricValue} style={{ color: "#94a3b8" }}>{metrics.pendingFork}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Upstream Verified</span>
              <span className={styles.metricValue} style={{ color: "#38bdf8" }}>{metrics.upstreamVerified}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Healthy Tools</span>
              <span className={styles.metricValue} style={{ color: "#4ade80" }}>{metrics.healthy}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Auth Required</span>
              <span className={styles.metricValue} style={{ color: "#c084fc" }}>{metrics.authRequired}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Unconfigured</span>
              <span className={styles.metricValue} style={{ color: "#facc15" }}>{metrics.unconfigured}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Reference / Datasets</span>
              <span className={styles.metricValue} style={{ color: "#60a5fa" }}>{metrics.guiOnly + metrics.datasetOnly + metrics.libraryOnly}</span>
            </div>
          </section>
        )}

        <section className={styles.controls}>
          <div className={styles.filters}>
            <input
              type="text"
              placeholder="Search by name, tool ID, or description..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className={styles.selectInput}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories ({tools.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>

            <select
              className={styles.selectInput}
              value={selectedRuntime}
              onChange={(e) => setSelectedRuntime(e.target.value)}
            >
              <option value="all">All Runtimes</option>
              {runtimes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              className={styles.selectInput}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="HEALTHY">Healthy</option>
              <option value="AUTH_REQUIRED">Auth Required</option>
              <option value="UNCONFIGURED">Unconfigured</option>
              <option value="DEGRADED">Degraded</option>
              <option value="GUI_ONLY">GUI Only</option>
              <option value="DATASET_ONLY">Dataset Only</option>
              <option value="LIBRARY_ONLY">Library Only</option>
            </select>
          </div>

          <button
            className={styles.batchButton}
            onClick={handleSmokeAll}
            disabled={smokingAll || loading}
          >
            <RefreshCw size={14} className={smokingAll ? "animate-spin" : ""} />
            {smokingAll ? "Running Probes..." : "Smoke Core Tools"}
          </button>
        </section>

        <section className={styles.tableWrapper}>
          <table className={styles.matrixTable}>
            <thead>
              <tr>
                <th>Tool</th>
                <th>Category</th>
                <th>Runtime</th>
                <th>Upstream Repository</th>
                <th>Fork Status</th>
                <th>SHA / Branch</th>
                <th>Execution Class</th>
                <th>Status</th>
                <th>Smoke / Latency</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTools.map((tool) => (
                <tr key={tool.toolId}>
                  <td>
                    <div className={styles.toolNameCell}>
                      <span className={styles.toolTitle}>{tool.name}</span>
                      <span className={styles.toolId}>{tool.toolId}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.badge}>{tool.category}</span>
                  </td>
                  <td>
                    <code>{tool.runtimeType}</code>
                  </td>
                  <td>
                    <a
                      href={tool.upstreamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      {tool.fullName} <ArrowUpRight size={12} />
                    </a>
                  </td>
                  <td>
                    {tool.forkUrl ? (
                      <a
                        href={tool.forkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                      >
                        Tashima-Tarsh <ArrowUpRight size={12} />
                      </a>
                    ) : (
                      <span style={{ color: "#64748b" }}>Pending</span>
                    )}
                  </td>
                  <td>
                    <code style={{ fontSize: "0.75rem" }}>
                      {tool.pinnedSha
                        ? `pin:${tool.pinnedSha.slice(0, 7)}`
                        : tool.upstreamSha
                          ? `up:${tool.upstreamSha.slice(0, 7)}`
                          : tool.defaultBranch}
                    </code>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{tool.executionClass}</span>
                  </td>
                  <td>{getStatusBadge(tool.status)}</td>
                  <td>
                    {tool.smokeResult ? (
                      tool.smokeResult.latencyMs !== undefined ? (
                        <span style={{ fontSize: "0.8rem", color: "#4ade80" }}>
                          {tool.smokeResult.latencyMs}ms
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                          Verified
                        </span>
                      )
                    ) : (
                      <span style={{ color: "#64748b" }}>Not probed</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className={styles.smokeBtn}
                        onClick={() => handleSmokeTest(tool.toolId)}
                        disabled={smokingToolId === tool.toolId}
                      >
                        {smokingToolId === tool.toolId ? "Probing..." : "Smoke"}
                      </button>
                      <button
                        className={styles.smokeBtn}
                        style={{ background: "#0b0f17" }}
                        onClick={() => setDetailTool(tool)}
                      >
                        Inspect
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      {detailTool && (
        <div className={styles.detailModal} onClick={() => setDetailTool(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0, color: "#f8fafc" }}>{detailTool.name}</h3>
                <small style={{ color: "#64748b" }}>{detailTool.fullName} ({detailTool.toolId})</small>
              </div>
              <button className={styles.closeBtn} onClick={() => setDetailTool(null)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p><strong>Description:</strong> {detailTool.description}</p>
              <p><strong>Upstream URL:</strong> <a href={detailTool.upstreamUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>{detailTool.upstreamUrl} <ArrowUpRight size={12} /></a></p>
              <p><strong>Category:</strong> {detailTool.category}</p>
              <p><strong>Target Inputs:</strong> {detailTool.targetInputs?.join(", ") || "none"}</p>
              <p><strong>Runtime Type:</strong> {detailTool.runtimeType}</p>
              <p><strong>Worker Command:</strong> <code>{detailTool.workerCommand || "None (reference/library)"}</code></p>
              <p><strong>Execution Class:</strong> {detailTool.executionClass}</p>
              <p><strong>License:</strong> {detailTool.license}</p>
              <p><strong>Status:</strong> {getStatusBadge(detailTool.status)}</p>
              <p><strong>Upstream Verification:</strong> {detailTool.upstreamStatus || (detailTool.upstreamSha ? "VERIFIED" : "UNVERIFIED")}</p>
              <p><strong>Upstream SHA:</strong> <code>{detailTool.upstreamSha || "Not verified"}</code></p>
              <p><strong>Production Pin:</strong> <code>{detailTool.pinnedSha || "Not pinned"}</code></p>
              <p><strong>Upstream Verified At:</strong> {detailTool.upstreamVerifiedAt || "Not verified"}</p>
              <p><strong>Registry Updated:</strong> {detailTool.lastVerified || "N/A"}</p>
              <p><strong>Last Smoke Tested:</strong> {detailTool.lastSmokeTested || "Not probed"}</p>
              {detailTool.smokeResult && (
                <div>
                  <strong>Smoke Probe Output / Result:</strong>
                  <pre className={styles.codeSnippet}>
                    {JSON.stringify(detailTool.smokeResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
