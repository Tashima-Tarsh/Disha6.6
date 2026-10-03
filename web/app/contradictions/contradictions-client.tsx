"use client";

import { useEffect, useState } from "react";
import {
  Flame,
  AlertTriangle,
  Scale,
  ShieldCheck,
  CheckCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { DishaShellNav } from "@/components/shell/DishaShellNav";
import type { DISHAContradiction } from "@/lib/unified/canonical/types";
import styles from "./contradictions.module.css";

type PrincipalView = { email: string; roles: string[] };

export function ContradictionsClient({ principal }: { principal: PrincipalView }) {
  const [contradictions, setContradictions] = useState<DISHAContradiction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/canonical/contradictions")
      .then((res) => res.json())
      .then((json) => {
        if (json.contradictions) {
          setContradictions(json.contradictions);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className={styles.shell}>
      <DishaShellNav />

      <main className={styles.main}>
        <header className={styles.hero}>
          <div>
            <span className={styles.kicker}>EVIDENCE DIVERGENCE ENGINE</span>
            <h1 className={styles.title}>Constitutional Contradiction Center</h1>
            <p className={styles.subtitle}>
              Automated detection of statement vs statement, official record conflicts, court order deviations, and institutional timeline anomalies.
            </p>
          </div>
          <div className={styles.safetyBox}>
            <Scale size={16} />
            <span>INVESTIGATIVE PREAMBLE: Contradiction signals investigation, not automatic proof of wrongdoing.</span>
          </div>
        </header>

        {contradictions.length > 0 ? (
          <div className={styles.contraList}>
            {contradictions.map((c) => (
              <article key={c.contradictionId} className={styles.contraCard}>
                <div className={styles.cardTop}>
                  <div className={styles.typeBadge}>
                    <Flame size={15} />
                    <span>{c.conflictType.replace(/_/g, " ")}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.confBadge}>CONFIDENCE: {(c.confidence * 100).toFixed(0)}%</span>
                    <span className={c.reviewRequired ? styles.reviewReq : styles.reviewDone}>
                      {c.reviewRequired ? "REVIEW REQUIRED" : "REVIEWED"}
                    </span>
                  </div>
                </div>

                <p className={styles.explanation}>{c.explanation}</p>

                <div className={styles.evidenceComparison}>
                  <div className={styles.claimSide}>
                    <span className={styles.sideLabel}>CLAIM A (SOURCE 1)</span>
                    <p className={styles.claimText}>{c.claimA}</p>
                    <small>Evidence Ref: {c.evidenceA}</small>
                  </div>
                  <div className={styles.vsDivider}>VS</div>
                  <div className={styles.claimSide}>
                    <span className={styles.sideLabel}>CLAIM B (SOURCE 2)</span>
                    <p className={styles.claimText}>{c.claimB}</p>
                    <small>Evidence Ref: {c.evidenceB}</small>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.timeTag}>
                    <Clock size={14} />
                    <span>DETECTED: {new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <div className={styles.independence}>
                    <span>SOURCE INDEPENDENCE: {c.sourceIndependence ? "VERIFIED INDEPENDENT" : "SAME SOURCE FAMILY"}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyCard}>
            <CheckCircle size={32} className={styles.checkIcon} />
            <h2>Zero Active Unresolved Contradictions</h2>
            <p>
              Current mission claims and official records across primary legal gazettes, court orders, and datasets maintain complete logical concordance.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
