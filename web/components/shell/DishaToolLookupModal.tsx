"use client";

import { authFetchHeaders } from "@/lib/utils";

import { useEffect, useRef, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Check, Copy, Loader2, Search, X, ShieldAlert, Sparkles, Database } from "lucide-react";
import styles from "./disha-tool-lookup-modal.module.css";

export interface ToolDef {
  id: string;
  name: string;
  category: string;
  iconName: string;
  description: string;
  placeholder: string;
  sampleTargets: string[];
  inputType?: "text" | "number" | "url";
  upstreamUrl?: string;
  executionMode?: "live_api" | "vehicle" | "osint_bus" | "framework";
  initialTarget?: string;
}

interface DishaToolLookupModalProps {
  tool: ToolDef | null;
  onClose: () => void;
  onSendToCopilot?: (query: string) => void;
}

interface LeakRecord {
  id?: string;
  entity?: string;
  year?: string | number;
  recordsLeaked?: string | number;
  targetType?: string;
  method?: string;
  sensitivity?: string;
  description?: string;
  source?: string;
}

interface SearchResponsePayload {
  leakDatabase?: {
    summary?: string;
    totalMatches?: number;
    records?: LeakRecord[];
  };
  [key: string]: unknown;
}

export function DishaToolLookupModal({ tool, onClose, onSendToCopilot }: DishaToolLookupModalProps) {
  const [target, setTarget] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SearchResponsePayload | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"dossier" | "json">("dossier");
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTarget(tool?.initialTarget ?? "");
      setAuthorized(false);
      setResult(null);
      setError("");
      setBusy(false);
      setCopied(false);
      setActiveTab("dossier");
    }, 0);
    return () => { window.clearTimeout(timer); request.current?.abort(); };
  }, [tool?.id, tool?.initialTarget]);

  async function execute(event?: FormEvent) {
    if (event) event.preventDefault();
    if (!tool || !target.trim() || !authorized || busy) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setResult(null);

    const vehicle = tool.id === "vehicle-rto" || tool.id === "parivahan";
    try {
      const response = await fetch(vehicle ? "/api/v1/vehicles/lookup" : "/api/v1/surveillance/osint-search", {
        method: "POST",
        credentials: "same-origin",
        signal: controller.signal,
        headers: authFetchHeaders(),
        body: JSON.stringify(
          vehicle
            ? { registration_number: target.trim(), purpose: "investigation" }
            : { query: target.trim(), toolId: tool.id }
        ),
      });

      const rawText = await response.text();
      let payload: SearchResponsePayload;
      try {
        payload = JSON.parse(rawText) as SearchResponsePayload;
      } catch {
        throw new Error(rawText.slice(0, 200) || `Lookup returned HTTP ${response.status}`);
      }

      if (!response.ok) {
        throw new Error((payload as { error?: string })?.error || `Lookup returned HTTP ${response.status}. Check service readiness and tool configuration.`);
      }

      if (!controller.signal.aborted) {
        setResult(payload);
        if (payload?.leakDatabase?.records && payload.leakDatabase.records.length > 0) {
          setActiveTab("dossier");
        }
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : "Lookup failed.");
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the response. Select the text to copy it manually.");
    }
  }

  const isBreachTool =
    tool?.id === "leak-database" ||
    tool?.id === "biggest-data-breaches" ||
    tool?.id === "hibp-breach-audit" ||
    tool?.id === "wikileaks-spyfiles" ||
    Boolean(result?.leakDatabase);

  const leakRecords = result?.leakDatabase?.records ?? [];
  const leakSummary = result?.leakDatabase?.summary;

  return (
    <Dialog.Root open={Boolean(tool)} onOpenChange={open => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.window}>
          <header className={styles.header}>
            <div>
              <span>DISHA 6.6 / SOVEREIGN LOOKUP</span>
              <Dialog.Title>{tool?.name.replace(/All \d+ /g, "").replace(/532 /g, "")}</Dialog.Title>
            </div>
            <Dialog.Close className={styles.iconButton} aria-label="Close tool window">
              <X size={18} />
            </Dialog.Close>
          </header>

          <div className={styles.body}>
            <Dialog.Description className={styles.description}>
              {tool?.description ?? "Execute verified sovereign lookup against live surveillance, databases, and OSINT indices."}
            </Dialog.Description>

            <form onSubmit={execute}>
              <label className={styles.label} htmlFor="tool-target">
                Target Identifier / Query
              </label>
              <div className={styles.inputRow}>
                <Search size={17} />
                <input
                  id="tool-target"
                  value={target}
                  onChange={event => setTarget(event.target.value)}
                  placeholder={tool?.placeholder ?? "Enter target..."}
                  disabled={busy}
                  autoComplete="off"
                  autoFocus
                />
              </div>

              {tool?.sampleTargets && tool.sampleTargets.length > 0 && (
                <div className={styles.sampleTargetsRow}>
                  {tool.sampleTargets.map(sample => (
                    <button
                      key={sample}
                      type="button"
                      className={styles.sampleTargetChip}
                      onClick={() => {
                        setTarget(sample);
                        setAuthorized(true);
                      }}
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              )}

              <label className={styles.consent}>
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={event => setAuthorized(event.target.checked)}
                  disabled={busy}
                />
                I confirm official authorization and lawful investigative purpose under Section 63 BSA rules.
              </label>

              <button
                className={styles.execute}
                type="submit"
                disabled={!target.trim() || !authorized || busy}
              >
                {busy ? <Loader2 size={16} className={styles.spin} /> : <ArrowUpRight size={16} />}
                {busy ? "Executing Sovereign Lookup…" : "Run Lookup"}
              </button>
            </form>

            {error && <p role="alert" className={styles.error}>{error}</p>}

            {result !== null && (
              <section className={styles.result} aria-label="Returned response">
                <div className={styles.resultHeader}>
                  {isBreachTool ? (
                    <div className={styles.tabSwitcher}>
                      <button
                        type="button"
                        className={`${styles.tabBtn} ${activeTab === "dossier" ? styles.tabBtnActive : ""}`}
                        onClick={() => setActiveTab("dossier")}
                      >
                        Dossier Cards ({leakRecords.length})
                      </button>
                      <button
                        type="button"
                        className={`${styles.tabBtn} ${activeTab === "json" ? styles.tabBtnActive : ""}`}
                        onClick={() => setActiveTab("json")}
                      >
                        Raw JSON
                      </button>
                    </div>
                  ) : (
                    <h3 style={{ margin: 0, fontSize: "12px", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "1px" }}>
                      Service Response
                    </h3>
                  )}

                  <button className={styles.copyBtn} onClick={() => void copy()}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy JSON"}
                  </button>
                </div>

                {isBreachTool && activeTab === "dossier" ? (
                  <div>
                    {leakSummary && (
                      <div className={styles.breachSummaryBanner}>
                        <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                        <span>{leakSummary}</span>
                      </div>
                    )}

                    {leakRecords.length > 0 ? (
                      <div className={styles.breachCardsList}>
                        {leakRecords.map((record, index) => (
                          <div key={record.id || index} className={styles.breachCard}>
                            <div className={styles.breachCardHeader}>
                              <span className={styles.breachEntityName}>{record.entity}</span>
                              {record.year && (
                                <span className={styles.breachYearBadge}>Year {record.year}</span>
                              )}
                            </div>

                            <div className={styles.breachPillsRow}>
                              {record.recordsLeaked && (
                                <span className={styles.recordCountPill}>
                                  {record.recordsLeaked} Records Leaked
                                </span>
                              )}
                              {record.method && (
                                <span className={styles.leakMethodPill}>
                                  Vector: {record.method}
                                </span>
                              )}
                              {record.targetType && (
                                <span className={styles.leakMethodPill}>
                                  Sector: {record.targetType}
                                </span>
                              )}
                              {record.sensitivity && (
                                <span className={styles.sensitivityPill}>
                                  {record.sensitivity}
                                </span>
                              )}
                            </div>

                            {record.description && (
                              <p className={styles.breachNarrative}>{record.description}</p>
                            )}

                            <div className={styles.breachCardFooter}>
                              <span>Source Citation: {record.source || "Sovereign Leak Archive"}</span>
                              <button
                                type="button"
                                className={styles.investigateBtn}
                                onClick={() => {
                                  onSendToCopilot?.(
                                    `Analyze data breach incident for ${record.entity} (${record.year}): ${record.recordsLeaked} records compromised via ${record.method}.`
                                  );
                                  onClose();
                                }}
                              >
                                <Sparkles size={12} />
                                Investigate with AI
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.cleanExposureCard}>
                        <Database size={24} style={{ margin: "0 auto 8px", display: "block", color: "#10b981" }} />
                        <strong>Zero Breach Matches Recorded</strong>
                        No historical compromise entries found for target &quot;{target}&quot; in the sovereign leak datasets. Verified clean audit log recorded under Section 63 BSA.
                      </div>
                    )}
                  </div>
                ) : (
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                )}
              </section>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export default DishaToolLookupModal;
