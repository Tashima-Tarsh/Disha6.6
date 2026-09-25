"use client";

import { AlertTriangle, ExternalLink, RefreshCw, Search, ShieldCheck, Signal, WifiOff } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { LiveInvestigationGraph } from "./LiveInvestigationGraph";
import styles from "./live-osint-plane.module.css";

type UniversalEvidence = {
  id: string;
  adapterId: string;
  sourceId: string;
  sourceName: string;
  sourceUrl?: string;
  summary: string;
  retrievedAt: string;
  provenanceHash: string;
  evidenceClass: "official" | "registry" | "public_archive" | "public_reporting" | "discovery";
};

type UniversalRun = {
  adapterId: string;
  status: string;
  durationMs: number;
  attempts: number;
  warnings: string[];
  error?: string;
  evidence: UniversalEvidence[];
};

type Brief = {
  generatedAt: string;
  query: string;
  mode: "evidence-backed" | "live-unpersisted";
  persistenceAvailable: boolean;
  adapterSummary: { total: number; healthy: number; degraded: number; unavailable: number };
  sourceUniverseSummary: {
    total: number;
    builtin: number;
    connectorReady: number;
    requiresConfiguration: number;
    referenceOnly: number;
    blockedByDefault: number;
    restricted: number;
    byCategory: Record<string, number>;
  };
  universal: {
    query: string;
    normalizedTarget: string;
    kind: "domain" | "ip" | "cve" | "asn" | "norad_id" | "space_weather" | "humanitarian_topic" | "github_repository" | "sec_cik" | "email" | "phone" | "username" | "entity";
    executedAdapters: string[];
    blockedCapabilities: string[];
    runs: UniversalRun[];
    evidence: UniversalEvidence[];
    warnings: string[];
  };
  news: {
    status: string;
    durationMs: number;
    articles: Array<{
      title?: string;
      url?: string;
      domain?: string;
      language?: string;
      sourceCountry?: string;
      seenDate?: string;
    }>;
  };
  vulnerabilities: {
    status: string;
    durationMs: number;
    items: Array<{
      cveID?: string;
      vendorProject?: string;
      product?: string;
      vulnerabilityName?: string;
      dateAdded?: string;
      shortDescription?: string;
      requiredAction?: string;
      dueDate?: string;
      knownRansomwareCampaignUse?: string;
    }>;
  };
  officialSources: Array<{
    sourceId?: string;
    sourceName?: string;
    owner?: string;
    domain?: string;
    url?: string;
    ok?: boolean;
    status?: number;
    adapterStatus?: string;
    warning?: string | null;
  }>;
  warnings: string[];
  notice: string;
};

type State =
  | { status: "loading" }
  | { status: "ready"; data: Brief }
  | { status: "error"; message: string };

const DEFAULT_QUERY = "India government";

