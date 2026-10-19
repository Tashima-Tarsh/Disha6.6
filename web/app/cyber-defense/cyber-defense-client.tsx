"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Server,
  Key,
  Globe,
  AlertTriangle,
  FileCode,
  Search,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { DishaCommandShell } from "@/components/shell/DishaCommandShell";
import styles from "./cyber-defense.module.css";

type PrincipalView = { email: string; roles: string[] };

export function CyberDefenseClient({ principal }: { principal: PrincipalView }) {
  const [data, setData] = useState<{
    assets: Array<{
      asset_id: string;
      root_domain: string;
      asset_type: string;
      asset_value: string;
      is_exposed: boolean;
      last_seen_at: string;
    }>;
    vulnerabilities: Array<{
      cve_id: string;
      technology: string;
      cvss_score: number;
      in_cisa_kev: boolean;
      calculated_risk: string;
      description: string;
    }>;
    indicators: Array<{
      indicator_id: string;
      indicator_type: string;
      indicator_value: string;
      threat_actor?: string;
      confidence: number;
    }>;
    stats: {
      totalAssets: number;
      totalVulnerabilities: number;
      totalIndicators: number;
    };
  } | null>(null);

  const [activeDomain, setActiveDomain] = useState("nic.in");
  const [lookAlikes, setLookAlikes] = useState<Array<{
    lookAlikeDomain: string;
    variationType: string;
    riskDescription: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/cyber-defense")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function generateDefenseLookAlikes() {
    if (!activeDomain) return;
    try {
      const res = await fetch("/api/cyber-defense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: activeDomain }),
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
            <h1 className={styles.title}>Attack Surface & Cyber Threat Intelligence</h1>
            <p className={styles.subtitle}>
              Continuous external exposure monitoring, CISA KEV vulnerability prioritization, and secret leakage defense.
            </p>
          </div>
          <div className={styles.principalBadge}>
            <span>ANALYST: {principal.email}</span>
          </div>
        </header>

        {/* Defense Metrics */}
        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <Server size={22} className={styles.statIconCyan} />
            <div className={styles.statInfo}>
              <span className={styles.statVal}>{data?.stats.totalAssets ?? 0}</span>
              <span className={styles.statLabel}>Mapped Assets</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <ShieldAlert size={22} className={styles.statIconAmber} />
            <div className={styles.statInfo}>
              <span className={styles.statVal}>{data?.stats.totalVulnerabilities ?? 0}</span>
              <span className={styles.statLabel}>KEV Vulnerabilities</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <Key size={22} className={styles.statIconGreen} />
            <div className={styles.statInfo}>
              <span className={styles.statVal}>{data?.stats.totalIndicators ?? 0}</span>
              <span className={styles.statLabel}>Active Threat IOCs</span>
            </div>
          </div>
        </section>

        {/* Typosquatting / Look-alike Domain Scanner */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <Globe size={18} />
            <h2>Defensive Look-Alike & Phishing Infrastructure Detection</h2>
          </div>
          <div className={styles.scannerRow}>
            <input
              type="text"
              value={activeDomain}
              onChange={(e) => setActiveDomain(e.target.value)}
              placeholder="Enter institutional domain (e.g. nic.in)"
              className={styles.domainInput}
            />
            <button onClick={generateDefenseLookAlikes} className={styles.scanBtn} type="button">
              <Search size={16} />
              <span>Simulate Defense Surface</span>
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

        {/* Real Backend Mapped Assets & Vulnerabilities */}
        <div className={styles.splitGrid}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <Server size={18} />
              <h2>Discovered Attack Surface Assets</h2>
            </div>
            {data?.assets && data.assets.length > 0 ? (
              <div className={styles.assetList}>
                {data.assets.map((asset) => (
                  <div key={asset.asset_id} className={styles.assetItem}>
                    <div>
                      <strong>{asset.asset_value}</strong>
                      <small>{asset.root_domain} · {asset.asset_type}</small>
                    </div>
                    <span className={styles.tag}>{asset.is_exposed ? "EXPOSED" : "INTERNAL"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <CheckCircle size={20} />
                <span>No exposed unmitigated infrastructure assets detected in current ledger.</span>
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <AlertTriangle size={18} />
              <h2>CISA KEV & High-Risk Vulnerabilities</h2>
            </div>
            {data?.vulnerabilities && data.vulnerabilities.length > 0 ? (
              <div className={styles.vulnList}>
                {data.vulnerabilities.map((vuln) => (
                  <div key={vuln.cve_id} className={styles.vulnItem}>
                    <div>
                      <strong>{vuln.cve_id}</strong>
                      <small>{vuln.technology} · CVSS {vuln.cvss_score}</small>
                    </div>
                    <span className={vuln.in_cisa_kev ? styles.kevBadge : styles.highBadge}>
                      {vuln.calculated_risk}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <CheckCircle size={20} />
                <span>Zero unpatched CISA KEV exposures in monitored institutional perimeter.</span>
              </div>
            )}
          </section>
        </div>
      </main>
      </div>
    </DishaCommandShell>
  );
}
