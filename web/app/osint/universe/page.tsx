"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, Shield, Terminal, Globe, User, Database, Layers,
  Play, X, AlertTriangle, CheckCircle, ExternalLink, RefreshCw,
  Cpu, Lock, Filter, Activity, FileText, Compass, Clock, Key
} from "lucide-react";

export type OsintTool = {
  toolId: string;
  name: string;
  fullName: string;
  upstreamUrl: string;
  category: string;
  runtimeType: string;
  status: string;
  healthStatus: string;
  license: string;
  executionClass: string;
  targetInputs: string[];
  workerCommand?: string;
  requiresAuth?: boolean;
  requiresApiKey?: boolean;
  lastSmokeTested?: string | null;
  smokeResult?: {
    success: boolean;
    error?: string;
    message?: string;
    latencyMs?: number;
  } | null;
};

export default function OsintUniversePage() {
  const [tools, setTools] = useState<OsintTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRuntime, setSelectedRuntime] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Execution modal state
  const [activeTool, setActiveTool] = useState<OsintTool | null>(null);
  const [target, setTarget] = useState("");
  const [targetType, setTargetType] = useState("general");
  const [confirmed, setConfirmed] = useState(false);
  const [activeAuth, setActiveAuth] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [execError, setExecError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUniverse() {
      try {
        setLoading(true);
        const res = await fetch("/api/v1/osint/tools?limit=600");
        if (res.ok) {
          const data = await res.json();
          setTools(data.tools || []);
        }
      } catch (err) {
        console.error("Failed to load tool universe:", err);
      } finally {
        setLoading(false);
      }
    }
    loadUniverse();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(tools.map((t) => t.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [tools]);

  const runtimes = useMemo(() => {
    const set = new Set(tools.map((t) => t.runtimeType).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [tools]);

  const filteredTools = useMemo(() => {
    return tools.filter((t) => {
      if (selectedCategory !== "all" && t.category !== selectedCategory) return false;
      if (selectedRuntime !== "all" && t.runtimeType !== selectedRuntime) return false;
      if (selectedStatus !== "all") {
        if (selectedStatus === "HEALTHY" && t.status !== "HEALTHY") return false;
        if (selectedStatus === "AUTH_REQUIRED" && t.status !== "AUTH_REQUIRED") return false;
        if (selectedStatus === "REFERENCE_ONLY" && !["GUI_INTEGRATED", "DATASET_INTEGRATED", "LIBRARY_INTEGRATED", "REFERENCE_ONLY"].includes(t.status)) return false;
        if (selectedStatus === "UNCONFIGURED" && t.status !== "UNCONFIGURED") return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.toolId.toLowerCase().includes(q) ||
          (t.fullName && t.fullName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [tools, selectedCategory, selectedRuntime, selectedStatus, search]);

  const handleOpenTool = (tool: OsintTool) => {
    setActiveTool(tool);
    setTarget("");
    setTargetType(tool.targetInputs?.[0] || "general");
    setConfirmed(false);
    setActiveAuth(false);
    setExecutionResult(null);
    setExecError(null);
  };

  const handleExecute = async () => {
    if (!activeTool || !target.trim()) return;
    setExecuting(true);
    setExecError(null);
    setExecutionResult(null);

    try {
      const res = await fetch(`/api/v1/osint/tools/${activeTool.toolId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: target.trim(),
          targetType,
          confirmed,
          activeAuthorization: activeAuth,
          purpose: `Investigation target: ${target.trim()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setExecError(data.warnings?.[0] || data.error || `HTTP error ${res.status}`);
      }
      setExecutionResult(data);
    } catch (err: any) {
      setExecError(err.message || String(err));
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-[#e2e8f0] font-sans">
      {/* Header */}
      <header className="border-b border-[#1f2937] bg-[#0b1121]/90 backdrop-blur sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#22d3ee] shadow-[0_0_12px_#22d3ee] animate-pulse" />
            <h1 className="text-xl font-black tracking-wider text-[#22d3ee]">
              DISHA<span className="text-[#a855f7]">.6</span> OSINT TOOL UNIVERSE
            </h1>
          </div>
          <p className="text-xs text-[#64748b] mt-0.5">
            532 Registered Upstream Capabilities — Governed Multi-Runtime Execution & Verification
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/osint"
            className="text-xs px-3 py-1.5 rounded-md bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] transition flex items-center gap-1.5"
          >
            <Compass size={14} /> Back to Scanner View
          </Link>
          <div className="text-xs font-mono bg-[#0f172a] border border-[#1e293b] px-3 py-1.5 rounded text-[#38bdf8]">
            {tools.length} Total Inventory Tools
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Search & Filters */}
        <div className="bg-[#0b1121] border border-[#1f2937] rounded-xl p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-[#64748b]" size={18} />
            <input
              type="text"
              placeholder="Search 532 tools by name, ID, or repository..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#030712] border border-[#1f2937] rounded-lg text-sm text-[#e2e8f0] focus:border-[#22d3ee] outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-[#64748b]">
              <Filter size={14} /> Category:
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#030712] border border-[#1f2937] rounded px-2.5 py-1 text-[#e2e8f0] outline-none focus:border-[#22d3ee]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-[#64748b] ml-2">
              <Cpu size={14} /> Runtime:
            </div>
            <select
              value={selectedRuntime}
              onChange={(e) => setSelectedRuntime(e.target.value)}
              className="bg-[#030712] border border-[#1f2937] rounded px-2.5 py-1 text-[#e2e8f0] outline-none focus:border-[#22d3ee]"
            >
              {runtimes.map((r) => (
                <option key={r} value={r}>
                  {r.toUpperCase()}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-[#64748b] ml-2">
              <Activity size={14} /> Status:
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#030712] border border-[#1f2937] rounded px-2.5 py-1 text-[#e2e8f0] outline-none focus:border-[#22d3ee]"
            >
              <option value="all">ALL STATUSES</option>
              <option value="HEALTHY">HEALTHY (RUNNABLE PASS)</option>
              <option value="UNCONFIGURED">UNCONFIGURED</option>
              <option value="AUTH_REQUIRED">AUTH REQUIRED</option>
              <option value="REFERENCE_ONLY">REFERENCE ONLY</option>
            </select>

            <span className="ml-auto text-xs text-[#64748b]">
              Showing {filteredTools.length} of {tools.length} capabilities
            </span>
          </div>
        </div>

        {/* Tools Grid */}
        {loading ? (
          <div className="flex items-center justify-center p-12 text-[#64748b]">
            <RefreshCw className="animate-spin mr-2" size={18} /> Loading universal tool inventory...
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="text-center p-12 bg-[#0b1121] border border-[#1f2937] rounded-xl text-[#64748b]">
            No OSINT tools match your active query and filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map((tool) => (
              <div
                key={tool.toolId}
                onClick={() => handleOpenTool(tool)}
                className="bg-[#0b1121] border border-[#1f2937] hover:border-[#22d3ee]/50 rounded-xl p-4 cursor-pointer transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-sm text-[#e2e8f0] group-hover:text-[#22d3ee] transition">
                      {tool.name}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                        tool.status === "HEALTHY"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : tool.status === "AUTH_REQUIRED"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : ["GUI_INTEGRATED", "DATASET_INTEGRATED", "LIBRARY_INTEGRATED", "REFERENCE_ONLY"].includes(tool.status)
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {tool.status}
                    </span>
                  </div>

                  <p className="text-xs font-mono text-[#64748b] mb-3 truncate">
                    {tool.fullName || tool.toolId}
                  </p>

                  <div className="flex flex-wrap gap-1.5 text-[10px] mb-3">
                    <span className="bg-[#1e293b] text-[#94a3b8] px-2 py-0.5 rounded">
                      {tool.category}
                    </span>
                    <span className="bg-[#1e293b] text-[#38bdf8] px-2 py-0.5 rounded font-mono">
                      {tool.runtimeType}
                    </span>
                    {tool.license && (
                      <span className="bg-[#1e293b] text-[#64748b] px-2 py-0.5 rounded">
                        {tool.license}
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#1f2937]/50 pt-3 flex items-center justify-between text-xs text-[#64748b]">
                  <span className="font-mono text-[10px]">
                    {tool.targetInputs?.slice(0, 2).join(", ") || "target"}
                  </span>
                  <button className="text-[#22d3ee] flex items-center gap-1 group-hover:underline text-xs font-medium">
                    <Play size={12} /> Inspect / Run
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Execution Drawer / Modal */}
      {activeTool && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1121] border border-[#1f2937] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#1f2937] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#e2e8f0]">{activeTool.name}</h2>
                  <span className="text-xs px-2 py-0.5 rounded font-mono bg-[#1e293b] text-[#38bdf8]">
                    {activeTool.runtimeType}
                  </span>
                </div>
                <p className="text-xs text-[#64748b] mt-1 font-mono">{activeTool.fullName || activeTool.toolId}</p>
              </div>
              <button
                onClick={() => setActiveTool(null)}
                className="text-[#64748b] hover:text-[#e2e8f0] transition p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Upstream & License */}
            <div className="flex flex-wrap gap-4 text-xs text-[#94a3b8] bg-[#030712] p-3 rounded-lg border border-[#1f2937]">
              <div>
                <span className="text-[#64748b]">Upstream URL:</span>{" "}
                <a
                  href={activeTool.upstreamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#38bdf8] hover:underline inline-flex items-center gap-1"
                >
                  GitHub <ExternalLink size={12} />
                </a>
              </div>
              <div>
                <span className="text-[#64748b]">License:</span> {activeTool.license || "Unknown"}
              </div>
              <div>
                <span className="text-[#64748b]">Class:</span> {activeTool.executionClass}
              </div>
            </div>

            {/* Execution Form */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#38bdf8]">
                Execute Governed Capability
              </h4>

              <div>
                <label className="text-xs text-[#94a3b8] block mb-1">Target Identifier</label>
                <input
                  type="text"
                  placeholder={`Enter ${activeTool.targetInputs?.[0] || "target"}...`}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-[#030712] border border-[#1f2937] rounded-lg text-sm text-[#e2e8f0] focus:border-[#22d3ee] outline-none"
                />
              </div>

              {activeTool.targetInputs && activeTool.targetInputs.length > 1 && (
                <div>
                  <label className="text-xs text-[#94a3b8] block mb-1">Target Type</label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030712] border border-[#1f2937] rounded-lg text-sm text-[#e2e8f0] outline-none focus:border-[#22d3ee]"
                  >
                    {activeTool.targetInputs.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Policy Authorizations */}
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-[#94a3b8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="rounded bg-[#030712] border-[#1f2937]"
                  />
                  <span>Confirm operator authorization for identity / profile search</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-[#94a3b8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeAuth}
                    onChange={(e) => setActiveAuth(e.target.checked)}
                    className="rounded bg-[#030712] border-[#1f2937]"
                  />
                  <span>Explicit active network reconnaissance authorization</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTool(null)}
                  className="px-4 py-2 rounded-lg bg-[#1e293b] text-[#94a3b8] text-xs font-semibold hover:bg-[#334155] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={executing || !target.trim()}
                  className="px-5 py-2 rounded-lg bg-[#22d3ee] text-[#02040a] text-xs font-bold hover:bg-[#06b6d4] transition disabled:opacity-50 flex items-center gap-2"
                >
                  {executing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Executing...
                    </>
                  ) : (
                    <>
                      <Play size={14} /> Run Tool
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Execution Result Display */}
            {execError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Execution Blocked or Failed</div>
                  <div>{execError}</div>
                </div>
              </div>
            )}

            {executionResult && (
              <div className="space-y-3 pt-2 border-t border-[#1f2937]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-[#22d3ee] flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-emerald-400" /> Execution Evidence Record
                  </span>
                  <span className="font-mono text-[#64748b]">
                    {executionResult.durationMs}ms — Status: {executionResult.status}
                  </span>
                </div>

                {executionResult.evidence && executionResult.evidence.length > 0 && (
                  <div className="bg-[#030712] p-3 rounded-lg border border-[#1f2937] font-mono text-[11px] space-y-1">
                    <div className="text-[#38bdf8] font-bold">Evidence Ledger Entry</div>
                    <div className="text-[#94a3b8]">Provenance Hash: {executionResult.provenanceHash}</div>
                    <div className="text-[#64748b]">{executionResult.evidence[0]?.summary}</div>
                  </div>
                )}

                <div className="bg-[#030712] p-3 rounded-lg border border-[#1f2937] max-h-48 overflow-y-auto">
                  <pre className="text-[11px] font-mono text-[#94a3b8] whitespace-pre-wrap">
                    {JSON.stringify(executionResult.data || executionResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
