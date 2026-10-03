"use client";

import { useState } from "react";
import {
  GitCompare,
  Network,
  CheckCircle2,
  AlertCircle,
  Search,
  Layers,
  ArrowRight,
} from "lucide-react";
import { DishaShellNav } from "@/components/shell/DishaShellNav";
import type { DISHACorroboration } from "@/lib/unified/canonical/types";
import styles from "./corroboration.module.css";

type PrincipalView = { email: string; roles: string[] };

export function CorroborationClient({ principal }: { principal: PrincipalView }) {
  const [claimId, setClaimId] = useState("CLAIM-CAG-PROCUREMENT-2026");
  const [rawSources, setRawSources] = useState(
    JSON.stringify(
      [
        { sourceId: "cag-audit-portal", sourceName: "CAG Official Audit Portal", url: "https://cag.gov.in/audit/reports", confidence: 0.95 },
        { sourceId: "ani-wire-feed", sourceName: "ANI News Wire", url: "https://aninews.in/news/national", confidence: 0.8 },
        { sourceId: "ndtv-wire-reprint", sourceName: "NDTV (ANI Syndicate)", url: "https://ndtv.com/india-news/ani-reprint", confidence: 0.75 },
        { sourceId: "gazette-official", sourceName: "Gazette of India", url: "https://egazette.gov.in", confidence: 0.98 },
      ],
      null,
      2,
    ),
  );
  const [result, setResult] = useState<DISHACorroboration | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function evaluateCorroboration() {
    setEvaluating(true);
    setError(null);
    try {
      const parsedSources = JSON.parse(rawSources);
      const res = await fetch("/api/canonical/corroborations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, sources: parsedSources }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setResult(json.corroboration);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div className={styles.shell}>
      <DishaShellNav />

      <main className={styles.main}>
        <header className={styles.hero}>
          <div>
            <span className={styles.kicker}>INDEPENDENT VERIFICATION PLATFORM</span>
            <h1 className={styles.title}>Corroboration & Source Family Engine</h1>
            <p className={styles.subtitle}>
              Measures true source independence by clustering syndicated news wires, mirrors, and scrapes into single source families (source_family_id).
            </p>
          </div>
        </header>

        <div className={styles.workspaceGrid}>
          {/* Input Panel */}
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <Network size={18} />
              <h2>Claim Sources Input</h2>
            </div>

            <div className={styles.fieldGroup}>
              <label>Claim Identifier</label>
              <input
                type="text"
                value={claimId}
                onChange={(e) => setClaimId(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Observed Sources (JSON Array)</label>
              <textarea
                rows={9}
                value={rawSources}
                onChange={(e) => setRawSources(e.target.value)}
                className={styles.textarea}
              />
            </div>

            {error && <div className={styles.errorBox}>{error}</div>}

            <button
              onClick={evaluateCorroboration}
              disabled={evaluating}
              className={styles.evalBtn}
              type="button"
            >
              <GitCompare size={16} />
              <span>{evaluating ? "CLUSTERING FAMILIES..." : "MEASURE INDEPENDENCE"}</span>
            </button>
          </section>

          {/* Results Panel */}
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <Layers size={18} />
              <h2>Source Family Independence Breakdown</h2>
            </div>

            {result ? (
              <div className={styles.resultsContent}>
                <div className={styles.scoreRow}>
                  <div className={styles.scoreBox}>
                    <span className={styles.scoreNum}>{result.independent_source_count}</span>
                    <span className={styles.scoreLbl}>Independent Families</span>
                  </div>
                  <div className={styles.scoreBox}>
                    <span className={styles.scoreNum}>{(result.confidence_score * 100).toFixed(0)}%</span>
                    <span className={styles.scoreLbl}>Corroboration Score</span>
                  </div>
                  <div className={styles.scoreBox}>
                    <span className={result.is_corroborated ? styles.greenStatus : styles.amberStatus}>
                      {result.is_corroborated ? "CORROBORATED" : "UNDER-CORROBORATED"}
                    </span>
                    <span className={styles.scoreLbl}>State Gate</span>
                  </div>
                </div>

                <div className={styles.familyCluster}>
                  <h3>Detected Source Families</h3>
                  <div className={styles.familyList}>
                    {result.source_family_ids.map((fam, idx) => (
                      <div key={idx} className={styles.familyItem}>
                        <CheckCircle2 size={16} className={styles.checkIcon} />
                        <span>FAMILY ID: {fam}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.emptyPlaceholder}>
                <AlertCircle size={28} />
                <p>Run evaluation to cluster sources and calculate independent corroboration score.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
