"use client";

import { useEffect, useState } from "react";
import { Server, Database, Wifi, ShieldAlert, Activity, Globe, Link, Eye } from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Server,
  Database,
  Wifi,
  ShieldAlert,
  Activity,
  Globe,
  Link,
  Eye,
};

type Service = {
  id: string;
  label: string;
  icon: keyof typeof ICONS;
  url: string;
};

const SERVICES: Service[] = [
  { id: "disha-web", label: "DISHA Web", icon: "Globe", url: "/" },
  { id: "osint-backend", label: "OSINT Backend", icon: "Server", url: "/api/osint/tools" },
  { id: "postgres", label: "PostgreSQL", icon: "Database", url: "/api/v1/health" },
  { id: "redis", label: "Redis", icon: "Activity", url: "/api/v1/health" },
  { id: "osiris", label: "OSIRIS Intelligence", icon: "ShieldAlert", url: "/api/intelligence/health" },
  { id: "ollama", label: "Ollama AI", icon: "Wifi", url: "/api/ai/models" },
];

interface IntelligenceHUDProps {
  osirisUrl?: string;
}

export default function IntelligenceHUD({ osirisUrl }: IntelligenceHUDProps) {
  const [services, setServices] = useState<Record<string, { status: "healthy" | "degraded" | "offline"; latency?: number }>>(
    Object.fromEntries(SERVICES.map((s) => [s.id, { status: "offline" }])),
  );
  const [feeds, setFeeds] = useState<Record<string, { count: number; freshness: string }>>({});

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const results: Record<string, { status: "healthy" | "degraded" | "offline"; latency?: number }> = {};
      await Promise.all(
        SERVICES.map(async (svc) => {
          const start = Date.now();
          try {
            let res: Response;
            if (svc.id === "osiris") {
              res = await fetch(`${osirisUrl || "http://127.0.0.1:3005"}/api/health`, {
                signal: AbortSignal.timeout(6000),
                headers: { Accept: "application/json" },
              });
            } else if (svc.id === "ollama") {
              res = await fetch("http://127.0.0.1:11434/api/tags", {
                signal: AbortSignal.timeout(6000),
                headers: { Accept: "application/json" },
              });
            } else {
              res = await fetch(svc.url, {
                signal: AbortSignal.timeout(6000),
                headers: { Accept: "application/json" },
              });
            }
            const latency = Date.now() - start;
            results[svc.id] = {
              status: res.ok ? "healthy" : "degraded",
              latency,
            };
          } catch {
            results[svc.id] = { status: "offline" };
          }
        }),
      );
      if (!cancelled) setServices(results);

      // OSIRIS feed freshness
      try {
        const h = await fetch(`${osirisUrl || "http://127.0.0.1:3005"}/api/intelligence/health`, {
          signal: AbortSignal.timeout(6000),
          headers: { Accept: "application/json" },
        });
        if (h.ok) {
          const j = await h.json();
          if (!cancelled) setFeeds(j.feeds ?? {});
        }
      } catch {
        /* ignore */
      }
    };
    check();
    const iv = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [osirisUrl]);

  const badge = (status: string) => ({
    healthy: "bg-emerald-900/40 text-emerald-300 border border-emerald-500/30",
    degraded: "bg-amber-900/40 text-amber-300 border border-amber-500/30",
    offline: "bg-slate-900 text-slate-500 border border-slate-800",
  }[status] ?? "bg-slate-900 text-slate-500 border border-slate-800");

  return (
    <div className="border border-slate-800 bg-slate-900/60 backdrop-blur rounded-lg p-3 text-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <span className="font-mono font-bold text-slate-100 tracking-tighter">INTELLIGENCE HUD</span>
          <span className="ml-auto text-[10px] text-slate-500 font-mono">
            ZULU {new Date().toUTCString().match(/\d{2}:\d{2}:\d{2}/)?.[0] ?? "--:--:--"}Z
          </span>
        </div>
        <div className="flex gap-1">
          {Object.entries(services).map(([id, s]) => (
            <span
              key={id}
              title={`${SERVICES.find((x) => x.id === id)?.label ?? id} ${s.latency != null ? `• ${s.latency}ms` : ""}`}
              className={`px-1.5 py-0.5 rounded border ${badge(s.status)}`}
            >
              {s.status === "healthy" ? "●" : s.status === "degraded" ? "◐" : "○"}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-hidden">
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="pb-1 pr-2 font-mono uppercase">Service</th>
              <th className="pb-1 pr-2 font-mono uppercase">Status</th>
              <th className="pb-1 font-mono uppercase">Observations</th>
            </tr>
          </thead>
          <tbody>
            {SERVICES.map((svc) => {
              const s = services[svc.id];
              const feed = feeds[svc.id];
              const Icon = ICONS[svc.icon];
              return (
                <tr key={svc.id} className="border-b border-slate-900/40 hover:bg-slate-800/20 transition-colors">
                  <td className="py-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3 text-slate-500 shrink-0" />
                      <span className="text-slate-200 font-mono">{svc.label}</span>
                    </div>
                  </td>
                  <td className="py-1 pr-2 font-mono">
                    <span className={`px-1 py-0.5 rounded ${badge(s.status)}`}>
                      {s.status === "healthy" ? "LIVE" : s.status === "degraded" ? "DEGRADED" : "OFFLINE"}
                    </span>
                    {s.latency != null && <span className="ml-1 text-slate-600">{s.latency}ms</span>}
                  </td>
                  <td className="py-1 font-mono">
                    {feed ? (
                      <>
                        <span className="text-cyan-300">{feed.count.toLocaleString()}</span>{" "}
                        <span className="text-slate-500">· {feed.freshness}</span>
                      </>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
