"use client";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { SEARCH_TARGET_CHOICES } from "@/lib/unified/search-targets";
import styles from "@/app/investigate/investigate.module.css";

export function InvestigationSearch({ busy, onSearch }: { busy: boolean; onSearch: (target: string, targetType: string) => void }) {
  const [target, setTarget] = useState("");
  const [type, setType] = useState("auto");
  const submit = (event: FormEvent) => { event.preventDefault(); if (target.trim()) onSearch(target.trim(), type); };
  return <form onSubmit={submit} className={styles.searchForm}>
    <label className={styles.searchLabel} htmlFor="investigation-target">Where does your investigation begin?</label>
    <div className={styles.searchBox}><Search size={21} aria-hidden="true" /><input id="investigation-target" value={target} onChange={event => setTarget(event.target.value)} maxLength={512} placeholder="Search name, vehicle, phone, email, username, company, domain, IP, hash…" autoComplete="off" spellCheck={false} disabled={busy} autoFocus /><button type="submit" disabled={busy || !target.trim()} aria-label="Start investigation">{busy ? "Starting…" : <ArrowUpRight size={22} />}</button></div>
    <div className={styles.searchOptions}><label>Search type <select value={type} onChange={event => setType(event.target.value)} disabled={busy}>{SEARCH_TARGET_CHOICES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><span>Sources selected automatically</span></div>
  </form>;
}
