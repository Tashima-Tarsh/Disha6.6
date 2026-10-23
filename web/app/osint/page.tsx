"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Scan, Search, User, Phone, Mail, CreditCard, Globe, ShieldAlert,
  Lock, MapPin, Activity, Network, Database, BarChart3, Wifi, Eye,
  AlertTriangle, Zap, Shell, Terminal, Cube, Layers, Waves
} from "lucide-react";

const ICONS: Record<string, any> = {
  Scan, Search, User, Phone, Mail, CreditCard, Globe, ShieldAlert,
  Lock, MapPin, Activity, Network, Database, BarChart3, Wifi, Eye,
  AlertTriangle, Zap, Shell, Terminal, Cube, Layers, Waves
};

export default function OsintPage() {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<any[]>([]);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);
  const [graphStats, setGraphStats] = useState<any>(null);
  const [vyuhFormations, setVyuhFormations] = useState<any>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const streamRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/osint/graph/stats")
      .then((r) => r.json()).then(setGraphStats).catch(() => {});
    fetch("/api/osint/vyuh/formations")
      .then((r) => r.json()).then((d) => setVyuhFormations(d.formations || {})).catch(() => {});
  }, []);

  const handleInputChange = (key: string, value: string) => {
    setInputs((prev) => {
      if (!value) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  };

  const runScan = useCallback(async () => {
    if (!Object.values(inputs).some(Boolean)) {
      setStatus("Enter at least one field");
      return;
    }
    setLoading(true);
    setStatus("Scanning all collectors…");
    setResults([]);
    streamRef?.current?.abort();
    const ctrl = new AbortController();
    streamRef.current = ctrl;

    try {
      const res = await fetch("/api/osint/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
        signal: ctrl.signal,
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        if (ctrl.signal.aborted) break;
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop()!;
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(part.slice(6));
            if (d.done) { setStatus("Scan complete"); continue; }
            if (d.meta) { setStatus(`Running ${d.meta.queued} collectors…`); continue; }
            setResults((prev) => {
              const exists = prev.findIndex((p) => p.name === d.name);
              if (exists >= 0) {
                const next = [...prev];
                next[exists] = d;
                return next;
              }
              return [...prev, d];
            });
          } catch {}
        }
      }
    } catch (e: any) {
      setStatus("Error: " + (e?.message ?? String(e)));
    } finally {
      setLoading(false);
    }
  }, [inputs]);

  const runResolve = async () => {
    const q = Object.values(inputs)[0] || "";
    if (!q) return;
    setStatus("Resolving graph…");
    try {
      const res = await fetch("/api/osint/resolve", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q }),
      });
      const d = await res.json();
      setStatus(d.found ? "Graph resolved" : "Not in local dumps");
      setResults([{ name: "Graph Resolve", category: "identity", unmasked: true, result: d }]);
    } catch (e: any) {
      setStatus("Resolve error: " + (e?.message ?? String(e)));
    }
  };

  const loadData = async (dir = "data/india") => {
    setStatus("Loading dump CSVs…");
    try {
      const res = await fetch("/api/osint/data/load", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ directory: dir }),
      });
      const d = await res.json();
      setStatus(`Loaded: ${JSON.stringify(d).slice(0, 120)}`);
      fetch("/api/osint/graph/stats").then((r) => r.json()).then(setGraphStats);
    } catch (e: any) {
      setStatus("Load error: " + (e?.message ?? String(e)));
    }
  };

  const activateVyuh = (id: string) => {
    setStatus(`Activating ${id}…`);
    fetch("/api/osint/vyuh/activate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formation_id: id, inputs }),
    }).then((r) => r.json()).then((d) => {
      setStatus(`Vyuh ${id} activated`);
      setResults([{ name: `Vyuh: ${d.name}`, category: "vyuh", unmasked: true, result: d }]);
    }).catch((e) => setStatus("Vyuh error: " + e));
  };

  const pretty = (v: any) => (typeof v === "string" ? v : JSON.stringify(v, null, 2));

  const fieldGroups: Record<string, { label: string; icon: string; placeholder: string }> = {
    name: { label: "Name", icon: "User", placeholder: "Rahul Sharma" },
    username: { label: "Username", icon: "User", placeholder: "rahulsharma" },
    email: { label: "Email", icon: "Mail", placeholder: "you@example.com" },
    phone: { label: "Mobile", icon: "Phone", placeholder: "+919876543210" },
    vehicle: { label: "Vehicle RC", icon: "CreditCard", placeholder: "MH12AB1234" },
    password: { label: "Password (breach check)", icon: "Lock", placeholder: "yourpassword", type: "password" },
    domain: { label: "Domain", icon: "Globe", placeholder: "example.com" },
    ip: { label: "IP Address", icon: "MapPin", placeholder: "1.2.3.4" },
    aadhaar: { label: "Aadhaar", icon: "ShieldAlert", placeholder: "123456789012" },
    pan: { label: "PAN", icon: "Lock", placeholder: "ABCDE1234F" },
    epic: { label: "EPIC (Voter)", icon: "MapPin", placeholder: "ABC1234567" },
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-[#e2e8f0] font-sans selection:bg-[#22d3ee]/30">
      {/* 3D HUD overlay */}
      <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-72 left-20 w-16 h-16 border border-[#22d3ee] border-r-0 border-b-0" />
        <div className="absolute top-72 right-20 w-16 h-16 border border-[#22d3ee] border-l-0 border-b-0" />
        <div className="absolute bottom-72 left-20 w-16 h-16 border border-[#22d3ee] border-r-0 border-t-0" />
        <div className="absolute bottom-72 right-20 w-16 h-16 border border-[#22d3ee] border-l-0 border-t-0" />
        <div className="absolute inset-0 h-[2px] bg-gradient-to-r from-transparent via-[#22d3ee]/40 to-transparent animate-[scan_3s_linear_infinite]" />
        <style jsx>{`
          @keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        `}</style>
      </div>

      <header className="relative z-20 h-16 border-b border-[#1f2937] bg-[#0b1121]/80 backdrop-blur flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#22d3ee] shadow-[0_0_12px_#22d3ee] animate-pulse" />
          <h1 className="text-lg font-black tracking-wider text-[#22d3ee]">DISHA<span className="text-[#a855f7]">.6</span></h1>
          <span className="text-xs text-[#64748b] uppercase tracking-widest">Cyber Surveillance Command Center</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[#64748b] font-mono">
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" /> SYSTEM LIVE</div>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" /> VYUH MATRIX</div>
          <span id="clock">00:00:00</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-20">
        {/* Left rail */}
        <aside className="w-72 border-r border-[#1f2937] bg-[#0b1121] flex flex-col z-20">
          <div className="p-5 border-b border-[#1f2937]">
            <div className="text-lg font-black tracking-wider text-[#22d3ee]">DISHA<span className="text-[#a855f7]">.6</span></div>
            <div className="text-xs text-[#64748b] mt-1">Sovereign OSINT</div>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="text-xs text-[#64748b] uppercase tracking-widest px-2 mb-2">SURVEILLANCE</div>
            <button
              onClick={() => { setResults([]); setStatus("Ready"); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-[#22d3ee]/10 text-[#22d3ee] font-bold border border-[#22d3ee]/30"
            >
              <Scan size={16} className="shrink-0" /> Universal Scan
            </button>
            <button
              onClick={runResolve}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#e2e8f0]/70 hover:bg-[#1e293b] transition"
            >
              <Network size={16} className="shrink-0" /> One-Key Graph Resolve
            </button>
            <div className="text-xs text-[#64748b] uppercase tracking-widest px-2 mb-2 mt-4">VYUH FORMATIONS</div>
            {Object.entries(vyuhFormations).map(([id, f]: any) => (
              <button
                key={id}
                onClick={() => activateVyuh(id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#e2e8f0]/70 hover:bg-[#1e293b] transition border border-transparent hover:border-[#a855f7]/30"
              >
                <Zap size={14} className="shrink-0" /> {f.name.split(" — ")[0]}
              </button>
            ))}
            <div className="text-xs text-[#64748b] uppercase tracking-widest px-2 mb-2 mt-4">INDIA MODULE</div>
            <button
              onClick={() => loadData()}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#e2e8f0]/70 hover:bg-[#1e293b] transition"
            >
              <Database size={16} className="shrink-0" /> Load Dump CSVs
            </button>
          </nav>
          <div className="p-3 text-xs text-[#64748b] border-t border-[#1f2937]">
            <div className="font-bold">Zero API cost</div>
            <div>Self-hosted · Free endpoints</div>
          </div>
        </aside>

        {/* Center workspace */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          {/* Input strip */}
          <div className="sticky top-0 z-30 flex flex-wrap gap-2 p-3 bg-[#02040a]/90 backdrop-blur border-b border-[#1f2937]">
            {Object.entries(fieldGroups).map(([key, field]) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-[10px] text-[#64748b] uppercase tracking-widest">{field.label}</label>
                <input
                  value={inputs[key] || ""}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-[150px] bg-[#111827] border border-[#334155] rounded px-2 py-1.5 text-xs text-[#e2e8f0] focus:border-[#22d3ee] focus:outline-none font-mono"
                />
              </div>
            ))}
            <button
              onClick={runScan}
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-[#22d3ee] text-[#000] font-black hover:bg-[#4ade80] disabled:opacity-50 transition"
            >
              {loading ? <Terminal className="w-4 h-4 mr-2 animate-spin" /> : "Scan Everything"}
            </button>
            <button
              onClick={runResolve}
              className="px-4 py-2 rounded-lg border border-[#a855f7]/50 text-[#a855f7] hover:bg-[#a855f7]/10 transition"
            >
              Resolve Graph
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-lg font-bold">Universal Scan</h2>
                <p className="text-[#64748b] text-xs">Breach · Accounts · Phone · Email · India · Live · Infra · Offensive · Vyuh</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-bold border ${loading ? "bg-[#22d3ee]/20 border-[#22d3ee] text-[#22d3ee] animate-pulse" : "bg-[#10b981]/20 border-[#10b981] text-[#10b981]"}`}>
                  {loading ? "SCANNING" : "LIVE"}
                </span>
                <span className="text-xs text-[#64748b]">{status}</span>
              </div>
            </div>

            {results.length === 0 && !loading && (
              <div className="h-64 flex items-center justify-center rounded-xl border-2 border-dashed border-[#334155] bg-[#0b1121]/50">
                <div className="text-center">
                  <Shell className="w-12 h-12 mx-auto text-[#334155] mb-2" />
                  <p className="text-[#64748b] text-sm">Enter an identifier above and run a scan</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((r, i) => (
                <div key={i || r.name} className="rounded-xl border border-[#334155] bg-[#0b1121] p-4 overflow-hidden relative">
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    {r.unmasked && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#ef4444]">UNMASKED</span>
                    )}
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1f2937] border border-[#334155] text-[#94a3b8]">{r.category}</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#22d3ee] mb-2">{r.name}</h3>
                  <div className="text-xs font-mono text-[#cbd5e1] break-all max-h-96 overflow-y-auto">
                    {pretty(r.result)}
                  </div>
                </div>
              ))}
            </div>

            {graphStats && (
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#334155] bg-[#0b1121] p-4">
                  <div className="text-[10px] text-[#64748b] uppercase">Graph Stats</div>
                  <div className="text-lg font-bold">{graphStats.identifiers?.toLocaleString() ?? 0}</div>
                  <div className="text-xs text-[#64748b"]>identifiers · {graphStats.edges?.toLocaleString() ?? 0} edges · {graphStats.sources ?? 0} sources</div>
                </div>
                <div className="rounded-xl border border-[#334155] bg-[#0b1121] p-4">
                  <div className="text-[10px] text-[#64748b] uppercase">Collector Registry</div>
                  <div className="text-lg font-bold">{results.length}</div>
                  <div className="text-xs text-[#64748b"]>results this session</div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <footer className="relative z-20 border-t border-[#1f2937] bg-[#0b1121] px-6 py-3 text-[10px] text-[#64748b]">
        DISHA 6.6 · Sovereign OSINT · Zero API cost · Self-hosted · Public free endpoints only
      </footer>

      <script id="clock-script">
        {`
          (function(){
            const el = document.getElementById('clock');
            function tick(){ el.textContent = new Date().toLocaleTimeString(); }
            setInterval(tick, 1000); tick();
          })();
        `}
      </script>
    </div>
  );
}
