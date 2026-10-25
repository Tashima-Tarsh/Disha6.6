"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Server,
  Globe,
  AlertTriangle,
  Search,
  CheckCircle,
  FileText,
  Lock,
  History,
  Terminal,
  Activity,
  PlusCircle,
} from "lucide-react";
import { DishaCommandShell } from "@/components/shell/DishaCommandShell";
import styles from "./cyber-defense.module.css";

type PrincipalView = { email: string; roles: string[] };

export function CyberDefenseClient({ principal }: { principal: PrincipalView }) {
  const [activeTab, setActiveTab] = useState<"domain_intel" | "vuln_scanner" | "asset_inventory" | "lookalikes">("domain_intel");

  // Domain Intelligence State
  const [domainQuery, setDomainQuery] = useState("example.com");
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainReport, setDomainReport] = useState<any>(null);
  const [domainError, setDomainError] = useState<string | null>(null);

  // Vulnerability Scanner State
  const [scanTarget, setScanTarget] = useState("localhost");
  const [scanType, setScanType] = useState<"baseline_configuration" | "full_authorized_scan">("baseline_configuration");
  const [approvalGrantId, setApprovalGrantId] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanReport, setScanReport] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Asset Inventory State
  const [assets, setAssets] = useState<any[]>([]);
  const [newAssetTarget, setNewAssetTarget] = useState("");
  const [newAssetType, setNewAssetType] = useState<string>("domain");
  const [newAssetOwner, setNewAssetOwner] = useState("Security Operations");

  // Lookalike State
  const [lookalikeDomain, setLookalikeDomain] = useState("nic.in");
  const [lookAlikes, setLookAlikes] = useState<any[]>([]);

  useEffect(() => {
    loadAssets();
  }, []);

  async function loadAssets() {
    try {
      const res = await fetch("/api/v1/vulnerability/assets");
      const json = await res.json();
      if (json.assets) setAssets(json.assets);
    } catch {
      // ignore
    }
  }

  async function runDomainInvestigation() {
    if (!domainQuery.trim()) return;
    setDomainLoading(true);
    setDomainError(null);
    try {
      const res = await fetch("/api/v1/domain/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domainQuery.trim(),
          includeHistorical: true,
          includeThreatIntel: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDomainError(data.message || data.error || "Investigation failed");
      } else {
        setDomainReport(data);
      }
    } catch (err: unknown) {
      setDomainError(err instanceof Error ? err.message : String(err));
    } finally {
      setDomainLoading(false);
    }
  }

  async function runVulnerabilityScan() {
    if (!scanTarget.trim()) return;
    setScanLoading(true);
    setScanError(null);
    try {
      const res = await fetch("/api/v1/vulnerability/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: scanTarget.trim(),
          scanType,
          approvalGrantId: approvalGrantId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.status === "blocked_by_policy") {
        setScanError(data.warnings?.[0] || data.error || "Target is unauthorized for security assessment.");
        setScanReport(data);
      } else {
        setScanReport(data);
      }
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : String(err));
    } finally {
      setScanLoading(false);
    }
  }

  async function registerAsset() {
    if (!newAssetTarget.trim()) return;
    try {
      const res = await fetch("/api/v1/vulnerability/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: newAssetTarget.trim(),
          assetType: newAssetType,
          owner: newAssetOwner,
          allowedTiers: ["passive_intel", "tls_config_audit", "vulnerability_scan"],
        }),
      });
      if (res.ok) {
        setNewAssetTarget("");
        await loadAssets();
      }
    } catch {
      // ignore
    }
  }

  async function generateDefenseLookAlikes() {
    if (!lookalikeDomain) return;
    try {
      const res = await fetch("/api/cyber-defense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: lookalikeDomain }),
      });
      const json = await res.json();
      if (json.lookAlikes) {
        setLookAlikes(json.lookAlikes);
      }
    } catch {
      // safe fallback
    }
  }

  return (
    <DishaCommandShell principal={principal}>
      <div className={styles.shell}>
        <main className={styles.main}>
          <header className={styles.hero}>
            <div>
              <span className={styles.kicker}>TACTICAL DEFENSE CORE</span>
              <h1 className={styles.title}>Domain Intelligence & Authorized Vulnerability Assessment</h1>
              <p className={styles.subtitle}>
                Continuous external perimeter intelligence, Certificate Transparency enumeration, authorized TLS configuration scanning, and KEV vulnerability normalization.
              </p>
            </div>
            <div className={styles.principalBadge}>
              <span>OPERATOR: {principal.email}</span>
            </div>
          </header>

          {/* Navigation Tabs */}
          <div className={styles.tabsBar}>
            <button
              onClick={() => setActiveTab("domain_intel")}
              className={`${styles.tabBtn} ${activeTab === "domain_intel" ? styles.tabActive : ""}`}
              type="button"
            >
              <Globe size={16} />
              <span>Domain Intelligence Workflow</span>
            </button>
            <button
              onClick={() => setActiveTab("vuln_scanner")}
              className={`${styles.tabBtn} ${activeTab === "vuln_scanner" ? styles.tabActive : ""}`}
              type="button"
            >
              <ShieldAlert size={16} />
              <span>Authorized Vulnerability Scanner</span>
            </button>
            <button
              onClick={() => setActiveTab("asset_inventory")}
              className={`${styles.tabBtn} ${activeTab === "asset_inventory" ? styles.tabActive : ""}`}
              type="button"
            >
              <Server size={16} />
              <span>Approved Asset Inventory</span>
            </button>
            <button
              onClick={() => setActiveTab("lookalikes")}
              className={`${styles.tabBtn} ${activeTab === "lookalikes" ? styles.tabActive : ""}`}
              type="button"
            >
              <Activity size={16} />
              <span>Phishing & Look-Alikes</span>
            </button>
          </div>

          {/* TAB 1: DOMAIN INTELLIGENCE WORKFLOW */}
          {activeTab === "domain_intel" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <Globe size={18} />
                  <h2>Integrated Domain Intelligence Investigation</h2>
                </div>
                <div className={styles.scannerRow}>
                  <input
                    type="text"
                    value={domainQuery}
                    onChange={(e) => setDomainQuery(e.target.value)}
                    placeholder="Enter target domain (e.g. example.com)"
                    className={styles.domainInput}
                  />
                  <button
                    onClick={runDomainInvestigation}
                    disabled={domainLoading}
                    className={styles.scanBtn}
                    type="button"
                  >
                    <Search size={16} />
                    <span>{domainLoading ? "Investigating..." : "Execute Investigation"}</span>
                  </button>
                </div>
                {domainError && (
                  <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 6, color: "#f87171", fontSize: 13 }}>
                    {domainError}
                  </div>
                )}
              </section>

              {domainReport && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Summary Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#101823", padding: "14px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div>
                      <strong style={{ fontSize: 18, color: "#39c7d7" }}>{domainReport.domain}</strong>
                      <div style={{ fontSize: 11, color: "#7f93a7", marginTop: 2 }}>
                        Investigation ID: {domainReport.investigationId} · Duration: {domainReport.durationMs}ms
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "#7f93a7" }}>CONFIDENCE:</span>
                      <span className={styles.badge} style={{ background: "#172535", color: "#35c78a", border: "1px solid rgba(53,199,138,0.3)" }}>
                        {domainReport.confidence}
                      </span>
                    </div>
                  </div>

                  <div className={styles.splitGrid}>
                    {/* DNS Records */}
                    <section className={styles.panel}>
                      <div className={styles.panelHead}>
                        <Server size={16} />
                        <h2>DNS Infrastructure ({domainReport.dns.records.length} Records)</h2>
                      </div>
                      <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                        {domainReport.dns.records.map((r: any, idx: number) => (
                          <div key={idx} style={{ padding: "6px 10px", background: "#172535", borderRadius: 4, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <strong style={{ color: "#39c7d7", width: 50 }}>{r.type}</strong>
                            <span style={{ fontFamily: "monospace", color: "#dce7f0", wordBreak: "break-all" }}>{r.data}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* RDAP Ownership */}
                    <section className={styles.panel}>
                      <div className={styles.panelHead}>
                        <FileText size={16} />
                        <h2>RDAP Ownership & Registration</h2>
                      </div>
                      <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div><strong>Registrar:</strong> <span style={{ color: "#7f93a7" }}>{domainReport.rdap.registrar || "Not published"}</span></div>
                        <div><strong>Registered Date:</strong> <span style={{ color: "#7f93a7" }}>{domainReport.rdap.registeredDate || "N/A"}</span></div>
                        <div><strong>Expiration Date:</strong> <span style={{ color: "#7f93a7" }}>{domainReport.rdap.expirationDate || "N/A"}</span></div>
                        <div><strong>Last Updated:</strong> <span style={{ color: "#7f93a7" }}>{domainReport.rdap.lastUpdatedDate || "N/A"}</span></div>
                        <div><strong>Status:</strong> <span style={{ color: "#35c78a" }}>{domainReport.rdap.status.join(", ") || "Active"}</span></div>
                      </div>
                    </section>
                  </div>

                  {/* Subdomains from Certificate Transparency */}
                  <section className={styles.panel}>
                    <div className={styles.panelHead}>
                      <Lock size={16} />
                      <h2>Certificate Transparency ({domainReport.certificates.discoveredSubdomains.length} Discovered Subdomains)</h2>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 180, overflowY: "auto" }}>
                      {domainReport.certificates.discoveredSubdomains.map((sub: string, idx: number) => (
                        <span key={idx} style={{ background: "#172535", padding: "4px 10px", borderRadius: 4, fontSize: 11, fontFamily: "monospace", color: "#39c7d7" }}>
                          {sub}
                        </span>
                      ))}
                    </div>
                  </section>

                  {/* Historical Web Archive */}
                  <section className={styles.panel}>
                    <div className={styles.panelHead}>
                      <History size={16} />
                      <h2>Internet Archive Historical Timeline ({domainReport.historical.snapshotCount} Snapshots)</h2>
                    </div>
                    <div style={{ fontSize: 12, display: "flex", gap: 24, marginBottom: 12 }}>
                      <div>First Seen: <strong style={{ color: "#39c7d7" }}>{domainReport.historical.firstSeen || "N/A"}</strong></div>
                      <div>Last Seen: <strong style={{ color: "#39c7d7" }}>{domainReport.historical.lastSeen || "N/A"}</strong></div>
                    </div>
                  </section>

                  {/* Provenance */}
                  <div className={styles.provenancePill}>
                    Cryptographic SHA-256 Provenance Hash: {domainReport.provenanceHash}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUTHORIZED VULNERABILITY SCANNER */}
          {activeTab === "vuln_scanner" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <ShieldAlert size={18} />
                  <h2>Authorized Target Vulnerability Assessment</h2>
                </div>
                <div className={styles.scanForm}>
                  <div className={styles.formGrid}>
                    <input
                      type="text"
                      value={scanTarget}
                      onChange={(e) => setScanTarget(e.target.value)}
                      placeholder="Target domain or host (e.g. localhost, disha.local)"
                      className={styles.domainInput}
                    />
                    <select
                      value={scanType}
                      onChange={(e: any) => setScanType(e.target.value)}
                      className={styles.selectInput}
                    >
                      <option value="baseline_configuration">Baseline TLS & Header Audit</option>
                      <option value="full_authorized_scan">Full Authorized Scan (Nuclei)</option>
                    </select>
                    <input
                      type="text"
                      value={approvalGrantId}
                      onChange={(e) => setApprovalGrantId(e.target.value)}
                      placeholder="Approval Grant ID (optional if in inventory)"
                      className={styles.domainInput}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <small style={{ color: "#7f93a7" }}>
                      * Target must exist in Approved Asset Inventory or match a valid administrative grant. Client booleans cannot bypass policy.
                    </small>
                    <button
                      onClick={runVulnerabilityScan}
                      disabled={scanLoading}
                      className={styles.scanBtn}
                      type="button"
                    >
                      <ShieldAlert size={16} />
                      <span>{scanLoading ? "Scanning..." : "Launch Authorized Scan"}</span>
                    </button>
                  </div>
                </div>
                {scanError && (
                  <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 6, color: "#f87171", fontSize: 13 }}>
                    <strong>Access Blocked:</strong> {scanError}
                  </div>
                )}
              </section>

              {scanReport && scanReport.status !== "blocked_by_policy" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Vulnerability Summary Counters */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                    <div className={styles.statCard}>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>{scanReport.summary.critical}</div>
                        <div style={{ fontSize: 11, color: "#7f93a7" }}>Critical</div>
                      </div>
                    </div>
                    <div className={styles.statCard}>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#f97316" }}>{scanReport.summary.high}</div>
                        <div style={{ fontSize: 11, color: "#7f93a7" }}>High</div>
                      </div>
                    </div>
                    <div className={styles.statCard}>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>{scanReport.summary.medium}</div>
                        <div style={{ fontSize: 11, color: "#7f93a7" }}>Medium</div>
                      </div>
                    </div>
                    <div className={styles.statCard}>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>{scanReport.summary.low}</div>
                        <div style={{ fontSize: 11, color: "#7f93a7" }}>Low</div>
                      </div>
                    </div>
                    <div className={styles.statCard}>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#60a5fa" }}>{scanReport.summary.informational}</div>
                        <div style={{ fontSize: 11, color: "#7f93a7" }}>Info</div>
                      </div>
                    </div>
                  </div>

                  {/* TLS Handshake metadata */}
                  {scanReport.tlsAudit && (
                    <section className={styles.panel}>
                      <div className={styles.panelHead}>
                        <Lock size={16} />
                        <h2>TLS Handshake & Cryptographic Profile</h2>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, fontSize: 12 }}>
                        <div>Protocol: <strong style={{ color: "#35c78a" }}>{scanReport.tlsAudit.tlsVersion || "N/A"}</strong></div>
                        <div>Cipher: <strong style={{ color: "#39c7d7" }}>{scanReport.tlsAudit.cipherSuite || "N/A"}</strong></div>
                        <div>Cert Days Remaining: <strong style={{ color: "#d5a75b" }}>{scanReport.tlsAudit.certificate?.daysUntilExpiration ?? "N/A"}</strong></div>
                      </div>
                    </section>
                  )}

                  {/* Normalized Findings List */}
                  <section className={styles.panel}>
                    <div className={styles.panelHead}>
                      <ShieldAlert size={16} />
                      <h2>Normalized Vulnerability Findings ({scanReport.findings.length})</h2>
                    </div>
                    <div className={styles.findingsList}>
                      {scanReport.findings.length === 0 ? (
                        <div className={styles.emptyState}>
                          <CheckCircle size={20} />
                          <span>No vulnerabilities or configuration weaknesses identified on target.</span>
                        </div>
                      ) : (
                        scanReport.findings.map((f: any) => (
                          <div key={f.findingId} className={styles.findingCard}>
                            <div className={styles.findingHeader}>
                              <div className={styles.findingTitle}>{f.title}</div>
                              <span
                                className={
                                  f.cvssSeverity === "CRITICAL"
                                    ? styles.badgeCritical
                                    : f.cvssSeverity === "HIGH"
                                    ? styles.badgeHigh
                                    : f.cvssSeverity === "MEDIUM"
                                    ? styles.badgeMedium
                                    : f.cvssSeverity === "LOW"
                                    ? styles.badgeLow
                                    : styles.badgeInfo
                                }
                              >
                                {f.cvssSeverity} {f.cvssScore ? `(${f.cvssScore})` : ""}
                              </span>
                            </div>
                            <div className={styles.findingMeta}>
                              <span>Asset: {f.affectedAsset}</span>
                              {f.cweId && <span>{f.cweId}</span>}
                              {f.cveId && <span style={{ color: "#ef4444", fontWeight: 700 }}>{f.cveId}</span>}
                              {f.inCisaKev && <span className={styles.kevPill}>CISA KEV</span>}
                              {f.owaspCategory && <span>{f.owaspCategory}</span>}
                              <span>Status: {f.validationStatus}</span>
                            </div>
                            <div className={styles.evidenceBox}>
                              <strong>Evidence:</strong> {f.evidence}
                            </div>
                            <div className={styles.remediationBox}>
                              <strong>Remediation:</strong> {f.remediationGuidance}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: APPROVED ASSET INVENTORY */}
          {activeTab === "asset_inventory" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <Server size={18} />
                  <h2>Server-Side Approved Asset Inventory ({assets.length})</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr 1fr", gap: 8 }}>
                    <input
                      type="text"
                      value={newAssetTarget}
                      onChange={(e) => setNewAssetTarget(e.target.value)}
                      placeholder="Add approved asset target (domain/host)"
                      className={styles.domainInput}
                    />
                    <select
                      value={newAssetType}
                      onChange={(e) => setNewAssetType(e.target.value)}
                      className={styles.selectInput}
                    >
                      <option value="domain">Domain</option>
                      <option value="subdomain">Subdomain</option>
                      <option value="ip">IP Address</option>
                      <option value="url">URL</option>
                    </select>
                    <input
                      type="text"
                      value={newAssetOwner}
                      onChange={(e) => setNewAssetOwner(e.target.value)}
                      placeholder="Owner team or org"
                      className={styles.domainInput}
                    />
                    <button onClick={registerAsset} className={styles.scanBtn} type="button">
                      <PlusCircle size={16} />
                      <span>Add Asset</span>
                    </button>
                  </div>
                </div>

                <div className={styles.tableWrapper} style={{ marginTop: 16 }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Target</th>
                        <th>Type</th>
                        <th>Owner</th>
                        <th>Allowed Tiers</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((a) => (
                        <tr key={a.assetId}>
                          <td style={{ fontWeight: 700, color: "#39c7d7" }}>{a.target}</td>
                          <td>{a.assetType}</td>
                          <td>{a.owner}</td>
                          <td style={{ fontSize: 11, color: "#94a3b8" }}>{a.allowedTiers.join(", ")}</td>
                          <td>
                            <span style={{ color: "#35c78a", fontWeight: 600 }}>ACTIVE</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: LOOKALIKES & PHISHING DEFENSE */}
          {activeTab === "lookalikes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <Globe size={18} />
                  <h2>Defensive Look-Alike & Phishing Infrastructure Detection</h2>
                </div>
                <div className={styles.scannerRow}>
                  <input
                    type="text"
                    value={lookalikeDomain}
                    onChange={(e) => setLookalikeDomain(e.target.value)}
                    placeholder="Enter institutional domain (e.g. nic.in)"
                    className={styles.domainInput}
                  />
                  <button onClick={generateDefenseLookAlikes} className={styles.scanBtn} type="button">
                    <Search size={16} />
                    <span>Analyze Defense Surface</span>
                  </button>
                </div>

                {lookAlikes.length > 0 && (
                  <div className={styles.lookAlikeTable}>
                    <div className={styles.tableHead}>
                      <span>Look-Alike Domain</span>
                      <span>Variation</span>
                      <span>Risk Context</span>
                    </div>
                    {lookAlikes.map((la, idx) => (
                      <div key={idx} className={styles.tableRow}>
                        <strong className={styles.domainText}>{la.lookAlikeDomain}</strong>
                        <span className={styles.badge}>{la.variationType}</span>
                        <span className={styles.descText}>{la.riskDescription}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </DishaCommandShell>
  );
}
