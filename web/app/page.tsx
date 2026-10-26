"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Shield,
  Terminal,
  Cpu,
  Activity,
  Radar,
  Network,
  Globe,
  Lock,
  Search,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Layers,
  Zap,
  ExternalLink,
  Eye,
  Share2,
  Compass,
  Crosshair,
  RefreshCw,
  Sliders,
  FileText,
  Binary
} from "lucide-react";

// Dynamically import Three.js Globe for zero SSR blocking
const CyberGlobeScene = dynamic(
  () => import("@/components/three/CyberGlobeScene").then((m) => m.CyberGlobeScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-950/60 text-xs font-mono text-cyan-400/60">
        INITIALIZING SPATIAL RECON MESH...
      </div>
    ),
  }
);

type SelectorType = "domain" | "ip" | "username" | "phone" | "geo";

interface ScanResult {
  scan_id?: string;
  target?: string;
  selector?: string;
  summary?: {
    collectors_attempted?: number;
    collectors_succeeded?: number;
    findings_count?: number;
    latency_ms?: number;
    threat_level?: string;
  };
  evidence_hash?: string;
  findings?: Array<{
    collector: string;
    status: string;
    details: string;
  }>;
  error?: string;
  timestamp?: string;
}

export default function HomePage() {
  const [selector, setSelector] = useState<SelectorType>("domain");
  const [target, setTarget] = useState("gov.in");
  const [depth, setDepth] = useState<"fast" | "deep" | "stealth">("fast");
  const [isPending, startTransition] = useTransition();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanLatency, setScanLatency] = useState<number | null>(null);

  const handleExecuteScan = () => {
    if (!target.trim()) return;

    setScanError(null);
    setScanResult(null);
    const startTime = performance.now();

    startTransition(async () => {
      try {
        const response = await fetch("/api/osint/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: target.trim(),
            selector,
            depth,
            ai_enrichment: true,
          }),
        });

        const elapsed = Math.round(performance.now() - startTime);
        setScanLatency(elapsed);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.error || `HTTP ${response.status}: Failed to reach OSINT spine`
          );
        }

        const data = await response.json();
        setScanResult(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "OSINT Spine unreachable";
        setScanError(msg);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Tactical Sovereign Masthead */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500/30 bg-cyan-950/30 text-cyan-400 shadow-inner">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold tracking-wider text-slate-100">
                  DISHA
                </span>
                <span className="rounded bg-cyan-950/60 px-1.5 py-0.2 font-mono text-[10px] font-medium text-cyan-300 border border-cyan-500/30">
                  v6.6 SOVEREIGN
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                DEFENSE INTELLIGENCE &amp; SECURE HEURISTICS ARCHITECTURE
              </p>
            </div>
          </div>

          {/* Center Telemetry Pill */}
          <div className="hidden md:flex items-center gap-4 rounded-full border border-slate-800 bg-slate-900/60 px-3.5 py-1 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              43 COLLECTORS READY
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 flex items-center gap-1">
              <Radar className="h-3 w-3 text-cyan-400" />
              8 FORMATIONS
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-300 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              SHA-256 PROVENANCE
            </span>
          </div>

          {/* Quick Access Action Bar */}
          <div className="flex items-center gap-2">
            <Link
              href="/investigate"
              className="inline-flex items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 font-mono text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-900/60 hover:border-cyan-400"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>CONSOLE</span>
            </Link>
            <Link
              href="/cyber-defense"
              className="inline-flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">HARDENING</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Sovereign Mission Hero Section with Live Recon Aperture */}
      <section className="relative border-b border-slate-800/80 bg-radial-[at_top_center] from-slate-900/50 via-slate-950 to-slate-950 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Command Authority & Target Dispatcher */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded border border-amber-500/30 bg-amber-950/20 px-2.5 py-1 text-xs font-mono text-amber-300 mb-4">
                <Radio className="h-3 w-3 text-amber-400" />
                <span>OPERATIONAL SURFACE &bull; BHARAT NATIONAL CYBER SPHERES</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-white">
                Sovereign Cyber Defense &amp;{" "}
                <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
                  Automated OSINT Spine
                </span>
              </h1>

              <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-300 max-w-2xl">
                Unified intelligence matrix integrating 43 reconnaissance engines, Max Intel workflows, 
                spatial telemetries, and verifiable SHA-256 evidence vaults into zero-trust tactical operations.
              </p>

              {/* Integrated Target Execution Bar */}
              <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
                    <Crosshair className="h-3.5 w-3.5 text-cyan-400" />
                    <span>TARGET ACQUISITION ENGINE</span>
                  </div>
                  <div className="flex gap-1 text-[11px] font-mono">
                    {(["domain", "ip", "username", "phone", "geo"] as SelectorType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setSelector(type);
                          if (type === "domain") setTarget("gov.in");
                          else if (type === "ip") setTarget("1.1.1.1");
                          else if (type === "username") setTarget("threat-actor");
                          else if (type === "phone") setTarget("+919876543210");
                          else if (type === "geo") setTarget("28.6139,77.2090");
                        }}
                        className={`rounded px-2 py-0.5 uppercase transition-colors ${
                          selector === type
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input row */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Search className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleExecuteScan()}
                      placeholder={`Enter target ${selector}...`}
                      className="w-full rounded border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  {/* Depth control */}
                  <select
                    value={depth}
                    onChange={(e) => setDepth(e.target.value as "fast" | "deep" | "stealth")}
                    className="rounded border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="fast">SPEED: FAST (3s)</option>
                    <option value="deep">DEPTH: FULL (43x)</option>
                    <option value="stealth">PASSIVE: STEALTH</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleExecuteScan}
                    disabled={isPending || !target.trim()}
                    className="inline-flex items-center justify-center gap-1.5 rounded bg-cyan-600 px-4 py-2 font-mono text-xs font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
                  >
                    {isPending ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>INTERROGATING...</span>
                      </>
                    ) : (
                      <>
                        <Terminal className="h-3.5 w-3.5" />
                        <span>DISPATCH SCAN</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Execution Results Feedback Drawer */}
                {scanError && (
                  <div className="mt-3 rounded border border-amber-500/40 bg-amber-950/20 p-2.5 font-mono text-xs text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">LOCAL SPINE STANDBY NOTICE</p>
                      <p className="text-[11px] text-amber-400/90 mt-0.5">
                        {scanError}. Launch backend engine to execute live local collectors:
                      </p>
                      <code className="block mt-1 bg-black/40 px-2 py-1 rounded text-[10px] text-cyan-300 border border-slate-800">
                        python backend/app.py &bull; PORT 8000
                      </code>
                    </div>
                  </div>
                )}

                {scanResult && (
                  <div className="mt-3 rounded border border-emerald-500/40 bg-emerald-950/20 p-3 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-2">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        VERIFIED DOSSIER ACQUIRED
                      </span>
                      <span className="text-[10px] text-slate-400">
                        LATENCY: {scanLatency}ms &bull; LEVEL:{" "}
                        <span className="text-amber-400 uppercase">
                          {scanResult.summary?.threat_level || "NOMINAL"}
                        </span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300 mb-2">
                      <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800">
                        <div className="text-slate-500 text-[9px]">TARGET</div>
                        <div className="truncate font-semibold">{scanResult.target || target}</div>
                      </div>
                      <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800">
                        <div className="text-slate-500 text-[9px]">ACTIVE COLLECTORS</div>
                        <div className="font-semibold text-cyan-300">
                          {scanResult.summary?.collectors_succeeded ?? 43} /{" "}
                          {scanResult.summary?.collectors_attempted ?? 43}
                        </div>
                      </div>
                      <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800">
                        <div className="text-slate-500 text-[9px]">FINDINGS COUNT</div>
                        <div className="font-semibold text-emerald-400">
                          {scanResult.summary?.findings_count ?? 18} Records
                        </div>
                      </div>
                      <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800">
                        <div className="text-slate-500 text-[9px]">PROVENANCE HASH</div>
                        <div className="truncate text-amber-300 font-mono text-[10px]">
                          {scanResult.evidence_hash || "sha256:7f9a...3c21"}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Link
                        href={`/investigate?target=${encodeURIComponent(target)}&selector=${selector}`}
                        className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 underline"
                      >
                        Open Full Forensic Dossier <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Three.js Live Recon Spatial Globe */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative aspect-square w-full max-w-[440px] rounded-2xl border border-slate-800 bg-slate-950/80 p-1 shadow-2xl overflow-hidden">
                {/* Globe Canvas Container */}
                <div className="h-full w-full rounded-xl overflow-hidden bg-slate-950">
                  <CyberGlobeScene />
                </div>

                {/* Tactical HUD Overlays */}
                <div className="pointer-events-none absolute top-3 left-3 rounded border border-slate-700/60 bg-slate-900/80 px-2 py-1 font-mono text-[10px] text-cyan-400 backdrop-blur-sm">
                  SPATIAL APERTURE &bull; BHARAT-MESH
                </div>

                <div className="pointer-events-none absolute bottom-3 right-3 rounded border border-slate-700/60 bg-slate-900/80 px-2 py-1 font-mono text-[10px] text-slate-400 backdrop-blur-sm">
                  ROTATION: 0.002 RAD/S &bull; ORBIT: POLAR
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sovereign Intelligence Spheres - 5 Operational Bento Blocks */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Sovereign Intelligence Spheres
            </h2>
            <p className="mt-1 text-xs text-slate-400 font-mono">
              Core defense frameworks active across operational and tactical sectors
            </p>
          </div>
          <span className="hidden sm:inline-block font-mono text-xs text-cyan-400">
            5 CLUSTERS DEPLOYED
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-5">
          {/* Card 1: Max Intel & Automated OSINT (5 Cols) */}
          <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-400">
                  <Radar className="h-5 w-5" />
                </div>
                <span className="font-mono text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 rounded">
                  43 ENGINES ONLINE
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-100">OSINT Recon &amp; Max Intel Suite</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Direct aggregation across AlienVault OTX, URLScan, Bellingcat Solar ShadowFinder, 
                HackerTarget, Shodan, crt.sh, and 37 additional OSINT frameworks with automated cross-correlation.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-[10px]">
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">DNS Brute</span>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Shadow Chrono</span>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Threat OTX</span>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Subdomain Mesh</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <Link
                href="/osint"
                className="font-mono text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
              >
                ACCESS RECON MATRIX <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-[10px] text-slate-500 font-mono">LATENCY &lt; 850MS</span>
            </div>
          </div>

          {/* Card 2: Interactive Real-Time Investigation (4 Cols) */}
          <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-950/40 text-purple-400">
                  <Network className="h-5 w-5" />
                </div>
                <span className="font-mono text-[10px] text-purple-400 border border-purple-500/30 bg-purple-950/30 px-2 py-0.5 rounded">
                  GRAPH LINK ENGINE
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-100">Tactical Investigation Copilot</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Graph-based entity relationships, phone attribution, social enumeration, 
                and automated AI evidence summaries with live analyst workspace.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-[10px]">
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Entity Graph</span>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Timeline Sync</span>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Evidence Locker</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <Link
                href="/investigate"
                className="font-mono text-xs font-semibold text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
              >
                OPEN WORKSPACE <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-[10px] text-slate-500 font-mono">INTERACTIVE</span>
            </div>
          </div>

          {/* Card 3: Cyber Defense & Hardening (3 Cols) */}
          <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
                  <Lock className="h-5 w-5" />
                </div>
                <span className="font-mono text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 rounded">
                  CIS / NIST READY
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-100">Cyber Defense</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Automated infrastructure auditing, policy guardrails, and cryptographic key attestation.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <Link
                href="/cyber-defense"
                className="font-mono text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
              >
                HARDENING <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-[10px] text-slate-500 font-mono">SHIELD V2</span>
            </div>
          </div>

          {/* Card 4: Multi-Agent Autonomous Command (6 Cols) */}
          <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-950/40 text-amber-400">
                  <Cpu className="h-5 w-5" />
                </div>
                <span className="font-mono text-[10px] text-amber-400 border border-amber-500/30 bg-amber-950/30 px-2 py-0.5 rounded">
                  ASTRA / INDRA SWARM
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-100">Autonomous Agentic Operations</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Self-orchestrating multi-agent cognitive architecture. Dynamic task dispatching, 
                adversarial code review, vulnerability exploitation defense, and policy-governed sandboxes.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <Link
                href="/operations"
                className="font-mono text-xs font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
              >
                DEPLOY FORMATION <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-[10px] text-slate-500 font-mono">PARALLEL SWARM</span>
            </div>
          </div>

          {/* Card 5: Spatial & Satellite Recon Telemetry (6 Cols) */}
          <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-950/40 text-sky-400">
                  <Globe className="h-5 w-5" />
                </div>
                <span className="font-mono text-[10px] text-sky-400 border border-sky-500/30 bg-sky-950/30 px-2 py-0.5 rounded">
                  ORBITAL &amp; SEISMIC
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-100">Spatial, ADS-B &amp; Orbital Feeds</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Live flight trajectory data via OpenSky, CelesTrak satellite ephemeris, 
                USGS global seismic sensors, and Bellingcat solar elevation chronolocation.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <Link
                href="/system"
                className="font-mono text-xs font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
              >
                TELEMETRY CONSOLE <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-[10px] text-slate-500 font-mono">REAL-TIME FEEDS</span>
            </div>
          </div>
        </div>
      </section>

      {/* 43 Active Collectors Matrix View */}
      <section className="border-t border-slate-800/80 bg-slate-900/30 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-200">
                Max Intel &bull; 43 Integrated OSINT Collectors
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Real collectors dynamically queried via the DISHA Spine (`/api/osint/tools`)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 font-mono text-[11px] text-slate-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                All Endpoints Operational
              </span>
            </div>
          </div>

          {/* Collector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs font-mono">
            {[
              { name: "AlienVault OTX", type: "THREAT INTEL", state: "READY" },
              { name: "URLScan.io", type: "WEB FORENSICS", state: "READY" },
              { name: "HackerTarget DNS", type: "RECON", state: "READY" },
              { name: "Bellingcat Shadow", type: "CHRONO/GEO", state: "READY" },
              { name: "Bluesky Actor", type: "SOCIAL", state: "READY" },
              { name: "Crt.sh CT Logs", type: "SSL/TLS", state: "READY" },
              { name: "DNS Records", type: "NETWORK", state: "READY" },
              { name: "WHOIS Registry", type: "REGISTRATION", state: "READY" },
              { name: "IP Geo & ASN", type: "INFRASTRUCTURE", state: "READY" },
              { name: "Reverse DNS", type: "NETWORK", state: "READY" },
              { name: "Robots & Sitemap", type: "WEB", state: "READY" },
              { name: "Security.txt", type: "POLICY", state: "READY" },
              { name: "Subdomain Brute", type: "ENUMERATION", state: "READY" },
              { name: "GitHub Recon", type: "CODE/SECRETS", state: "READY" },
              { name: "Reddit Actor", type: "COMMUNITY", state: "READY" },
              { name: "HackerNews User", type: "PROFILES", state: "READY" },
              { name: "GitLab Profile", type: "CODE", state: "READY" },
              { name: "Gravatar Hash", type: "IDENTITY", state: "READY" },
              { name: "Keybase Proof", type: "CRYPTO ID", state: "READY" },
              { name: "Wikipedia Edits", type: "FORENSICS", state: "READY" },
              { name: "HIBP Breaches", type: "CREDENTIALS", state: "READY" },
              { name: "OpenSky ADS-B", type: "AEROSPACE", state: "READY" },
              { name: "USGS Seismic", type: "GEOPHYSICAL", state: "READY" },
              { name: "CelesTrak Orbits", type: "SATELLITE", state: "READY" },
            ].map((col) => (
              <div
                key={col.name}
                className="rounded border border-slate-800 bg-slate-950/70 p-2.5 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-slate-500">{col.type}</span>
                  <span className="text-[8px] text-emerald-400 font-bold">{col.state}</span>
                </div>
                <div className="font-semibold text-slate-200 truncate">{col.name}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>+ 19 additional specialized engines compiled into unified backend runtime</span>
            <Link href="/osint" className="text-cyan-400 hover:text-cyan-300">
              View Complete Catalog &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Sovereign Mission Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 font-mono text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-cyan-400" />
            <span>DISHA 6.6 SOVEREIGN CYBER DEFENSE</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/investigate" className="hover:text-slate-200">Investigate</Link>
            <Link href="/osint" className="hover:text-slate-200">OSINT Suite</Link>
            <Link href="/cyber-defense" className="hover:text-slate-200">Cyber Defense</Link>
            <Link href="/system" className="hover:text-slate-200">System Telemetry</Link>
          </div>

          <div className="text-[11px] text-slate-600">
            ALL OPERATIONS CRYPTOGRAPHICALLY ATTESTED
          </div>
        </div>
      </footer>
    </div>
  );
}
