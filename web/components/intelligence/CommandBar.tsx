"use client";

import { useState } from "react";
import { Search, MousePointer, Keyboard } from "lucide-react";

interface CommandBarProps {
  className?: string;
  onSearch?: (query: string) => void;
}

export default function CommandBar({
  className = "",
  onSearch,
}: CommandBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    onSearch?.(q);
  };

  const examples = [
    "flights over Ukraine",
    "earthquakes M4+ Japan",
    "wildfires California",
    "CCTV London",
    "maritime chokepoints",
    "whois example.com",
  ];

  return (
    <div
      className={`sticky top-0 z-50 flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur ${className}`}
    >
      <form onSubmit={handleSubmit} className="flex-1 max-w-2xl relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Unified search · natural-language intelligence (e.g. “flights over Ukraine”)"
          className="w-full rounded border border-slate-700 bg-slate-900 px-4 py-2 pl-9 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          aria-label="Unified intelligence search"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded border border-slate-700 bg-slate-900 text-[10px] font-mono text-slate-300 hover:bg-slate-800 focus:outline-none transition-colors"
        >
          Dispatch
        </button>
      </form>

      <div className="flex-shrink-0 flex items-center gap-2 text-[9px] text-slate-500 font-mono">
        <span className="flex items-center gap-1">
          <MousePointer className="h-3 w-3 shrink-0" />
          Click map → inspect entity
        </span>
        <span className="h-[1px] w-px bg-slate-700" />
        <span className="flex items-center gap-1">
          <Keyboard className="h-3 w-3 shrink-0" />
          Cmd/Ctrl + K focus
        </span>
      </div>

      <div className="flex-shrink-0 flex flex-wrap gap-1 text-[9px]">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setQuery(ex);
              onSearch?.(ex);
            }}
            className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
          >
            “{ex}”
          </button>
        ))}
      </div>
    </div>
  );
}
