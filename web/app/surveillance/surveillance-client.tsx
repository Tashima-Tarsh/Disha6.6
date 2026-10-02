"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Download, Fingerprint, Search, ShieldCheck, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/lib/client-fetch";
import type { OperationalFeatureCollection } from "@/lib/geospatial/contracts";
import type { OsintSourceUniverseEntry } from "@/lib/unified/osint-source-universe";
import type { OsintToolCatalogEntry } from "@/lib/unified/osint-tool-catalog";
import type { AdapterMetadata, AdapterEvidence } from "@/lib/unified/osint-adapter-bus";
import styles from "./source-workspace.module.css";
type SearchResult = { generatedAt:string; query:string; kind:string; executedAdapters:string[]; notice?:string; runs:Array<{adapterId:string;status:string;durationMs:number;evidenceCount:number;sample:string;evidence:AdapterEvidence[]}> };
type Props = { initialGeo:OperationalFeatureCollection; sources:OsintSourceUniverseEntry[]; tools:OsintToolCatalogEntry[]; adapters:AdapterMetadata[]; universeSummary?:unknown };
export function SurveillanceClient({initialGeo,sources,tools,adapters}:Props) {
  const [tab,setTab]=useState<"search"|"sources"|"adapters">("search");
  const [query,setQuery]=useState(""); const [filter,setFilter]=useState("");
  const [result,setResult]=useState<SearchResult|null>(null); const [busy,setBusy]=useState(false);
  const [error,setError]=useState(""); const [watchState,setWatchState]=useState(""); const [watchBusy,setWatchBusy]=useState(false);
  const controller=useRef<AbortController|null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const filtered=useMemo(()=>sources.filter(source=>JSON.stringify(source).toLowerCase().includes(filter.toLowerCase())),[sources,filter]);
  const evidenceCount=result?.runs.reduce((sum,run)=>sum+run.evidenceCount,0)??0;
  const failedCount=result?.runs.filter(run=>["failed","timed_out","cancelled"].includes(run.status)).length??0;
  async function search() {
    if(!query.trim()||busy)return;
    controller.current?.abort();controller.current=new AbortController();setBusy(true);setError("");setResult(null);setWatchState("");
    try {
      const response=await authenticatedFetch(`/api/v1/surveillance/osint-search?q=${encodeURIComponent(query.trim())}`,{cache:"no-store",signal:controller.current.signal});
      if(!response.ok)throw new Error(response.status===401?"Your session expired. Sign in again.":`Search unavailable (HTTP ${response.status}). No results have been substituted.`);
      setResult(await response.json() as SearchResult);
    } catch(caught){setError(caught instanceof Error&&caught.name==="AbortError"?"Search cancelled.":caught instanceof Error?caught.message:"Search unavailable.");}
    finally{setBusy(false);}
  }
  function download(){if(!result)return;const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:"application/json"}));const link=document.createElement("a");link.href=url;link.download=`disha-observations-${new Date().toISOString().slice(0,10)}.json`;link.click();URL.revokeObjectURL(url);}
  async function watch(){
    if(!result||watchBusy)return;
    const bundle=result.kind==="domain"?{kind:"domain",domain:result.query}:result.kind==="cve"?{kind:"vulnerability",cve:result.query}:{kind:"topic",query:result.query};
    setWatchBusy(true);setWatchState("");
    try{const response=await authenticatedFetch("/api/v1/osint/watch-bundles",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({bundle,purpose:`Monitor public-source changes for ${result.query}`,reviewOnChange:true})});if(!response.ok)throw new Error(`Watch could not be saved (HTTP ${response.status}).`);const saved=await response.json();setWatchState(`${saved.created} watches saved. The configured worker will run them; review changes in Intelligence.`);}
    catch(caught){setWatchState(caught instanceof Error?caught.message:"Watch unavailable.");}finally{setWatchBusy(false);}
  }
  return <div className={styles.shell}><aside className={styles.sidebar}>
    <Link href="/dashboard" className={styles.brand}><span>D</span><div><strong>DISHA</strong><small>Evidence operating system</small></div></Link>
    <nav aria-label="Workspace"><Link href="/dashboard">Command center</Link><Link href="/workbench">Mission workbench</Link><Link href="/surveillance" aria-current="page">Source intelligence</Link><Link href="/intelligence">Continuous intelligence</Link><Link href="/system">System &amp; controls</Link><Link href="/account">Account</Link></nav>
    <div className={styles.boundary}><ShieldCheck size={20}/><strong>Source before conclusion.</strong><p>Public observations. Traceable evidence. Human review.</p><small>Engineered in India.</small></div>
  </aside><main className={styles.main}>
    <header className={styles.topbar}><span>Intelligence / Sources</span><Link href="/workbench">Open a mission ↗</Link></header>
    <section className={styles.hero}><div><p className={styles.eyebrow}>Public-source intelligence</p><h1>Follow the evidence.</h1><p>Query real registries and public records. Inspect the source, preserve observations, and monitor what changes.</p></div><div className={styles.seal} aria-hidden="true"><Fingerprint size={76}/></div></section>
    <div className={styles.metrics}><div><span>Registered adapters</span><strong>{adapters.length}</strong><small>Execution measured per query</small></div><div><span>Source catalog</span><strong>{sources.length}</strong><small>Catalog entries, not live connections</small></div><div><span>Current query evidence</span><strong>{result?evidenceCount:"—"}</strong><small>{result?`${failedCount} adapters unavailable`:"Run a query to inspect observations"}</small></div></div>
    <div className={styles.tabs} role="group" aria-label="Source views">{(["search","sources","adapters"] as const).map(value=><button key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}>{value==="search"?"Live query":value==="sources"?"Source catalog":"Adapter inventory"}</button>)}</div>
    {tab==="search"&&<section className={styles.panel}><form onSubmit={event=>{event.preventDefault();void search();}} className={styles.search}><Search size={20}/><label className={styles.srOnly} htmlFor="source-query">Domain, IP, CVE, repository or topic</label><input id="source-query" value={query} onChange={event=>setQuery(event.target.value)} maxLength={512} placeholder="Domain, IP, CVE, GitHub repository or topic" required/><button className={styles.primary} disabled={busy||!query.trim()}>{busy?<Loader2 size={16} className={styles.spin}/>:<ArrowUpRight size={16}/>} {busy?"Querying":"Run query"}</button>{busy&&<button type="button" onClick={()=>controller.current?.abort()}>Cancel</button>}</form>
      <div aria-live="polite">{error&&<p className={styles.error} role="alert">{error}</p>}{busy&&<p className={styles.empty}>Contacting public sources. Unavailable sources will be reported individually.</p>}</div>
      {!busy&&!result&&!error&&<div className={styles.empty}><Fingerprint size={38}/><h2>Your evidence starts with a source.</h2><p>Enter a target or topic. Results include retrieval time, source links and provenance hashes.</p><small>No fabricated records or background telemetry.</small></div>}
      {result&&<><div className={styles.resultHeader}><div><h2>{result.query}</h2><small>{result.kind} · Retrieved {new Date(result.generatedAt).toLocaleString()}</small></div><div className={styles.actions}><button onClick={download}><Download size={15}/> Export observations</button>{["domain","cve","entity"].includes(result.kind)&&<button onClick={()=>void watch()} disabled={watchBusy}>{watchBusy?"Saving…":"Monitor changes"}</button>}</div></div><p className={styles.note}>{result.notice}</p>{watchState&&<p role="status">{watchState} <Link href="/intelligence">View intelligence →</Link></p>}
      {!result.runs.length&&<p className={styles.empty}>No permitted adapter supports this query. No observations returned.</p>}
      <div className={styles.results}>{result.runs.map(run=><article key={run.adapterId} className={styles.result}><div className={styles.resultHeading}><h3>{adapters.find(adapter=>adapter.id===run.adapterId)?.name??run.adapterId}</h3><span data-status={run.status}>{run.status.replaceAll("_"," ")}</span></div><p>{run.sample}</p><small>{run.evidenceCount} evidence items · {run.durationMs} ms</small>{run.evidence.map(item=><details key={item.id}><summary>{item.sourceName} · Inspect provenance</summary><p>{item.summary}</p><dl><dt>Retrieved</dt><dd>{item.retrievedAt}</dd><dt>SHA-256 provenance</dt><dd><code>{item.provenanceHash}</code></dd></dl>{item.sourceUrl&&/^https?:\/\//i.test(item.sourceUrl)&&<a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a>}</details>)}</article>)}</div></>}
    </section>}
    {tab==="sources"&&<section className={styles.panel}><div className={styles.resultHeader}><h2>Source catalog</h2><label>Filter <input value={filter} onChange={event=>setFilter(event.target.value)} placeholder="Name, category, capability"/></label></div><p className={styles.note}>A catalog entry is a discovery reference. Credentials, admission and a working adapter may be required.</p><div className={styles.results}>{filtered.map(source=><article className={styles.result} key={source.id}><h3>{source.name}</h3><p>{source.category.replaceAll("_"," ")}</p><small>{source.capabilities.join(" · ")}</small><p>Authentication: {source.auth} · Risk: {source.risk}</p></article>)}</div>{!filtered.length&&<p className={styles.empty}>No sources match this filter.</p>}</section>}
    {tab==="adapters"&&<section className={styles.panel}><h2>Executable adapter inventory</h2><p className={styles.note}>Registered in the runtime. Configuration does not prove connectivity; query results show actual execution status.</p><div className={styles.results}>{adapters.map(adapter=><article className={styles.result} key={adapter.id}><h3>{adapter.name}</h3><p>{adapter.capability.replaceAll("_"," ")}</p><small>Auth: {adapter.auth} · Timeout: {adapter.timeoutMs/1000}s · {adapter.defaultEnabled===false?"Disabled":"Registered"}</small>{adapter.upstreamRepository&&<p><a href={adapter.upstreamRepository} target="_blank" rel="noreferrer">Upstream repository ↗</a></p>}</article>)}</div><p className={styles.note}>{tools.length} tools documented in the broader catalog. {initialGeo.features.length} admitted geographic records available in the command-center map.</p><Link href="/dashboard">Inspect the operational map →</Link></section>}
    <footer className={styles.footer}>DISHA 6.6 <span>Observations inform analysis. Evidence supports decisions.</span></footer>
  </main></div>;
}
