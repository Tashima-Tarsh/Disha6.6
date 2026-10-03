"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ExternalLink, Loader2, Search, ShieldCheck, Telescope, X } from "lucide-react";

import {
  OsintUniverse3D,
  type OsintUniverseNode,
  type UniverseHealth,
  type UniverseNodeMode,
} from "@/components/visual/OsintUniverse3D";
import styles from "./universe.module.css";

type CatalogAdapter = {
  id: string;
  name: string;
  capability: string;
  executionClass?: string;
  defaultEnabled?: boolean;
  upstreamRepository?: string;
};

type CatalogHealth = {
  id: string;
  status: UniverseHealth;
  detail?: string;
};

type SourceUniverseEntry = {
  id: string;
  name: string;
  category: string;
  homeUrl: string;
  mode: Exclude<UniverseNodeMode, "live_result" | "gateway">;
  auth: string;
  risk: string;
  capabilities: string[];
  notes: string;
  adapterId?: string;
};

type CatalogResponse = {
  adapters: CatalogAdapter[];
  health: CatalogHealth[];
  sourceUniverse: SourceUniverseEntry[];
  sourceUniverseSummary: {
    total: number;
    builtin: number;
    connectorReady: number;
    requiresConfiguration: number;
    referenceOnly: number;
    blockedByDefault: number;
  };
  safetyRule: string;
};

type SearchEvidence = {
  id: string;
  adapterId: string;
  sourceId: string;
  sourceName: string;
  sourceUrl?: string;
  summary: string;
  retrievedAt: string;
  provenanceHash: string;
  evidenceClass: string;
};

type SearchRun = {
  adapterId: string;
  status: string;
  durationMs: number;
  warnings: string[];
  error?: string;
};

type SearchResponse = {
  generatedAt: string;
  mode: string;
  persistenceAvailable: boolean;
  adapterSummary: { total: number; healthy: number; degraded: number; unavailable: number };
  search: {
    query: string;
    normalizedTarget: string;
    kind: string;
    executedAdapters: string[];
    blockedCapabilities: string[];
    runs: SearchRun[];
    evidence: SearchEvidence[];
    warnings: string[];
  };
  notice: string;
};

type AstraDispatchRun = {
  toolId: string;
  status: string;
  data?: { runId?: string; dispatchStatus?: string };
  error?: string;
};

type AstraRunState = {
  runId: string;
  toolId: string;
  status: string;
  durationMs?: number;
  provenanceHash?: string;
  error?: string | null;
  evidence?: Array<{ sourceName?: string; summary?: string; provenanceHash?: string }>;
};

type ViewMode = "all" | "live" | "configurable" | "reference" | "blocked";

function modeMatches(node: OsintUniverseNode, view: ViewMode) {
  if (view === "all") return true;
  if (view === "live") return node.mode === "builtin" || node.mode === "live_result";
  if (view === "configurable") return node.mode === "connector_ready" || node.mode === "requires_configuration";
  if (view === "reference") return node.mode === "reference_only";
  return node.mode === "blocked_by_default";
}

function formatMode(mode: string) {
  return mode.replaceAll("_", " ");
}

