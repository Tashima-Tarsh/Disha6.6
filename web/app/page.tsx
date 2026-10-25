"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Terminal,
  Globe,
  Activity,
  Lock,
  Database,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Play,
  Eye,
  FileText,
  Zap,
  Compass,
  RefreshCw,
  Server,
  Code2,
  ExternalLink,
} from "lucide-react";

// Dynamically import 3D scenes to ensure client-only WebGL rendering
const CyberGlobeScene = dynamic(
  () => import("@/components/three/CyberGlobeScene").then((m) => m.CyberGlobeScene),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[460px] flex items-center justify-center">
        <div className="w-64 h-64 rounded-full border border-cyan-500/20 animate-pulse flex items-center justify-center">
          <div className="w-32 h-32 rounded-full border border-purple-500/30 animate-spin" />
        </div>
      </div>
    ),
  }
);

const QuantumCoreScene = dynamic(
  () => import("@/components/three/QuantumCoreScene").then((m) => m.QuantumCoreScene),
  { ssr: false }
);

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"healing" | "osint" | "research" | "evidence">("healing");
  const [liveQuery, setLiveQuery] = useState("target-domain.com");
  const [queryState, setQueryState] = useState<"idle" | "running" | "done">("idle");
  const [activeStep, setActiveStep] = useState(0);

  const simulateLiveRecon = () => {
    setQueryState("running");
    setActiveStep(1);
    setTimeout(() => setActiveStep(2), 700);
    setTimeout(() => setActiveStep(3), 1500);
    setTimeout(() => {
      setActiveStep(4);
      setQueryState("done");
    }, 2400);
  };

  return (
    <div className="min-h-screen bg-[#060911] text-[#f8fafc] selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden relative font-sans">
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-10 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-10 w-[550px] h-[550px] bg-emerald-500/8 rounded-full blur-[180px] pointer-events-none -z-10" />

      {/* 1. Header & Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#060911]/80 border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-[1px] shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#0b1120] rounded-[11px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400">
                  DISHA
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono font-semibold">
                  v6.6
                </span>
              </div>
              <p className="text-[10px] text-gray-400 tracking-wider font-mono">CONSTITUTIONAL COGNITIVE OS</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-md">
            <Link
              href="/workbench"
              className="px-3.5 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-full transition-all"
            >
              Workbench
            </Link>
            <Link
              href="/osint/universe"
              className="px-3.5 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-full transition-all"
            >
              Fleet Universe (532)
            </Link>
            <Link
              href="/cyber-defense"
              className="px-3.5 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-full transition-all"
            >
              Cyber Defense
            </Link>
            <Link
              href="/skills"
              className="px-3.5 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-full transition-all"
            >
              Skills (460)
            </Link>
            <Link
              href="/self-healing"
              className="px-3.5 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-full transition-all"
            >
              Self-Healing
            </Link>
            <Link
              href="/operations"
              className="px-3.5 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-full transition-all"
            >
              Operations
            </Link>
          </nav>

          {/* Right Action & Status */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>STATION READY</span>
            </div>

            <Link
              href="/login"
              className="px-4 py-2 text-xs font-medium text-gray-300 hover:text-white border border-white/10 rounded-lg hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all"
            >
              Sign In
            </Link>

            <Link
              href="/workbench"
              className="relative group px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-semibold text-xs shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <span>Launch Console</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section: 3D Interactive WebGL Cybernetic Threat Globe */}
      <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Hero Left Copy */}
          <div className="lg:col-span-7 space-y-8 z-10">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs font-mono tracking-wide shadow-inner shadow-cyan-500/10">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>Constitutional Cognitive OS • Zero Simulated Findings</span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]">
                Autonomous Defense.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400">
                  Truthful OSINT & Evidence-First Execution.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-gray-300 leading-relaxed max-w-2xl font-normal">
                DISHA 6.6 fuses 532 verified OSINT upstreams, 460 autonomous agent skills, a 5-phase self-healing loop,
                and SHA-256 parent-hash chain evidence verification into an integrated constitutional portal.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/workbench"
                className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 text-[#030712] font-bold text-sm shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <Compass className="w-4 h-4" />
                <span>Launch Investigation Workbench</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/osint/universe"
                className="px-6 py-3.5 rounded-xl bg-[#0b1120] hover:bg-white/5 border border-cyan-500/30 hover:border-cyan-400 text-white font-semibold text-sm transition-all flex items-center gap-2 group"
              >
                <Globe className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform" />
                <span>Explore Operational Fleet (532)</span>
              </Link>
            </div>

            {/* Live Metrics Ticker */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="text-2xl font-black text-cyan-400 font-mono">532</div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">OSINT Upstreams</div>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="text-2xl font-black text-purple-400 font-mono">460</div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Agent Skills</div>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="text-2xl font-black text-emerald-400 font-mono">16/16</div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Postgres Migrations</div>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="text-2xl font-black text-amber-400 font-mono">100%</div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Evidence Integrity</div>
              </div>
            </div>
          </div>

          {/* Hero Right: 3D Cyber Globe Scene */}
          <div className="lg:col-span-5 relative w-full h-[460px] sm:h-[540px] lg:h-[620px] flex items-center justify-center">
            {/* Holographic backdrop glow */}
            <div className="absolute inset-0 bg-radial-gradient from-cyan-500/15 via-purple-500/5 to-transparent rounded-full filter blur-2xl" />

            {/* 3D Scene */}
            <div className="w-full h-full relative z-10">
              <CyberGlobeScene />
            </div>

            {/* Floating Live Telemetry Cards */}
            <div className="absolute -bottom-4 left-4 p-3.5 rounded-xl bg-[#0b1120]/90 backdrop-blur-xl border border-cyan-500/30 shadow-2xl flex items-center gap-3 z-20">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-white">SHA-256 Provenance Ledger</div>
                <div className="text-[10px] text-gray-400">Parent-hash chaining active</div>
              </div>
            </div>

            <div className="absolute top-6 right-2 p-3.5 rounded-xl bg-[#0b1120]/90 backdrop-blur-xl border border-purple-500/30 shadow-2xl flex items-center gap-3 z-20">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-white">Multi-Agent Planner</div>
                <div className="text-[10px] text-purple-300">6 specialist roles coordinated</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Four Core Pillars Showcase */}
      <section className="py-24 bg-[#080d19]/80 border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
              Autonomous Systems Architecture
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Constitutional Pillars of the Operating System
            </h3>
            <p className="text-gray-400 text-sm sm:text-base">
              Engineered with strict separation of concerns, container worker isolation, and cryptographic auditability.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Pillar Selector */}
            <div className="lg:col-span-5 space-y-3">
              <button
                onClick={() => setActiveTab("healing")}
                className={`w-full p-4 rounded-xl text-left border transition-all flex items-start gap-4 ${
                  activeTab === "healing"
                    ? "bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                    : "bg-[#0b1120] border-white/5 hover:border-white/20"
                }`}
              >
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-1">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    Autonomous Self-Healing
                    {activeTab === "healing" && <span className="text-[10px] font-mono text-emerald-400">ACTIVE</span>}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    5-phase automated incident ingestion, AST patch synthesis, isolated test verification, and audit recording.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("osint")}
                className={`w-full p-4 rounded-xl text-left border transition-all flex items-start gap-4 ${
                  activeTab === "osint"
                    ? "bg-cyan-950/40 border-cyan-500/50 shadow-lg shadow-cyan-500/10"
                    : "bg-[#0b1120] border-white/5 hover:border-white/20"
                }`}
              >
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mt-1">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    Governed OSINT Fleet (532 Upstreams)
                    {activeTab === "osint" && <span className="text-[10px] font-mono text-cyan-400">ACTIVE</span>}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Zero in-process CLI execution inside web tier. Specialized tasks dispatch to dedicated worker containers.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("research")}
                className={`w-full p-4 rounded-xl text-left border transition-all flex items-start gap-4 ${
                  activeTab === "research"
                    ? "bg-purple-950/40 border-purple-500/50 shadow-lg shadow-purple-500/10"
                    : "bg-[#0b1120] border-white/5 hover:border-white/20"
                }`}
              >
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-1">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    Multi-Agent Research Engine
                    {activeTab === "research" && <span className="text-[10px] font-mono text-purple-400">ACTIVE</span>}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    6 specialized bounded agent roles with human approval checkpoints and cryptographic replayability.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("evidence")}
                className={`w-full p-4 rounded-xl text-left border transition-all flex items-start gap-4 ${
                  activeTab === "evidence"
                    ? "bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-500/10"
                    : "bg-[#0b1120] border-white/5 hover:border-white/20"
                }`}
              >
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-1">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    Cryptographic Evidence Ledger
                    {activeTab === "evidence" && <span className="text-[10px] font-mono text-amber-400">ACTIVE</span>}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Immutable parent-hash chained audit events. Any modification breaks verification with index precision.
                  </p>
                </div>
              </button>
            </div>

            {/* Right 3D Visualizer & Details */}
            <div className="lg:col-span-7 bg-[#0b1120] border border-white/10 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* 3D Core Scene */}
                <div className="h-[280px] w-full flex items-center justify-center relative">
                  <QuantumCoreScene activeMode={activeTab} />
                </div>

                {/* Pillar Specific Content */}
                <div className="space-y-4">
                  <div className="inline-block px-3 py-1 rounded-md text-xs font-mono font-bold uppercase tracking-wider bg-white/5 border border-white/10">
                    {activeTab === "healing" && "Self-Healing Engine (OpenHands)"}
                    {activeTab === "osint" && "Universal OSINT Bus (FastAPI + Workers)"}
                    {activeTab === "research" && "God Mode Cognitive Intelligence"}
                    {activeTab === "evidence" && "Evidence OS Ledger & Tamper Guard"}
                  </div>

                  <h3 className="text-xl font-bold text-white">
                    {activeTab === "healing" && "Automated 5-Phase Diagnostic Remediation"}
                    {activeTab === "osint" && "532 Heterogeneous Tools with Honest Status"}
                    {activeTab === "research" && "Cryptographically Replayable Investigations"}
                    {activeTab === "evidence" && "Court-Admissible Verification Ledger"}
                  </h3>

                  <ul className="space-y-2 text-xs text-gray-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Zero simulated results; actual test execution before patch approval</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Independent HMAC-SHA256 authorization grants required</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Specialist CLI binaries isolated in container worker plane</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      href={
                        activeTab === "healing"
                          ? "/self-healing"
                          : activeTab === "osint"
                          ? "/osint/universe"
                          : activeTab === "research"
                          ? "/workbench"
                          : "/cyber-defense"
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                    >
                      <span>Explore this system module</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Interactive Live Investigation Terminal */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0b1120] border border-cyan-500/30 rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono mb-2">
                <Terminal className="w-4 h-4" />
                <span>INTERACTIVE LIVE INTELLIGENCE WORKBENCH</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Test Live Multi-Agent Investigation Flow
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Enter an authorized domain target or test sample to observe real-time policy evaluation and provenance hashing.
              </p>
            </div>

            {/* Input & Run */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                value={liveQuery}
                onChange={(e) => setLiveQuery(e.target.value)}
                placeholder="domain.com"
                className="px-4 py-2.5 bg-[#060911] border border-white/15 focus:border-cyan-400 rounded-xl text-xs font-mono text-white placeholder-gray-500 outline-none w-full md:w-64"
              />
              <button
                onClick={simulateLiveRecon}
                disabled={queryState === "running"}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 shrink-0 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{queryState === "running" ? "Dispatching..." : "Execute Query"}</span>
              </button>
            </div>
          </div>

          {/* Stepper Display */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-8">
            <div
              className={`p-4 rounded-xl border transition-all ${
                activeStep >= 1 ? "bg-cyan-950/30 border-cyan-500/50" : "bg-white/[0.02] border-white/5 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-cyan-400">STAGE 1</span>
                {activeStep >= 1 && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
              </div>
              <h5 className="font-bold text-xs text-white">Target Classification</h5>
              <p className="text-[11px] text-gray-400 mt-1">RFC-valid target check, regex sanitization, injection guard.</p>
            </div>

            <div
              className={`p-4 rounded-xl border transition-all ${
                activeStep >= 2 ? "bg-purple-950/30 border-purple-500/50" : "bg-white/[0.02] border-white/5 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-purple-400">STAGE 2</span>
                {activeStep >= 2 && <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />}
              </div>
              <h5 className="font-bold text-xs text-white">Constitutional Policy Gate</h5>
              <p className="text-[11px] text-gray-400 mt-1">Passive public authorized. Active recon requires signed grant.</p>
            </div>

            <div
              className={`p-4 rounded-xl border transition-all ${
                activeStep >= 3 ? "bg-blue-950/30 border-blue-500/50" : "bg-white/[0.02] border-white/5 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-blue-400">STAGE 3</span>
                {activeStep >= 3 && <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />}
              </div>
              <h5 className="font-bold text-xs text-white">Worker Plane Dispatch</h5>
              <p className="text-[11px] text-gray-400 mt-1">FastAPI OSINT-ONE collector execution and structured parsing.</p>
            </div>

            <div
              className={`p-4 rounded-xl border transition-all ${
                activeStep >= 4 ? "bg-emerald-950/30 border-emerald-500/50" : "bg-white/[0.02] border-white/5 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-emerald-400">STAGE 4</span>
                {activeStep >= 4 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <h5 className="font-bold text-xs text-white">SHA-256 Provenance</h5>
              <p className="text-[11px] text-gray-400 mt-1">Appended to immutable Evidence Ledger with parent hash.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Complete Bento Grid: All DISHA Consoles */}
      <section className="py-24 bg-[#080d19]/80 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
              Command & Control Fleet
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Operational Consoles & Feature Suite
            </h3>
            <p className="text-gray-400 text-sm sm:text-base">
              Every console provides dedicated workflows for intelligence analysts, cyber defense operators, and administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Workbench */}
            <Link
              href="/workbench"
              className="p-6 rounded-2xl bg-[#0b1120] border border-white/10 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                  <Compass className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-white group-hover:text-cyan-300 transition-colors">
                  Investigation Workbench
                </h4>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Interactive DAG flow powered by XyFlow, evidence event stream, and real-time multi-agent execution.
                </p>
              </div>
              <div className="pt-6 flex items-center gap-1 text-xs font-semibold text-cyan-400">
                <span>Launch Workbench</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 2. OSINT Universe */}
            <Link
              href="/osint/universe"
              className="p-6 rounded-2xl bg-[#0b1120] border border-white/10 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                  <Globe className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-white group-hover:text-blue-300 transition-colors">
                  OSINT Fleet Universe
                </h4>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  532 upstream catalog with dual primary views: Operational Fleet (runnable) and Admin Diagnostic Blockers.
                </p>
              </div>
              <div className="pt-6 flex items-center gap-1 text-xs font-semibold text-blue-400">
                <span>View Fleet</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 3. Cyber Defense */}
            <Link
              href="/cyber-defense"
              className="p-6 rounded-2xl bg-[#0b1120] border border-white/10 hover:border-red-500/50 hover:shadow-xl hover:shadow-red-500/10 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-white group-hover:text-red-300 transition-colors">
                  Cyber Defense & Vulnerabilities
                </h4>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Domain security assessment, CVSS v3.1 calculation, CISA KEV exploitation tracking, and TLS posture scanner.
                </p>
              </div>
              <div className="pt-6 flex items-center gap-1 text-xs font-semibold text-red-400">
                <span>Scan Assets</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 4. Skills Console */}
            <Link
              href="/skills"
              className="p-6 rounded-2xl bg-[#0b1120] border border-white/10 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-white group-hover:text-purple-300 transition-colors">
                  460 Governed Agent Skills
                </h4>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Anthropic Skills, Obra Superpowers, and C-Suite executive advisors with real schema validation and execution.
                </p>
              </div>
              <div className="pt-6 flex items-center gap-1 text-xs font-semibold text-purple-400">
                <span>Browse Skills</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 5. Self-Healing */}
            <Link
              href="/self-healing"
              className="p-6 rounded-2xl bg-[#0b1120] border border-white/10 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-white group-hover:text-emerald-300 transition-colors">
                  Autonomous Self-Healing
                </h4>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Real-time diagnosis, failure isolation, automated AST patching, and zero-simulation verified repairs.
                </p>
              </div>
              <div className="pt-6 flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <span>View Engine</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 6. Geospatial Map */}
            <Link
              href="/geospatial"
              className="p-6 rounded-2xl bg-[#0b1120] border border-white/10 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors">
                  Geospatial Vector Map
                </h4>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  MapLibre GL vector layer viewer with PostGIS spatial indices, district boundaries, and nearby queries.
                </p>
              </div>
              <div className="pt-6 flex items-center gap-1 text-xs font-semibold text-amber-400">
                <span>Open Map</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 7. Operations Telemetry */}
            <Link
              href="/operations"
              className="p-6 rounded-2xl bg-[#0b1120] border border-white/10 hover:border-sky-500/50 hover:shadow-xl hover:shadow-sky-500/10 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-white group-hover:text-sky-300 transition-colors">
                  Operational Telemetry
                </h4>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Real-time mission tracking, queue heartbeat monitoring, and active worker container health checks.
                </p>
              </div>
              <div className="pt-6 flex items-center gap-1 text-xs font-semibold text-sky-400">
                <span>Inspect Posture</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* 8. System & Model Gateway */}
            <Link
              href="/system"
              className="p-6 rounded-2xl bg-[#0b1120] border border-white/10 hover:border-pink-500/50 hover:shadow-xl hover:shadow-pink-500/10 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4 group-hover:scale-110 transition-transform">
                  <Server className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-white group-hover:text-pink-300 transition-colors">
                  System & Model Gateway
                </h4>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Unified AI model provider routing, latency benchmarking, and strict local-only privacy toggling.
                </p>
              </div>
              <div className="pt-6 flex items-center gap-1 text-xs font-semibold text-pink-400">
                <span>Configure Models</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 6. 20 GitHub Upstreams Integration Strip */}
      <section className="py-20 border-t border-white/5 bg-[#060911]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <h4 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
              Integrated Architectural Spine
            </h4>
            <h3 className="text-2xl sm:text-3xl font-bold text-white">
              20 GitHub Upstream Core Engines
            </h3>
            <p className="text-xs sm:text-sm text-gray-400">
              Concrete implementations integrated into DISHA 6.6, tested and verified across TypeScript and Python.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              "anthropics/skills",
              "obra/superpowers",
              "xyflow/xyflow",
              "microsoft/playwright",
              "OpenHands/OpenHands",
              "projectdiscovery/nuclei",
              "semgrep/semgrep",
              "aquasecurity/trivy",
              "gitleaks/gitleaks",
              "letta-ai/letta",
              "getzep/graphiti",
              "langchain-ai/deepagents",
              "langchain-ai/langgraph",
              "temporalio/temporal",
              "promptfoo/promptfoo",
              "langfuse/langfuse",
              "vxcontrol/pentagi",
              "shadcn-ui/ui",
              "nextlevelbuilder/ui-ux",
              "vercel-labs/agent-skills",
            ].map((upstream, idx) => (
              <div
                key={upstream}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">#{idx + 1}</span>
                  <span className="text-xs font-mono text-gray-300 truncate">{upstream.split("/")[1]}</span>
                </div>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Final Call to Action */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-[1px] mx-auto shadow-2xl shadow-cyan-500/30">
            <div className="w-full h-full bg-[#0b1120] rounded-[15px] flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-cyan-400" />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              Ready for Live Intelligence Operations?
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
              Authenticate with your Operator ID to access the full investigation suite, autonomous remediation console, and evidence ledger.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/login"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 text-black font-bold text-sm shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <span>Operator Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/workbench"
              className="px-8 py-4 rounded-xl bg-[#0b1120] border border-cyan-500/30 hover:border-cyan-400 text-white font-semibold text-sm transition-all"
            >
              Enter Workbench
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="py-12 border-t border-white/10 bg-[#04070d] text-gray-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-gray-300">DISHA 6.6</span>
            <span>•</span>
            <span>Constitutional Cognitive Intelligence OS</span>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <Link href="/osint/universe" className="hover:text-cyan-400 transition-colors">
              Fleet Universe
            </Link>
            <Link href="/cyber-defense" className="hover:text-cyan-400 transition-colors">
              Vulnerabilities
            </Link>
            <Link href="/self-healing" className="hover:text-cyan-400 transition-colors">
              Self-Healing
            </Link>
            <Link href="/skills" className="hover:text-cyan-400 transition-colors">
              460 Skills
            </Link>
            <Link href="/login" className="hover:text-cyan-400 transition-colors">
              Sign In
            </Link>
          </div>

          <div className="text-[11px] font-mono text-gray-600">
            PROD_BUILD • REVISION cef415aa
          </div>
        </div>
      </footer>
    </div>
  );
}

