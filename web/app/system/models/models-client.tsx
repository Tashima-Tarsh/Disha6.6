"use client";

import {
  Brain,
  Check,
  CheckCircle2,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  FileCode,
  Flame,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Unlock,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ModelEntry } from "@/lib/unified/model-gateway";
import { DishaCommandShell } from "@/components/shell/DishaCommandShell";
import styles from "./models.module.css";

interface ModelsClientProps {
  principal?: {
    email: string;
    roles?: string[];
  };
}

export function ModelsClient({ principal }: ModelsClientProps) {
  const [catalog, setCatalog] = useState<ModelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localOnlyMode, setLocalOnlyMode] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "local" | "reasoning" | "coding" | "vision" | "cloud">("all");
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [benchmarks, setBenchmarks] = useState<Record<string, Record<string, boolean>>>({});
  const [togglingMode, setTogglingMode] = useState(false);

  async function fetchCatalog() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/runtime/models/catalog", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCatalog(data.catalog || []);
      setLocalOnlyMode(Boolean(data.localOnlyMode));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load model catalog");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Defer initial catalog retrieval until after mounting to avoid a synchronous state cascade.
    const timer = window.setTimeout(() => { void fetchCatalog(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleTogglePrivacyMode() {
    setTogglingMode(true);
    try {
      const targetState = !localOnlyMode;
      const res = await fetch("/api/v1/runtime/models/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localOnlyMode: targetState }),
      });
      if (res.ok) {
        const data = await res.json();
        setLocalOnlyMode(Boolean(data.localOnlyMode));
      }
    } finally {
      setTogglingMode(false);
    }
  }

  async function runModelBenchmark(modelTag: string) {
    setTestingModel(modelTag);
    try {
      const res = await fetch("/api/v1/runtime/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelTag }),
      });
      if (res.ok) {
        const data = await res.json();
        setBenchmarks((prev) => ({
          ...prev,
          [modelTag]: data.capabilities || {},
        }));
      }
    } finally {
      setTestingModel(null);
    }
  }

  const filteredModels = catalog.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.tag.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (m.family && m.family.toLowerCase().includes(searchFilter.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeCategory === "local") return m.isLocal;
    if (activeCategory === "cloud") return !m.isLocal;
    if (activeCategory === "reasoning") return m.capabilities.reasoning;
    if (activeCategory === "coding") return m.capabilities.tool_calling || m.tag.includes("coder");
    if (activeCategory === "vision") return m.capabilities.vision;
    return true;
  });

  const localCount = catalog.filter((m) => m.isLocal).length;
  const reasoningCount = catalog.filter((m) => m.capabilities.reasoning).length;
  const toolCount = catalog.filter((m) => m.capabilities.tool_calling).length;

  return (
    <DishaCommandShell principal={principal}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.titleCluster}>
            <div className={styles.iconBox}>
              <Cpu size={24} />
            </div>
            <div>
              <h1 className={styles.title}>UNIVERSAL AI MODEL GATEWAY</h1>
              <div className={styles.subtitle}>
                DISHA 6.6 SOVEREIGN INFERENCE · OLLAMA LIBRARY · LANGCHAIN &amp; MCP TOOL FABRIC
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <div
              className={`${styles.privacyLockCard} ${
                localOnlyMode ? styles.privacyLockActive : styles.privacyLockInactive
              }`}
            >
              <div
                className={`${styles.lockDot} ${
                  localOnlyMode ? styles.dotActive : styles.dotInactive
                }`}
              />
              <span>
                {localOnlyMode ? "LOCAL-ONLY LOCKDOWN" : "CLOUD EGRESS PERMITTED"}
              </span>
              <button
                type="button"
                onClick={handleTogglePrivacyMode}
                disabled={togglingMode}
                className={styles.toggleBtn}
                title="Toggle Local-Only Privacy Boundary"
              >
                {togglingMode ? (
                  <Loader2 size={12} className={styles.spin} />
                ) : localOnlyMode ? (
                  "Disable Lock"
                ) : (
                  "Enforce Lock"
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={fetchCatalog}
              disabled={loading}
              className={styles.toggleBtn}
              title="Refresh installed models"
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* KPI Banner */}
        <section className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>TOTAL MODELS IN CATALOGUE</span>
            <div className={styles.kpiValue}>{catalog.length}</div>
            <span className={styles.kpiSub}>Alibaba, DeepSeek, Google, Meta, Mistral</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>LOCAL SOVEREIGN INFERENCE</span>
            <div className={styles.kpiValue}>{localCount}</div>
            <span className={styles.kpiSub}>Ollama Docker Daemon (127.0.0.1:11434)</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>EPISTEMIC REASONING (CoT)</span>
            <div className={styles.kpiValue}>{reasoningCount}</div>
            <span className={styles.kpiSub}>DeepSeek R1 / Qwen Thought Chains</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>TOOL CALLING &amp; MCP READY</span>
            <div className={styles.kpiValue}>{toolCount}</div>
            <span className={styles.kpiSub}>43 Sovereign OSINT Adapters</span>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <div className={styles.controlsBar}>
          <div className={styles.filterTabs}>
            <button
              type="button"
              className={`${styles.filterBtn} ${activeCategory === "all" ? styles.filterBtnActive : ""}`}
              onClick={() => setActiveCategory("all")}
            >
              All Profiles ({catalog.length})
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${activeCategory === "local" ? styles.filterBtnActive : ""}`}
              onClick={() => setActiveCategory("local")}
            >
              Local Ollama ({localCount})
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${activeCategory === "reasoning" ? styles.filterBtnActive : ""}`}
              onClick={() => setActiveCategory("reasoning")}
            >
              Reasoning CoT ({reasoningCount})
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${activeCategory === "coding" ? styles.filterBtnActive : ""}`}
              onClick={() => setActiveCategory("coding")}
            >
              Cyber &amp; Tools ({toolCount})
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${activeCategory === "vision" ? styles.filterBtnActive : ""}`}
              onClick={() => setActiveCategory("vision")}
            >
              Multimodal Vision
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${activeCategory === "cloud" ? styles.filterBtnActive : ""}`}
              onClick={() => setActiveCategory("cloud")}
            >
              Cloud Opt-In
            </button>
          </div>

          <div className={styles.searchBox}>
            <Search size={14} color="#7f93a7" />
            <input
              type="text"
              placeholder="Search model, tag, family (qwen, deepseek, llama)..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Model Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#7f93a7" }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            <div>Probing local Ollama daemon &amp; catalog registry...</div>
          </div>
        ) : (
          <div className={styles.modelGrid}>
            {filteredModels.map((model) => {
              const testResult = benchmarks[model.tag];
              const isTesting = testingModel === model.tag;

              return (
                <article key={model.id} className={styles.modelCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h2 className={styles.modelName}>{model.name}</h2>
                      <div className={styles.modelTag}>{model.tag}</div>
                    </div>
                    <span
                      className={`${styles.providerPill} ${
                        model.isLocal ? styles.pillLocal : styles.pillCloud
                      }`}
                    >
                      {model.isLocal ? "Ollama Local" : "Cloud Opt-In"}
                    </span>
                  </div>

                  <p className={styles.modelDesc}>{model.description}</p>

                  <div className={styles.metaRow}>
                    {model.quantization ? (
                      <span className={styles.metaBadge}>Quant: {model.quantization}</span>
                    ) : null}
                    {model.contextWindow ? (
                      <span className={styles.metaBadge}>
                        Ctx: {(model.contextWindow / 1024).toFixed(0)}K
                      </span>
                    ) : null}
                    {model.vramEstimateMb ? (
                      <span className={styles.metaBadge}>
                        VRAM: ~{(model.vramEstimateMb / 1024).toFixed(1)} GB
                      </span>
                    ) : null}
                    {model.license ? (
                      <span className={styles.metaBadge} style={{ color: "#d5a75b" }}>
                        {model.license}
                      </span>
                    ) : null}
                  </div>

                  {/* Capabilities Cluster */}
                  <div className={styles.capabilitiesCluster}>
                    <span className={`${styles.capBadge} ${model.capabilities.chat ? styles.capActive : ""}`}>
                      Chat {testResult?.chat ? "✓" : ""}
                    </span>
                    <span className={`${styles.capBadge} ${model.capabilities.reasoning ? styles.capActive : ""}`}>
                      Reasoning CoT {testResult?.reasoning ? "✓" : ""}
                    </span>
                    <span className={`${styles.capBadge} ${model.capabilities.tool_calling ? styles.capActive : ""}`}>
                      Tool Calling {testResult?.tool_calling ? "✓" : ""}
                    </span>
                    <span className={`${styles.capBadge} ${model.capabilities.structured_output ? styles.capActive : ""}`}>
                      JSON Schema {testResult?.structured_output ? "✓" : ""}
                    </span>
                    {model.capabilities.vision ? (
                      <span className={`${styles.capBadge} ${styles.capActive}`}>
                        Vision
                      </span>
                    ) : null}
                  </div>

                  {/* Footer & Actions */}
                  <div className={styles.cardFooter}>
                    <div className={styles.statusIndicator}>
                      <div className={styles.statusDot} />
                      <span>{model.status.toUpperCase()}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => runModelBenchmark(model.tag)}
                      disabled={isTesting}
                      className={styles.testBtn}
                      title="Run live capability smoke test"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} />
                          <span>Benchmark</span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </DishaCommandShell>
  );
}
