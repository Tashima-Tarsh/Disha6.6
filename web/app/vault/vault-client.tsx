"use client";

import { useState } from "react";
import {
  Lock,
  ShieldCheck,
  Search,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Hash,
} from "lucide-react";
import { DishaShellNav } from "@/components/shell/DishaShellNav";
import type { DISHAEvidenceVaultArtifact } from "@/lib/unified/canonical/types";
import styles from "./vault.module.css";

type PrincipalView = { email: string; roles: string[] };

export function VaultClient({ principal }: { principal: PrincipalView }) {
  const [queryUri, setQueryUri] = useState("https://egazette.gov.in/notification/2026/09/cag-procurement.pdf");
  const [versions, setVersions] = useState<DISHAEvidenceVaultArtifact[]>([]);
  const [searching, setSearching] = useState(false);
  const [storeUri, setStoreUri] = useState("https://cert-in.org.in/advisories/CIAD-2026-0042");
  const [storeAuthority, setStoreAuthority] = useState("CERT-In National CSIRT");
  const [storeContent, setStoreContent] = useState(
    "CRITICAL VULNERABILITY ALERT: Actively exploited remote code execution vulnerability in edge enterprise VPN gateway appliances. Mitigation guidance: Apply vendor hotfix build 14.2.1 immediately.",
  );
  const [storedArtifact, setStoredArtifact] = useState<DISHAEvidenceVaultArtifact | null>(null);
  const [storing, setStoring] = useState(false);

  async function searchHistory() {
    if (!queryUri) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/canonical/vault?sourceUri=${encodeURIComponent(queryUri)}`);
      if (res.ok) {
        const json = await res.json();
        setVersions(json.versions ?? []);
      }
    } catch {
      // safe fallback
    } finally {
      setSearching(false);
    }
  }

  async function storeNewEvidence() {
    if (!storeUri || !storeContent) return;
    setStoring(true);
    try {
      const res = await fetch("/api/canonical/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUri: storeUri,
          sourceAuthority: storeAuthority,
          content: storeContent,
          retrievalMethod: "http_get",
          accessClassification: "public",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setStoredArtifact(json.artifact);
      }
    } catch {
      // safe fallback
    } finally {
      setStoring(false);
    }
  }

  return (
    <div className={styles.shell}>
      <DishaShellNav />

      <main className={styles.main}>
        <header className={styles.hero}>
          <div>
            <span className={styles.kicker}>CRYPTOGRAPHIC PROVENANCE SYSTEM</span>
            <h1 className={styles.title}>Immutable Evidence Vault</h1>
            <p className={styles.subtitle}>
              SHA-256 content-hash evidence preservation. Admitted artifacts are never mutated in-place; source updates create linked new versions with automated line diffs.
            </p>
          </div>
        </header>

        <div className={styles.grid}>
          {/* Ingest / Deposit Evidence */}
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <UploadCloud size={18} />
              <h2>Deposit Admitted Evidence Artifact</h2>
            </div>

            <div className={styles.fieldGroup}>
              <label>Source URI / Canonical Pointer</label>
              <input
                type="text"
                value={storeUri}
                onChange={(e) => setStoreUri(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Source Authority</label>
              <input
                type="text"
                value={storeAuthority}
                onChange={(e) => setStoreAuthority(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Admitted Raw Record / Text</label>
              <textarea
                rows={5}
                value={storeContent}
                onChange={(e) => setStoreContent(e.target.value)}
                className={styles.textarea}
              />
            </div>

            <button
              onClick={storeNewEvidence}
              disabled={storing}
              className={styles.actionBtn}
              type="button"
            >
              <Lock size={16} />
              <span>{storing ? "HASHING & SEALING..." : "SEAL EVIDENCE INTO VAULT"}</span>
            </button>

            {storedArtifact && (
              <div className={styles.successSeal}>
                <CheckCircle2 size={18} className={styles.checkIcon} />
                <div>
                  <strong>SEALED AS VERSION {storedArtifact.versionIndex}</strong>
                  <div className={styles.hashBox}>
                    <Hash size={12} />
                    <span>SHA-256: {storedArtifact.contentHash}</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Provenance & Version History Search */}
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <Search size={18} />
              <h2>Audit Evidence Provenance Chain</h2>
            </div>

            <div className={styles.fieldGroup}>
              <label>Target Source URI</label>
              <div className={styles.searchRow}>
                <input
                  type="text"
                  value={queryUri}
                  onChange={(e) => setQueryUri(e.target.value)}
                  className={styles.input}
                />
                <button
                  onClick={searchHistory}
                  disabled={searching}
                  className={styles.searchBtn}
                  type="button"
                >
                  <Search size={16} />
                  <span>AUDIT</span>
                </button>
              </div>
            </div>

            {versions.length > 0 ? (
              <div className={styles.versionList}>
                {versions.map((v) => (
                  <div key={v.artifactId} className={styles.versionItem}>
                    <div className={styles.vHeader}>
                      <span className={styles.vBadge}>VERSION {v.versionIndex}</span>
                      <small>{new Date(v.createdAt).toLocaleString()}</small>
                    </div>
                    <div className={styles.hashText}>SHA: {v.contentHash}</div>
                    <div className={styles.authorityText}>AUTHORITY: {v.sourceAuthority}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyNotice}>
                <FileText size={24} />
                <span>Enter an admitted source URI to audit its SHA-256 content hash and version lineage.</span>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
