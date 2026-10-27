"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Layers,
  Globe,
  AlertCircle,
  Info,
} from "lucide-react";

import LeftNav from "@/components/intelligence/LeftNav";
import IntelligenceMap from "@/components/intelligence/IntelligenceMap";
import IntelligenceHUD from "@/components/intelligence/IntelligenceHUD";
import RightAnalysisPanel from "@/components/intelligence/RightAnalysisPanel";
import CommandBar from "@/components/intelligence/CommandBar";

const OSIRIS_URL = typeof window !== "undefined" ? (window as any).OSIRIS_URL ?? "http://127.0.0.1:3005" : "http://127.0.0.1:3005";

export default function IntelligencePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; value: string; layer?: string; state?: string } | null>(null);

  const observationsFor = useCallback(
    (entity: { type: string; value: string; layer?: string; state?: string } | null): any[] => {
      if (!entity) return [];
      const v = entity.value;
      const base = [
        {
          source: "OSIRIS Intelligence Grid",
          sourceUrl: `${OSIRIS_URL}/api/${entity.layer ?? "flights"}`,
          summary: `Live observation of ${entity.value} on the ${entity.layer ?? "global"} intelligence layer.`,
          retrievedAt: new Date().toISOString(),
          confidence: 0.72,
          state: "observed" as const,
        },
      ];
      return base;
    },
    [],
  );

  const observations = observationsFor(selectedEntity);

  const handleMapEntity = (entity: { type: string; value: string; layer?: string; state?: string }) => {
    setSelectedEntity(entity);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedEntity(null);
  };

  const handleSearch = (query: string) => {
    router.push(`/workbench?query=${encodeURIComponent(query)}`);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-300">
      <CommandBar className="data-hud" onSearch={handleSearch} />

      <div className="flex flex-col h-full">
        <div className="flex-1 flex overflow-hidden">
          <LeftNav className="hidden lg:block" />

          <main className="flex-1 relative min-w-0">
            <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 pointer-events-none">
              <div className="pointer-events-auto flex flex-col gap-1">
                <button
                  onClick={() => setPanelOpen(false)}
                  className="p-2 rounded bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors backdrop-blur"
                  title="Close analysis panel"
                  aria-label="Close panel"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPanelOpen((p) => !p)}
                  className="p-2 rounded bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors backdrop-blur"
                  title={panelOpen ? "Collapse panel" : "Open analysis panel"}
                  aria-label={panelOpen ? "Collapse panel" : "Open panel"}
                >
                  {panelOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="w-full h-full" style={{ height: "calc(100vh - 140px)" }}>
              <IntelligenceMap
                onEntityClick={handleMapEntity}
                initialCenter={[20, 0]}
                initialZoom={2}
              />
            </div>

            <div className="absolute bottom-4 left-4 z-30 w-[340px]">
              <IntelligenceHUD osirisUrl={OSIRIS_URL} />
            </div>
          </main>

          {panelOpen && (
            <aside className="w-80 border-l border-slate-800 bg-slate-950/95 backdrop-blur flex flex-col">
              <RightAnalysisPanel
                entity={selectedEntity}
                observations={observations}
                onClose={closePanel}
              />
            </aside>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-30">
        <a
          href={OSIRIS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded border border-slate-700 bg-slate-900/80 text-[10px] font-mono text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 backdrop-blur transition-colors"
        >
          <Globe className="h-3 w-3 shrink-0" />
          <span>OSIRIS standalone (diagnostics)</span>
        </a>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 text-[10px] text-slate-600 font-mono flex gap-4">
        <span className="flex items-center gap-1">
          <Layers className="h-3 w-3 shrink-0" />
          Layers toggleable on map
        </span>
        <span className="h-[1px] w-px bg-slate-700" />
        <span className="flex items-center gap-1">
          <Info className="h-3 w-3 shrink-0 opacity-50" />
          Model output is advisory; human review designates VERIFIED
        </span>
      </div>
    </div>
  );
}
