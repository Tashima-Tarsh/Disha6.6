"use client";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { SEARCH_TARGET_CHOICES } from "@/lib/unified/search-targets";
import styles from "@/app/investigate/investigate.module.css";

const quickChoices = SEARCH_TARGET_CHOICES.filter(([value]) => value !== "auto");

export function InvestigationSearch({ busy, onSearch }: { busy: boolean; onSearch: (target: string, targetType: string, identityAuthorization: boolean, activeAuthorization: boolean) => void }) {
  const [target, setTarget] = useState("");
  const [type, setType] = useState("auto");
  const [identityAuthorization, setIdentityAuthorization] = useState(true);
  const [activeAuthorization, setActiveAuthorization] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (target.trim()) onSearch(target.trim(), type, identityAuthorization, activeAuthorization);
  };

  return (
    <form onSubmit={submit} className={styles.searchForm}>
      <label className={styles.searchLabel} htmlFor="investigation-target">
        Where does your investigation begin?
      </label>

      <div className={styles.searchBox}>
        <Search size={21} aria-hidden="true" />
        <input
          id="investigation-target"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          maxLength={512}
          placeholder="Search name, vehicle, phone, email, username, company, domain, IP, hash…"
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
          <select value={type} onChange={(event) => setType(event.target.value)} disabled={busy}>
            {SEARCH_TARGET_CHOICES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className={styles.autoTypeButton}
          type="button"
          aria-pressed={type === "auto"}
          disabled={busy}
          onClick={() => setType("auto")}
        >
          AUTO DETECT
        </button>
        <label>
          <input
            type="checkbox"
            checked={identityAuthorization}
            onChange={(event) => setIdentityAuthorization(event.target.checked)}
            disabled={busy}
          />
          Authorized identity lookup
        </label>
        <label>
          <input
            type="checkbox"
            checked={activeAuthorization}
            onChange={(event) => setActiveAuthorization(event.target.checked)}
            disabled={busy}
          />
          Authorized public-site crawl
        </label>
        <span>Relevant configured sources run automatically</span>
      </div>

      <div className={styles.targetQuickSection}>
        <span className={styles.targetQuickLabel}>Search by</span>
        <div className={styles.targetQuickGrid} role="group" aria-label="Investigation target type">
          {quickChoices.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={styles.targetQuickButton}
              aria-pressed={type === value}
              disabled={busy}
              onClick={() => setType(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
