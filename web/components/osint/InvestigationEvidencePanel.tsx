"use client";
import { useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";
import { safeSourceUrl, type InvestigationEvidence } from "@/lib/investigation/types";
import styles from "@/app/investigate/investigate.module.css";
export function InvestigationEvidencePanel({ evidence, status, onClose }: { evidence: InvestigationEvidence; status: string; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    close.current?.focus();
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); if (previous instanceof HTMLElement) previous.focus(); };
  }, [onClose]);
  const url = safeSourceUrl(evidence.sourceUrl);
  const rows = [["Source", evidence.sourceName], ["Source status", status], ["Provider record", evidence.providerRecordId ?? "Not supplied"], ["Retrieved at", evidence.retrievedAt], ["Observed at", evidence.observedAt ?? "Not supplied"], ["Adapter", evidence.adapterId], ["Evidence ID", evidence.evidenceId], ["Candidate", evidence.candidateId ?? "No identity association"], ["Corroboration", evidence.corroborationState], ["Contradiction", evidence.contradictionState], ["SHA-256", evidence.contentHash], ["Provenance hash", evidence.provenanceHash]];
  return <aside className={styles.evidencePanel} role="dialog" aria-label="Evidence details"><div className={styles.panelHeading}><span>SOURCE RECORD</span><button ref={close} onClick={onClose} aria-label="Close evidence details"><X size={20} /></button></div><h2>{evidence.summary}</h2>{url && <a href={url} target="_blank" rel="noopener noreferrer">Open source <ExternalLink size={14} /></a>}<dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><details><summary>Returned record fields</summary><pre>{JSON.stringify(evidence.fields, null, 2)}</pre></details><p>Source records are observations. A shared name does not confirm identity.</p></aside>;
}
