"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe,
  Radar,
  Shield,
  Crosshair,
  Satellite,
  AlertTriangle,
  Sparkles,
  Bot,
  Activity,
  FileText,
  Settings,
  Network,
  Link as LinkIcon,
  Database,
} from "lucide-react";

type Module = {
  id: string;
  label: string;
  href: string | null;
  icon: React.ComponentType<{ className?: string }>;
  status: "live" | "degraded" | "configuration_required";
  description: string;
};

const MODULES: Module[] = [
  { id: "global-intelligence", label: "Global Intelligence", href: "/intelligence", icon: Globe, status: "live", description: "MapLibre world grid with live OSIRIS feeds" },
  { id: "mission-control", label: "Mission Control", href: "/workbench", icon: Radar, status: "live", description: "Constitutional mission orchestrator and lens pipeline" },
  { id: "osint-workbench", label: "OSINT Workbench", href: "/workbench", icon: Shield, status: "live", description: "43 passive/active collectors with evidence ledger" },
  { id: "cyber-intelligence", label: "Cyber Intelligence", href: "/api/cyber-defense", icon: Network, status: "live", description: "CVE, threat feeds, and defensive posture" },
  { id: "recon-asset-assessment", label: "Recon & Asset Assessment", href: null, icon: Crosshair, status: "configuration_required", description: "RECON scanner backend not configured" },
  { id: "threat-intelligence", label: "Threat Intelligence", href: null, icon: AlertTriangle, status: "configuration_required", description: "OpenCTI / IntelOwl not connected" },
  { id: "vyuha-defense", label: "VYUHA Defense", href: null, icon: Satellite, status: "configuration_required", description: "Defensive proposals only; execution disabled" },
  { id: "honeypot-intelligence", label: "Honeypot Intelligence", href: null, icon: Activity, status: "configuration_required", description: "Honeypot telemetry intake not deployed" },
  { id: "ai-command-center", label: "AI Command Center", href: "/api/chat", icon: Sparkles, status: "live", description: "Ollama-backed assistant (local model required)" },
  { id: "agents-skills", label: "Agents & Skills", href: null, icon: Bot, status: "configuration_required", description: "Agent skill registry read-only" },
  { id: "workflow-automation", label: "Workflow Automation", href: null, icon: Database, status: "configuration_required", description: "Durable workflow store; n8n/MCP not wired" },
  { id: "evidence-ledger", label: "Evidence Ledger", href: "/api/evidence/events", icon: FileText, status: "live", description: "Append-only, hash-chained evidence events" },
  { id: "reports-investigations", label: "Reports & Investigations", href: "/api/export", icon: LinkIcon, status: "live", description: "Forensic report export and case archive" },
  { id: "settings-integrations", label: "Settings & Integrations", href: null, icon: Settings, status: "live", description: "Upstream registry, adapter bus, policy gateway" },
];

const STATUS_BADGE: Record<string, string> = {
  live: "bg-emerald-900/40 text-emerald-300 border border-emerald-500/30",
  degraded: "bg-amber-900/40 text-amber-300 border border-amber-500/30",
  configuration_required: "bg-slate-900 text-slate-500 border border-slate-800",
};

interface LeftNavProps {
  className?: string;
}

export default function LeftNav({ className = "" }: LeftNavProps) {
  const pathname = usePathname();

  return (
    <nav className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-950/90 backdrop-blur flex flex-col ${className}`}>
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-800">
        <Globe className="h-5 w-5 text-cyan-400" />
        <span className="font-mono font-bold text-slate-100 tracking-tighter text-[11px] uppercase">DISHA</span>
        <span className="ml-auto text-[9px] text-slate-500 font-mono">v6.6</span>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2">
        <div className="px-3 mb-2">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1 block">Intelligence</span>
          {MODULES.slice(0, 3).map((m) => {
            const Icon = m.icon;
            const active = pathname === m.href || (m.href === "/workbench" && pathname.startsWith("/workbench"));
            return (
              <div key={m.id} className="mb-1">
                {m.href ? (
                  <Link
                    href={m.href}
                    className={`flex w-full items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                      active
                        ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/40"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="text-xs font-mono">{m.label}</span>
                    <span className={`ml-auto px-1 py-0.5 rounded ${STATUS_BADGE[m.status]}`}>
                      {m.status === "live" ? "LIVE" : m.status === "degraded" ? "DEGRADED" : "REQUIRED"}
                    </span>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-left text-slate-500/50 cursor-not-allowed"
                  >
                    <Icon className="h-4 w-4 text-slate-700 shrink-0" />
                    <span className="text-xs font-mono">{m.label}</span>
                    <span className={`ml-auto px-1 py-0.5 rounded ${STATUS_BADGE[m.status]}`}>
                      CONFIG REQ
                    </span>
                  </button>
                )}
                <p className="px-3 pt-0.5 pb-1 text-[9px] text-slate-600 font-sans">{m.description}</p>
              </div>
            );
          })}
        </div>

        <div className="px-3 mb-2 border-t border-slate-800/40 pt-3">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1 block">Operations</span>
          {MODULES.slice(3).map((m) => {
            const Icon = m.icon;
            const active = pathname === m.href;
            return (
              <div key={m.id} className="mb-1">
                {m.href ? (
                  <Link
                    href={m.href}
                    className={`flex w-full items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                      active
                        ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/40"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="text-xs font-mono">{m.label}</span>
                    <span className={`ml-auto px-1 py-0.5 rounded ${STATUS_BADGE[m.status]}`}>
                      {m.status === "live" ? "LIVE" : m.status === "degraded" ? "DEGRADED" : "REQUIRED"}
                    </span>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-left text-slate-500/50 cursor-not-allowed"
                  >
                    <Icon className="h-4 w-4 text-slate-700 shrink-0" />
                    <span className="text-xs font-mono">{m.label}</span>
                    <span className={`ml-auto px-1 py-0.5 rounded ${STATUS_BADGE[m.status]}`}>
                      CONFIG REQ
                    </span>
                  </button>
                )}
                <p className="px-3 pt-0.5 pb-1 text-[9px] text-slate-600 font-sans">{m.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 font-mono">Constitutional mode active</span>
        </div>
      </div>
    </nav>
  );
}