export function OsintUniverseClient() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [query, setQuery] = useState("example.org");
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState<SearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [astraDispatching, setAstraDispatching] = useState(false);
  const [astraRuns, setAstraRuns] = useState<AstraRunState[]>([]);
  const [selected, setSelected] = useState<OsintUniverseNode | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/osint/catalog", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`OSINT catalog unavailable (${response.status})`);
        return response.json() as Promise<CatalogResponse>;
      })
      .then(setCatalog)
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCatalogError(error instanceof Error ? error.message : "OSINT catalog unavailable");
      });
    return () => controller.abort();
  }, []);

  const healthByAdapter = useMemo(
    () => new Map((catalog?.health ?? []).map((item) => [item.id, item] as const)),
    [catalog],
  );

  const nodes = useMemo<OsintUniverseNode[]>(() => {
    if (!catalog) return [];
    const representedAdapters = new Set(catalog.sourceUniverse.map((entry) => entry.adapterId).filter(Boolean));
    const sourceNodes: OsintUniverseNode[] = catalog.sourceUniverse.map((entry) => ({
      id: `source:${entry.id}`,
      name: entry.name,
      category: entry.category,
      mode: entry.mode,
      health: entry.adapterId ? healthByAdapter.get(entry.adapterId)?.status ?? "unknown" : "unknown",
      capabilities: entry.capabilities,
      adapterId: entry.adapterId,
      homeUrl: entry.homeUrl,
      risk: entry.risk,
      notes: entry.notes,
    }));
    const adapterNodes: OsintUniverseNode[] = catalog.adapters
      .filter((adapter) => !representedAdapters.has(adapter.id))
      .map((adapter) => ({
        id: `adapter:${adapter.id}`,
        name: adapter.name,
        category: "runtime_adapter",
        mode: "builtin",
        health: healthByAdapter.get(adapter.id)?.status ?? "unknown",
        capabilities: [adapter.capability],
        adapterId: adapter.id,
        homeUrl: adapter.upstreamRepository,
        risk: adapter.executionClass === "passive_public" ? "low" : "moderate",
        notes: healthByAdapter.get(adapter.id)?.detail ?? "Governed runtime adapter.",
      }));
    const evidenceNodes: OsintUniverseNode[] = (search?.search.evidence ?? []).map((evidence, index) => ({
      id: `result:${evidence.provenanceHash}:${index}`,
      name: evidence.sourceName,
      category: `live_result_${evidence.evidenceClass}`,
      mode: "live_result",
      health: "healthy",
      capabilities: [evidence.summary],
      adapterId: evidence.adapterId,
      homeUrl: evidence.sourceUrl,
      risk: "low",
      notes: `Retrieved ${new Date(evidence.retrievedAt).toLocaleString()} · ${evidence.provenanceHash.slice(0, 16)}…`,
      provenanceHash: evidence.provenanceHash,
    }));
    return [...sourceNodes, ...adapterNodes, ...evidenceNodes];
  }, [catalog, healthByAdapter, search]);

  const categories = useMemo(
    () => [...new Set(nodes.filter((node) => node.mode !== "live_result").map((node) => node.category))].sort(),
    [nodes],
  );

  const visibleNodes = useMemo(
    () => nodes.filter((node) =>
      modeMatches(node, viewMode)
      && (category === "all" || node.category === category || node.mode === "live_result"),
    ),
    [nodes, viewMode, category],
  );

  const handleSelect = useCallback((node: OsintUniverseNode | null) => setSelected(node), []);

  useEffect(() => {
    const pending = astraRuns.filter((run) => ["queued", "running"].includes(run.status));
    if (!pending.length) return;

    let cancelled = false;
    const poll = async () => {
      const updates = await Promise.all(pending.map(async (run) => {
        try {
          const response = await fetch(`/api/v1/osint/astra/runs/${encodeURIComponent(run.runId)}`, {
            credentials: "same-origin",
            cache: "no-store",
          });
          if (!response.ok) return run;
          return await response.json() as AstraRunState;
        } catch {
          return run;
        }
      }));
      if (cancelled) return;
      setAstraRuns((current) => current.map((run) => updates.find((item) => item.runId === run.runId) ?? run));
    };

    void poll();
    const timer = window.setInterval(() => { void poll(); }, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [astraRuns]);

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || searching) return;
    setSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(`/api/v1/osint/search?q=${encodeURIComponent(trimmed)}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const body = await response.json() as SearchResponse & { error?: string };
      if (!response.ok) throw new Error(body.error ?? `Search failed (${response.status})`);
      setSearch(body);
      setViewMode("all");
      setCategory("all");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function runDeepAstra() {
    if (!search || astraDispatching || !["domain", "ip"].includes(search.search.kind)) return;
    setAstraDispatching(true);
    setSearchError(null);
    try {
      const response = await fetch("/api/v1/osint/astra/dispatch", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: search.search.normalizedTarget,
          targetType: search.search.kind,
          purpose: "Deep passive ASTRA enrichment from the OSINT Universe",
        }),
      });
      const body = await response.json() as { runs?: AstraDispatchRun[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? `ASTRA dispatch failed (${response.status})`);
      const queued = (body.runs ?? [])
        .map((run) => ({
          runId: run.data?.runId ?? "",
          toolId: run.toolId,
          status: run.data?.dispatchStatus === "queued" ? "queued" : run.status,
          error: run.error,
        }))
        .filter((run) => run.runId);
      setAstraRuns(queued);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "ASTRA dispatch failed");
    } finally {
      setAstraDispatching(false);
    }
  }

  return (
    <main className={styles.shell}>
      <div className={styles.nebula} aria-hidden="true" />
      <section className={styles.universe}>
        <OsintUniverse3D
          nodes={visibleNodes}
          onSelect={handleSelect}
          selectedId={selected?.id}
          mode="operational"
        />
      </section>

      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>DISHA 6.6 · ASTRA PUBLIC INTELLIGENCE</p>
          <h1>OSINT Universe</h1>
          <p>Every planet is a declared source or connector. Gold result nodes are evidence returned by a live governed search.</p>
        </div>
        <div className={styles.runtimePill}>
          <Activity size={15} />
          {catalog ? `${catalog.health.filter((item) => item.status === "healthy").length}/${catalog.health.length} runtime adapters healthy` : "Loading runtime"}
        </div>
      </header>

      <aside className={styles.leftPanel}>
        <form className={styles.searchForm} onSubmit={runSearch}>
          <label htmlFor="universe-search">Universal public-source search</label>
          <div className={styles.searchRow}>
            <Search size={18} />
            <input
              id="universe-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="domain, IP, CVE, ASN, repository, entity, disaster…"
              autoComplete="off"
            />
            <button type="submit" disabled={searching}>
              {searching ? <Loader2 className={styles.spin} size={17} /> : <Telescope size={17} />}
              Search
            </button>
          </div>
          <p className={styles.searchHint}>Examples: example.org · 8.8.8.8 · CVE-2026-12345 · AS13335 · OpenAI · India flood response</p>
          {search && ["domain", "ip"].includes(search.search.kind) ? (
            <button className={styles.deepButton} type="button" onClick={runDeepAstra} disabled={astraDispatching}>
              {astraDispatching ? <Loader2 className={styles.spin} size={16} /> : <Activity size={16} />}
              Deep ASTRA · passive worker tools
            </button>
          ) : null}
        </form>

        <div className={styles.truthNotice}>
          <ShieldCheck size={18} />
          <div>
            <strong>Truth boundary</strong>
            <span>Only live/configured adapters execute. Reference and blocked planets are visible catalog entries, never fabricated results.</span>
          </div>
        </div>

        <div className={styles.filters}>
          {(["all", "live", "configurable", "reference", "blocked"] as ViewMode[]).map((modeName) => (
            <button
              key={modeName}
              className={viewMode === modeName ? styles.activeFilter : ""}
              onClick={() => setViewMode(modeName)}
              type="button"
            >
              {modeName}
            </button>
          ))}
        </div>

        <label className={styles.categorySelect}>
          <span>Orbit / category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{formatMode(item)}</option>)}
          </select>
        </label>

        {catalogError ? <p className={styles.error}>{catalogError}</p> : null}
        {searchError ? <p className={styles.error}>{searchError}</p> : null}

        {catalog ? (
          <div className={styles.stats}>
            <div><strong>{catalog.sourceUniverseSummary.total}</strong><span>cataloged sources</span></div>
            <div><strong>{catalog.sourceUniverseSummary.builtin}</strong><span>built in</span></div>
            <div><strong>{catalog.sourceUniverseSummary.connectorReady}</strong><span>connector ready</span></div>
            <div><strong>{catalog.sourceUniverseSummary.requiresConfiguration}</strong><span>need config</span></div>
          </div>
        ) : (
          <div className={styles.loading}><Loader2 className={styles.spin} size={18} /> Loading governed source universe…</div>
        )}
      </aside>

      <aside className={styles.rightPanel}>
        {selected ? (
          <>
            <button className={styles.closeButton} onClick={() => setSelected(null)} type="button" aria-label="Close details"><X size={18} /></button>
            <p className={styles.detailEyebrow}>{formatMode(selected.category)}</p>
            <h2>{selected.name}</h2>
            <div className={styles.badges}>
              <span>{formatMode(selected.mode)}</span>
              {selected.health ? <span>{selected.health}</span> : null}
              {selected.risk ? <span>risk: {selected.risk}</span> : null}
            </div>
            {selected.adapterId ? <p className={styles.mono}>adapter: {selected.adapterId}</p> : null}
            <p className={styles.detailText}>{selected.notes ?? "Cataloged public-intelligence capability."}</p>
            {selected.capabilities?.length ? (
              <ul>{selected.capabilities.slice(0, 8).map((capability) => <li key={capability}>{capability}</li>)}</ul>
            ) : null}
            {selected.provenanceHash ? <p className={styles.hash}>provenance {selected.provenanceHash}</p> : null}
            {selected.homeUrl ? (
              <a className={styles.sourceLink} href={selected.homeUrl} rel="noreferrer" target="_blank">
                Open source <ExternalLink size={15} />
              </a>
            ) : null}
          </>
        ) : search ? (
          <>
            <p className={styles.detailEyebrow}>LIVE SEARCH</p>
            <h2>{search.search.normalizedTarget}</h2>
            <div className={styles.badges}>
              <span>{search.search.kind}</span>
              <span>{search.mode}</span>
              <span>{search.search.evidence.length} evidence items</span>
            </div>
            <p className={styles.detailText}>{search.notice}</p>
            <div className={styles.runList}>
              {search.search.runs.map((run) => (
                <div key={run.adapterId}>
                  <strong>{run.adapterId}</strong>
                  <span>{run.status} · {run.durationMs} ms</span>
                </div>
              ))}
            </div>
            {astraRuns.length ? (
              <div className={styles.astraRuns}>
                <strong>ASTRA worker runs</strong>
                {astraRuns.map((run) => (
                  <div key={run.runId}>
                    <span>{run.toolId}</span>
                    <span>{run.status}{run.durationMs ? ` · ${run.durationMs} ms` : ""}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {search.search.blockedCapabilities.length ? (
              <div className={styles.boundaryList}>
                {search.search.blockedCapabilities.map((item) => <p key={item}>{item}</p>)}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p className={styles.detailEyebrow}>NAVIGATION</p>
            <h2>Select a planet</h2>
            <p className={styles.detailText}>Drag to rotate, scroll to zoom, click any source to inspect its execution mode, health, capabilities and provenance status.</p>
          </>
        )}
      </aside>

      {search?.search.evidence.length ? (
        <section className={styles.evidenceStrip} aria-label="Live search evidence">
          <div className={styles.evidenceHeader}>
            <strong>Live evidence</strong>
            <span>{search.search.evidence.length} source-linked observations · click the gold planets or cards</span>
          </div>
          <div className={styles.evidenceCards}>
            {search.search.evidence.slice(0, 10).map((item, index) => {
              const nodeId = `result:${item.provenanceHash}:${index}`;
              return (
                <button
                  type="button"
                  key={nodeId}
                  onClick={() => setSelected(nodes.find((node) => node.id === nodeId) ?? null)}
                >
                  <span>{item.evidenceClass}</span>
                  <strong>{item.sourceName}</strong>
                  <p>{item.summary}</p>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}