export function LiveOsintPlane() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [submittedQuery, setSubmittedQuery] = useState(DEFAULT_QUERY);
  const [state, setState] = useState<State>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (q: string, background = false) => {
    if (background) setRefreshing(true);
    else setState({ status: "loading" });

    try {
      const response = await fetch(`/api/v1/osint/brief?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(`Live OSINT brief returned ${response.status}`);
      const data = await response.json() as Brief;
      setState({ status: "ready", data });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Live public intelligence unavailable",
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(submittedQuery);
    const timer = window.setInterval(() => void load(submittedQuery, true), 90_000);
    return () => window.clearInterval(timer);
  }, [load, submittedQuery]);

  const sourceHealth = useMemo(() => {
    if (state.status !== "ready") return { online: 0, total: 0 };
    return {
      online: state.data.officialSources.filter((item) => item.ok).length,
      total: state.data.officialSources.length,
    };
  }, [state]);

  const pivot = useCallback((value: string) => {
    const clean = value.trim().replace(/\s+/g, " ").slice(0, 180);
    if (!clean) return;
    setQuery(clean);
    setSubmittedQuery(clean);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pivot(query);
  }

  if (state.status === "loading") {
    return (
      <section className={styles.shell} aria-label="Live public intelligence">
        <div className={styles.loading}>
          <Signal size={18} />
          <div><strong>Opening live public-source intelligence plane</strong><span>Querying governed passive/public adapters…</span></div>
        </div>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className={styles.shell} aria-label="Live public intelligence">
        <div className={styles.error}>
          <WifiOff size={18} />
          <div><strong>Live OSINT unavailable</strong><span>{state.message}</span></div>
          <button type="button" onClick={() => void load(submittedQuery)}><RefreshCw size={14} /> Retry</button>
        </div>
      </section>
    );
  }

  const data = state.data;
  const successfulRuns = data.universal.runs.filter((run) => run.status === "completed" || run.status === "partial").length;

  return (
    <section className={styles.shell} aria-labelledby="live-osint-heading">
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}><span /> LIVE PUBLIC INTELLIGENCE</div>
          <h2 id="live-osint-heading">disha6.6 Universal OSINT Search</h2>
          <p>One query routes through approved public/passive sources, keeps provenance, and exposes exactly which adapters ran.</p>
        </div>

        <div className={styles.statusCluster}>
          <div className={styles.statusBox}>
            <strong>{data.adapterSummary.healthy}/{data.adapterSummary.total}</strong>
            <span>adapters healthy</span>
          </div>
          <div className={styles.statusBox}>
            <strong>{successfulRuns}/{data.universal.runs.length}</strong>
            <span>query adapters returned</span>
          </div>
          <div className={styles.statusBox}>
            <strong>{sourceHealth.online}/{sourceHealth.total}</strong>
            <span>official sources reachable</span>
          </div>
          <div className={styles.statusBox}>
            <strong>{data.sourceUniverseSummary.total}</strong>
            <span>OSINT / CTI / SPACEINT sources</span>
          </div>
          <div className={data.persistenceAvailable ? styles.persistOn : styles.persistOff}>
            {data.persistenceAvailable ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
            {data.persistenceAvailable ? "Evidence persistence on" : "Live / unpersisted"}
          </div>
        </div>
      </header>

      <form className={styles.searchBar} onSubmit={submit}>
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Universal public intelligence query"
          placeholder="Domain, IP, ASN, CVE, NORAD ID, space weather, GitHub repo, CIK, entity or topic"
        />
        <button type="submit">Run universal search</button>
        <button className={styles.refreshButton} type="button" onClick={() => void load(submittedQuery, true)} disabled={refreshing}>
          <RefreshCw className={refreshing ? styles.spin : undefined} size={15} />
          Refresh
        </button>
      </form>

      <div className={styles.metaLine}>
        <span>Target: <strong>{data.universal.normalizedTarget}</strong></span>
        <span>Detected: <strong>{formatKind(data.universal.kind)}</strong></span>
        <span>Updated {formatTime(data.generatedAt)}</span>
        <span>{data.notice}</span>
      </div>

      <section className={styles.universalPanel} aria-label="Universal OSINT query execution">
        <div className={styles.panelHead}>
          <div><span>UNIVERSAL QUERY MATRIX</span><strong>Source-by-source execution with provenance</strong></div>
          <small>{data.universal.evidence.length} evidence record{data.universal.evidence.length === 1 ? "" : "s"}</small>
        </div>

        <div className={styles.adapterRail}>
          {data.universal.runs.map((run) => (
            <div className={styles.adapterChip} key={run.adapterId} title={run.error ?? run.warnings.join(" · ")}>
              <span className={run.status === "completed" || run.status === "partial" ? styles.dotOn : styles.dotOff} />
              <div>
                <strong>{friendlyAdapter(run.adapterId)}</strong>
                <small>{run.status} · {run.durationMs} ms · {run.evidence.length} evidence</small>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.evidenceGrid}>
          {data.universal.evidence.length ? data.universal.evidence.slice(0, 10).map((item) => (
            <article className={styles.evidenceCard} key={item.id}>
              <div className={styles.evidenceMeta}>
                <span>{item.evidenceClass.replace(/_/g, " ")}</span>
                <span>{item.sourceName}</span>
              </div>
              <p>{item.summary}</p>
              <div className={styles.evidenceFoot}>
                <code>{item.provenanceHash.slice(0, 14)}…</code>
                {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source <ExternalLink size={11} /></a> : null}
              </div>
            </article>
          )) : <Empty text="The governed adapters returned no source-linked evidence for this target." />}
        </div>

        <details className={styles.guardrails}>
          <summary>Execution boundary</summary>
          <div>{data.universal.blockedCapabilities.map((item) => <span key={item}>{item}</span>)}</div>
        </details>
      </section>

      <section className={styles.sourceUniversePanel} aria-label="OSINT CTI and SPACEINT source universe">
        <div className={styles.panelHead}>
          <div><span>SOURCE UNIVERSE</span><strong>OSINT · CTI · SPACEINT coverage registry</strong></div>
          <small>{data.sourceUniverseSummary.total} cataloged · {data.sourceUniverseSummary.builtin} built in · {data.sourceUniverseSummary.connectorReady} connector-ready</small>
        </div>
        <div className={styles.sourceUniverseStats}>
          {Object.entries(data.sourceUniverseSummary.byCategory).map(([category, count]) => (
            <div className={styles.sourceUniverseStat} key={category}>
              <strong>{count}</strong>
              <span>{category.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
        <div className={styles.sourceUniverseFoot}>
          <span>{data.sourceUniverseSummary.requiresConfiguration} require credentials/configuration</span>
          <span>{data.sourceUniverseSummary.referenceOnly} reference-only</span>
          <span>{data.sourceUniverseSummary.blockedByDefault} blocked by default</span>
          <span>{data.sourceUniverseSummary.restricted} restricted-risk sources</span>
          <a href="/api/v1/osint/sources" target="_blank" rel="noreferrer">Open full registry <ExternalLink size={11} /></a>
        </div>
      </section>

      <div className={styles.investigation}>
        <LiveInvestigationGraph
          query={data.query}
          articles={data.news.articles}
          vulnerabilities={data.vulnerabilities.items}
          sources={data.officialSources}
          onPivot={pivot}
        />
      </div>

      <div className={styles.grid}>
        <section className={styles.feedPanel}>
          <div className={styles.panelHead}>
            <div><span>GDELT PUBLIC NEWS</span><strong>Current open-source reporting</strong></div>
            <small>{data.news.status} · {data.news.durationMs} ms</small>
          </div>
          <div className={styles.newsList}>
            {data.news.articles.length ? data.news.articles.slice(0, 12).map((article, index) => (
              <article className={styles.newsItem} key={article.url ?? `${article.title}-${index}`}>
                <div className={styles.newsMeta}>
                  <span>{article.domain ?? "public source"}</span>
                  <span>{formatObserved(article.seenDate)}</span>
                </div>
                <h3>{article.title ?? "Untitled public-source observation"}</h3>
                <div className={styles.newsFoot}>
                  <span>{[article.sourceCountry, article.language].filter(Boolean).join(" · ") || "Source metadata"}</span>
                  {article.url ? <a href={article.url} target="_blank" rel="noreferrer">Open source <ExternalLink size={12} /></a> : null}
                </div>
              </article>
            )) : <Empty text="No current GDELT observations returned for this query." />}
          </div>
        </section>

        <aside className={styles.sideStack}>
          <section className={styles.sidePanel}>
            <div className={styles.panelHead}>
              <div><span>OFFICIAL SOURCE MESH</span><strong>Government / authority availability</strong></div>
            </div>
            <div className={styles.sourceList}>
              {data.officialSources.map((source) => (
                <div className={styles.sourceRow} key={source.sourceId}>
                  <span className={source.ok ? styles.dotOn : styles.dotOff} />
                  <div>
                    <strong>{source.sourceName ?? source.sourceId}</strong>
                    <small>{source.owner ?? source.domain ?? "registered source"}</small>
                  </div>
                  <span className={styles.http}>{source.status ? `HTTP ${source.status}` : source.adapterStatus}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.sidePanel}>
            <div className={styles.panelHead}>
              <div><span>CISA KEV</span><strong>Defensive vulnerability watch</strong></div>
              <small>{data.vulnerabilities.status}</small>
            </div>
            <div className={styles.kevList}>
              {data.vulnerabilities.items.slice(0, 6).map((item, index) => (
                <div className={styles.kevItem} key={item.cveID ?? index}>
                  <div><strong>{item.cveID ?? "KEV item"}</strong><span>{item.vendorProject ?? "Vendor"} · {item.product ?? "Product"}</span></div>
                  <p>{item.vulnerabilityName ?? item.shortDescription ?? "Known exploited vulnerability catalog record."}</p>
                </div>
              ))}
              {!data.vulnerabilities.items.length ? <Empty text="No KEV records returned by the public adapter." /> : null}
            </div>
          </section>
        </aside>
      </div>

      {data.warnings.length ? (
        <details className={styles.warnings}>
          <summary>{data.warnings.length} source warning{data.warnings.length === 1 ? "" : "s"}</summary>
          <div>{data.warnings.map((warning) => <span key={warning}>{warning}</span>)}</div>
        </details>
      ) : null}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className={styles.empty}>{text}</div>;
}

function formatKind(value: Brief["universal"]["kind"]): string {
  return value.replace(/_/g, " ");
}

function friendlyAdapter(value: string): string {
  return value
    .replace(/^public-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatObserved(value?: string): string {
  if (!value) return "time unavailable";
  const normalized = /^\d{14}$/.test(value)
    ? `${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T${value.slice(8,10)}:${value.slice(10,12)}:${value.slice(12,14)}Z`
    : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}
