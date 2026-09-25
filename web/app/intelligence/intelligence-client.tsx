"use client";

import { Activity, AlertTriangle, ArrowLeft, CheckCircle2, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import styles from "./intelligence.module.css";

type Change = {
  changeId: string;
  subject: string;
  predicate: string;
  materiality: "none" | "low" | "medium" | "high" | "critical";
  materialityScore: number;
  reasons: string[];
  confidenceDelta: number;
  independentLineageDelta: number;
  verifyRequired: boolean;
  hypothesisIds: string[];
  observedAt: string;
};

type Review = {
  reviewId: string;
  kind: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_review" | "resolved" | "dismissed";
  title: string;
  summary: string;
  subject?: string;
  predicate?: string;
  updatedAt: string;
};

type IntelligenceState = {
  subject: string; predicate: string;
  claims: Array<{ claimId: string; value: string | number | boolean; confidence: number; sourceId: string; sourceHash: string; lineageId?: string; observedAt?: string; validFrom?: string; validTo?: string; unit?: string }>;
  contradictionSets: Array<{ contradictionId: string; status: string; independentSourceCount: number; independentLineageCount: number; relationships: Array<{ relation: string; reason: string; severity: number }> }>;
  hypotheses: Array<{ hypothesisId: string; statement: string; status: string; confidence: number; independentSupportLineages: number; independentContradictionLineages: number; verifyRequired: boolean; unresolvedQuestions: string[] }>;
};

type ContinuousWatchSummary = {
  watchId: string;
  adapterId: string;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt?: string;
  lastStatus?: "completed" | "partial" | "failed" | "cancelled" | "timed_out";
  lastChangedAt?: string;
};

type LiveFeed = {
  generatedAt: string;
  motion: { changeCount: number; openReviewCount: number; highImpactCount: number; verificationRequiredCount: number };
  changes: Change[];
  openReviews: Review[];
  continuousOsint: {
    totalWatches: number;
    activeWatches: number;
    changedWatches: number;
    failedWatches: number;
    dueWatches: number;
    watches: ContinuousWatchSummary[];
  };
};

export function IntelligenceClient({ principal }: { principal: { email: string; roles: string[] } }) {
  const [feed, setFeed] = useState<LiveFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedState, setSelectedState] = useState<IntelligenceState | null>(null);
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);
  const [bundleKind, setBundleKind] = useState("domain");
  const [bundleFields, setBundleFields] = useState<Record<string, string>>({});
  const [creatingWatch, setCreatingWatch] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/intelligence/live?limit=150", { cache: "no-store" });
      if (!response.ok) throw new Error(`Live intelligence request failed (${response.status})`);
      setFeed(await response.json() as LiveFeed);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Live intelligence unavailable");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, load]);

  const topChanges = useMemo(() => (feed?.changes ?? []).slice().sort((a, b) => priorityScore(b.materiality) - priorityScore(a.materiality) || Date.parse(b.observedAt) - Date.parse(a.observedAt)), [feed]);

  async function inspectChange(change: Change) {
    setSelectedChangeId(change.changeId);
    try {
      const params = new URLSearchParams({ subject: change.subject, predicate: change.predicate });
      const response = await fetch(`/api/v1/intelligence/state?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`State inspection failed (${response.status})`);
      setSelectedState(await response.json() as IntelligenceState);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "State inspection failed");
      setSelectedState(null);
    }
  }

  async function createWatchBundle() {
    setCreatingWatch(true);
    try {
      const bundle = buildBundlePayload(bundleKind, bundleFields);
      const response = await fetch("/api/v1/osint/watch-bundles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          purpose: `Continuous ${bundleKind.replaceAll("_", " ")} intelligence watch`,
          reviewOnChange: true,
          bundle,
        }),
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Watch creation failed (${response.status}): ${detail.slice(0, 180)}`);
      }
      setBundleFields({});
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Watch creation failed");
    } finally {
      setCreatingWatch(false);
    }
  }

  async function resolveReview(reviewId: string, status: "in_review" | "resolved" | "dismissed") {
    setBusy(reviewId);
    try {
      const response = await fetch("/api/v1/intelligence/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reviewId, status }) });
      if (!response.ok) throw new Error(`Review update failed (${response.status})`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Review update failed");
    } finally { setBusy(null); }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}><Activity size={16} /> CONTINUOUS INTELLIGENCE PLANE</div>
          <h1>Live change impact</h1>
          <p>New evidence is compared against the prior governed intelligence state. Material changes create analyst work automatically.</p>
        </div>
        <div className={styles.actions}>
          <Link href="/dashboard" className={styles.linkButton}><ArrowLeft size={16} /> Dashboard</Link>
          <button onClick={() => void load()}><RefreshCw size={16} /> Refresh</button>
          <button onClick={() => setAutoRefresh((value) => !value)}>{autoRefresh ? "Live · 15s" : "Paused"}</button>
        </div>
      </header>

      <section className={styles.identity}><ShieldCheck size={16} /> {principal.email} · {principal.roles.join(", ")} · source-bound intelligence only</section>
      {error ? <section className={styles.error}><AlertTriangle size={18} /> {error}</section> : null}

      <section className={styles.metrics}>
        <Metric label="Changes" value={feed?.motion.changeCount ?? 0} />
        <Metric label="High impact" value={feed?.motion.highImpactCount ?? 0} />
        <Metric label="Open review" value={feed?.motion.openReviewCount ?? 0} />
        <Metric label="Verify required" value={feed?.motion.verificationRequiredCount ?? 0} />
        <Metric label="Active watches" value={feed?.continuousOsint.activeWatches ?? 0} />
        <Metric label="Watch failures" value={feed?.continuousOsint.failedWatches ?? 0} />
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelTitle}><h2>Change stream</h2><span>{feed ? new Date(feed.generatedAt).toLocaleTimeString() : "loading"}</span></div>
          <div className={styles.stack}>
            {topChanges.length === 0 ? <Empty label="No intelligence changes have been recorded yet." /> : topChanges.map((change) => (
              <article key={change.changeId} className={styles.card}>
                <div className={styles.cardHeader}><span className={`${styles.badge} ${styles[change.materiality]}`}>{change.materiality}</span><time>{formatTime(change.observedAt)}</time></div>
                <h3>{change.subject}</h3><p className={styles.predicate}>{change.predicate}</p>
                <p>{change.reasons.join(" ") || "State fingerprint changed."}</p>
                <div className={styles.meta}>
                  <span>Δ confidence {signed(change.confidenceDelta)}</span>
                  <span>Δ lineages {signed(change.independentLineageDelta)}</span>
                  <span>{change.hypothesisIds.length} hypotheses</span>
                  {change.verifyRequired ? <strong>VERIFY</strong> : <span>corroborated</span>}
                </div>
                <button className={styles.inspectButton} onClick={() => void inspectChange(change)}>{selectedChangeId === change.changeId ? "Refresh evidence" : "Inspect evidence"}</button>
                {selectedChangeId === change.changeId && selectedState ? <StateInspector state={selectedState} /> : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelTitle}><h2>Analyst queue</h2><span>{feed?.openReviews.length ?? 0} open</span></div>
          <div className={styles.stack}>
            {(feed?.openReviews ?? []).length === 0 ? <Empty label="No open analyst reviews." /> : feed!.openReviews.map((review) => (
              <article key={review.reviewId} className={styles.card}>
                <div className={styles.cardHeader}><span className={`${styles.badge} ${styles[review.priority]}`}>{review.priority}</span><time>{formatTime(review.updatedAt)}</time></div>
                <h3>{review.title}</h3><p>{review.summary}</p>
                <div className={styles.reviewActions}>
                  <button disabled={busy === review.reviewId} onClick={() => void resolveReview(review.reviewId, "in_review")}><Clock3 size={14} /> Take</button>
                  <button disabled={busy === review.reviewId} onClick={() => void resolveReview(review.reviewId, "resolved")}><CheckCircle2 size={14} /> Resolve</button>
                  <button disabled={busy === review.reviewId} onClick={() => void resolveReview(review.reviewId, "dismissed")}>Dismiss</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.panel} ${styles.meshPanel}`}>
          <div className={styles.panelTitle}>
            <div><h2>Continuous source mesh</h2><p className={styles.panelSubtitle}>Official feeds run from the source registry. Targeted public APIs run only through explicit governed watches.</p></div>
            <span>{feed?.continuousOsint.totalWatches ?? 0} configured</span>
          </div>

          <div className={styles.watchBuilder}>
            <select value={bundleKind} onChange={(event) => { setBundleKind(event.target.value); setBundleFields({}); }} aria-label="Continuous watch type">
              <option value="domain">Domain intelligence</option>
              <option value="topic">Topic intelligence</option>
              <option value="company">Company intelligence</option>
              <option value="repository">Repository intelligence</option>
              <option value="vulnerability">Defensive vulnerability</option>
              <option value="macro">Macro indicator</option>
              <option value="official_source">Official source</option>
              <option value="dynamic_source">Registered public source</option>
            </select>
            <BundleFields kind={bundleKind} values={bundleFields} onChange={(key, value) => setBundleFields((current) => ({ ...current, [key]: value }))} />
            <button className={styles.createWatchButton} disabled={creatingWatch} onClick={() => void createWatchBundle()}>
              {creatingWatch ? "Creating…" : "Start governed watch"}
            </button>
          </div>

          <div className={styles.watchGrid}>
            {(feed?.continuousOsint.watches ?? []).length === 0
              ? <Empty label="No targeted OSINT watches yet. Official fixed-source schedules remain active independently." />
              : feed!.continuousOsint.watches.slice(0, 24).map((watch) => (
                <article key={watch.watchId} className={styles.watchCard}>
                  <div className={styles.cardHeader}>
                    <span className={`${styles.badge} ${watch.lastStatus === "failed" || watch.lastStatus === "timed_out" ? styles.high : styles.low}`}>
                      {watch.lastStatus ?? (watch.enabled ? "scheduled" : "paused")}
                    </span>
                    <time>{watch.lastRunAt ? formatTime(watch.lastRunAt) : "not run yet"}</time>
                  </div>
                  <h3>{watch.adapterId.replaceAll("-", " ")}</h3>
                  <div className={styles.meta}>
                    <span>next {formatTime(watch.nextRunAt)}</span>
                    {watch.lastChangedAt ? <strong>changed {formatTime(watch.lastChangedAt)}</strong> : <span>baseline/no change</span>}
                  </div>
                </article>
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function BundleFields({ kind, values, onChange }: { kind: string; values: Record<string, string>; onChange: (key: string, value: string) => void }) {
  const input = (key: string, placeholder: string) => <input value={values[key] ?? ""} onChange={(event) => onChange(key, event.target.value)} placeholder={placeholder} aria-label={placeholder} />;
  if (kind === "domain") return input("domain", "example.org");
  if (kind === "topic") return input("query", "Public-interest topic");
  if (kind === "humanitarian") return input("query", "Earthquake, flood, disaster or humanitarian topic");
  if (kind === "company") return <>{input("cik", "SEC CIK")}{input("query", "Company name / topic")}</>;
  if (kind === "repository") return input("repository", "owner/repository");
  if (kind === "vulnerability") return <>{input("cve", "CVE (optional)")}{input("vendor", "Vendor (optional)")}{input("product", "Product (optional)")}</>;
  if (kind === "network_resource") return input("resource", "IP address or AS13335");
  if (kind === "space_object") return input("catalogNumber", "NORAD catalog number, e.g. 25544");
  if (kind === "space_weather") return <span>NOAA SWPC public alerts · 15 minute watch cadence</span>;
  if (kind === "macro") return <>{input("country", "Country code, e.g. IND")}{input("indicator", "World Bank indicator")}</>;
  if (kind === "official_source") return input("sourceId", "disha6.6 source ID");
  return <>{input("sourceId", "Registered source ID")}{input("path", "Optional /path")}</>;
}

function buildBundlePayload(kind: string, fields: Record<string, string>): Record<string, string> {
  const cleaned = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value));
  return { kind, ...cleaned };
}

function Metric({ label, value }: { label: string; value: number }) { return <div className={styles.metric}><span>{label}</span><strong>{value}</strong></div>; }
function Empty({ label }: { label: string }) { return <div className={styles.empty}>{label}</div>; }
function signed(value: number) { return `${value > 0 ? "+" : ""}${value.toFixed(3)}`; }
function formatTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(); }
function priorityScore(value: string) { return value === "critical" ? 5 : value === "high" ? 4 : value === "medium" ? 3 : value === "low" ? 2 : 1; }

function StateInspector({ state }: { state: IntelligenceState }) {
  return <div className={styles.inspector}>
    <div className={styles.inspectorGrid}>
      <div><span>Claims</span><strong>{state.claims.length}</strong></div>
      <div><span>Hypotheses</span><strong>{state.hypotheses.length}</strong></div>
      <div><span>Independent lineages</span><strong>{Math.max(0, ...state.contradictionSets.map((set) => set.independentLineageCount))}</strong></div>
    </div>
    <div className={styles.hypotheses}>
      {state.hypotheses.slice(0, 4).map((hypothesis) => <div key={hypothesis.hypothesisId} className={styles.hypothesis}>
        <div><strong>{Math.round(hypothesis.confidence * 100)}%</strong> <span>{hypothesis.status}</span>{hypothesis.verifyRequired ? <em>VERIFY</em> : null}</div>
        <p>{hypothesis.statement}</p>
        <small>{hypothesis.independentSupportLineages} support lineage(s) · {hypothesis.independentContradictionLineages} contradiction lineage(s)</small>
      </div>)}
    </div>
    <div className={styles.claims}>
      {state.claims.slice(0, 8).map((claim) => <div key={claim.claimId}><code>{String(claim.value)}{claim.unit ? ` ${claim.unit}` : ""}</code><span>{claim.sourceId} · {claim.lineageId ?? "source lineage unresolved"} · {Math.round(claim.confidence * 100)}%</span></div>)}
    </div>
  </div>;
}
