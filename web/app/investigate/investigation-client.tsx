"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Circle, X } from "lucide-react";
import { InvestigationSearch } from "@/components/osint/InvestigationSearch";
import { ImageInvestigationUpload } from "@/components/osint/ImageInvestigationUpload";
import { InvestigationEvidencePanel } from "@/components/osint/InvestigationEvidencePanel";
import { InvestigationSourceStatus } from "@/components/osint/InvestigationSourceStatus";
import { InvestigationSession } from "@/lib/investigation/session";
import type { Investigation } from "@/lib/investigation/types";
import styles from "./investigate.module.css";
const Universe = dynamic(() => import("@/components/osint/DishaOsintUniverse3D").then(module => module.DishaOsintUniverse3D), { ssr: false });
export function InvestigationClient({ email }: { email: string }) {
  const [active, setActive] = useState<Investigation | null>(null);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"universe" | "evidence">("universe");
  const session = useRef<InvestigationSession | null>(null);
  const closePanel = useCallback(() => setSelected(null), []);
  useEffect(() => {
    const current = new InvestigationSession(value => { setActive(value); if (!value) { setSelected(null); setView("universe"); } }, setError);
    session.current = current;
    const leave = () => current.dispose();
    window.addEventListener("pagehide", leave);
    return () => { window.removeEventListener("pagehide", leave); current.dispose(); };
  }, []);
  async function start(input: { target: string; targetType: string; identityAuthorization?: boolean } | File) {
    setBusy(true); setError("");
    try { await session.current?.start(input); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "INVESTIGATION SERVICE FAILED"); }
    finally { setBusy(false); }
  }
  async function close() {
    setClosing(true); setError("");
    try { await session.current?.close(); }
    catch (failure) { setError(`Cleanup not confirmed. ${failure instanceof Error ? failure.message : "Retry Close investigation."}`); }
    finally { setClosing(false); }
  }
  const evidence = active?.evidence.find(item => item.evidenceId === selected);
  const hasResults = Boolean(active?.evidence.length);
  return <main className={styles.screen}>
    <header className={styles.header}><Link className={styles.brand} href="/investigate" onClick={event => { if (active) { event.preventDefault(); void close(); } }}><span className={styles.brandIcon}>D</span> DISHA <span>6.6</span></Link><nav aria-label="Investigation navigation"><button disabled={closing || busy} onClick={() => { if (active) void close(); }}>New investigation</button><details className={styles.command}><summary>Command</summary><div><Link href="/operations">Operations <ArrowUpRight size={14} /></Link><Link href="/system">System</Link><Link href="/workbench">Workbench</Link></div></details><details className={styles.profile}><summary>Profile</summary><p>{email}</p></details></nav></header>
    <div className={styles.scene} data-active={Boolean(active)}><Universe investigation={active} onSelect={setSelected} />
      {!active && <section className={styles.searchStage}><p className={styles.eyebrow}><Circle size={8} fill="currentColor" /> INVESTIGATION UNIVERSE</p><h1>Start with a question.<br /><span>Follow the evidence.</span></h1><p className={styles.intro}>One search. Public sources. Every finding traceable.</p><InvestigationSearch busy={busy} onSearch={(target, targetType, identityAuthorization) => void start({ target, targetType, identityAuthorization })} /><ImageInvestigationUpload busy={busy} onUpload={file => void start(file)} /></section>}
      {active && <><section className={styles.activeHeading}><p className={styles.eyebrow}>INVESTIGATION UNIVERSE / {active.targetType.replaceAll("_", " ")}</p><h1>{active.normalizedTarget}</h1><p>{active.status === "COMPLETED" ? `${active.evidence.length} source records` : "Checking public sources…"} · Temporary session</p><div className={styles.viewTabs}><button onClick={() => setView("universe")} aria-pressed={view === "universe"}>Universe</button>{hasResults && <button onClick={() => setView("evidence")} aria-pressed={view === "evidence"}>Evidence ({active.evidence.length})</button>}<button className={styles.closeInvestigation} onClick={() => void close()} disabled={closing}><X size={14} /> {closing ? "Confirming cleanup…" : "Close investigation"}</button></div></section><InvestigationSourceStatus runs={active.runs} />
      {active.status === "COMPLETED" && !hasResults && <div className={styles.noResults}><strong>NO SOURCE-BACKED RESULTS</strong><p>Review source activity for unavailable or unconfigured providers.</p></div>}
      {hasResults && <section className={`${styles.results} ${view === "evidence" ? styles.resultsExpanded : ""}`} aria-label="Investigation results"><div className={styles.resultsHeading}><span>SOURCE RECORDS</span><small>Identity matches remain unverified</small></div>{active.candidateClusters.length > 0 && <div className={styles.candidates}>{active.candidateClusters.map((candidate, index) => <button key={candidate.candidateId} onClick={() => setSelected(candidate.evidenceIds[0])}><span>Candidate {index + 1}</span><strong>{candidate.label}</strong><small>{candidate.attributes.description} · {candidate.status.replaceAll("_", " ")}</small></button>)}</div>}<div className={styles.evidenceList}>{active.evidence.map(item => <button key={item.evidenceId} onClick={() => setSelected(item.evidenceId)}><small>{item.sourceName}</small><span>{item.summary}</span><ArrowUpRight size={16} /></button>)}</div></section>}
      </>}
      {error && <div className={styles.error} role="alert">{error}</div>}
    </div>
    <footer className={styles.footer}><span><i /> SEARCH · VIEW · CLOSE · CLEAR</span><span>{active ? `Expires ${new Date(active.expiresAt).toLocaleTimeString()}` : "Category orbits show navigation, not findings"}</span><span>REAL DATA OR NO DATA</span></footer>
    {evidence && <InvestigationEvidencePanel evidence={evidence} status={active?.runs.find(run => run.adapterId === evidence.adapterId)?.status ?? "COMPLETED"} onClose={closePanel} />}
  </main>;
}
