"use client";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import styles from "@/app/investigate/investigate.module.css";

const choices = [
  ["auto", "AUTO"],
  ["person_name", "NAME"],
  ["vehicle_identifier", "VEHICLE"],
  ["phone", "MOBILE"],
  ["email", "EMAIL"],
  ["username", "USERNAME"],
  ["company", "COMPANY"],
  ["domain", "DOMAIN"],
  ["ip", "IP"],
  ["asn", "ASN"],
  ["url", "URL"],
  ["repository", "REPOSITORY"],
  ["file_hash", "HASH"],
  ["ioc", "IOC"],
  ["certificate", "CERTIFICATE"],
  ["cve", "CVE"],
  ["location", "LOCATION"],
  ["document", "DOCUMENT"],
  ["norad_id", "NORAD ID"],
  ["topic", "TOPIC"],
] as const;

export function InvestigationSearch({ busy, onSearch }: { busy: boolean; onSearch: (target: string, targetType: string) => void }) {
  const [target, setTarget] = useState("");
  const [type, setType] = useState("auto");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (target.trim()) onSearch(target.trim(), type);
  };

  return <form onSubmit={submit} className={styles.searchForm}>
    <label className={styles.searchLabel} htmlFor="investigation-target">Where does your investigation begin?</label>
    <div className={styles.searchBox}>
      <Search size={21} aria-hidden="true" />
      <input
        id="investigation-target"
        value={target}
        onChange={event => setTarget(event.target.value)}
        maxLength={512}
        placeholder="Search name, vehicle, mobile, email, username, company, domain, IP, hash…"
        autoComplete="off"
        spellCheck={false}
        disabled={busy}
        autoFocus
      />
      <button type="submit" disabled={busy || !target.trim()} aria-label="Start investigation">
        {busy ? "Starting…" : <ArrowUpRight size={22} />}
      </button>
    </div>
    <div className={styles.searchOptions}>
      <label>
        Search type
        <select value={type} onChange={event => setType(event.target.value)} disabled={busy}>
          {choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <span>Relevant configured sources are selected automatically</span>
    </div>
  </form>;
}
