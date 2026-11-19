"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VyuhaCanvas, type VyuhaCameraView } from "./VyuhaCanvas";
import { getVyuhaFormation, VYUHA_FORMATIONS } from "./formation-catalog";

const PHASES = [
  { title: "DETECT", detail: "An observation enters the virtual sensor field." },
  { title: "CLASSIFY", detail: "DISHA evaluates the simulated signal and its context." },
  { title: "FORM", detail: "The selected defensive VYUHA forms around the protected core." },
  { title: "SHIELD", detail: "Defense boundaries are shown without executing controls." },
  { title: "PRESERVE", detail: "A simulated evidence trail converges on the central node." },
  { title: "REVIEW", detail: "Policy and human authorization remain mandatory." },
] as const;

export default function VyuhaCinema() {
  const [formationId, setFormationId] = useState<string>("chakra_vyuha");
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [view, setView] = useState<VyuhaCameraView>("orbit");
  const [autoCycle, setAutoCycle] = useState(true);
  const selected = getVyuhaFormation(formationId);

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => {
      setPhase((current) => {
        const next = (current + 1) % PHASES.length;
        if (next === 0 && autoCycle) {
          setFormationId((id) => {
            const index = VYUHA_FORMATIONS.findIndex((formation) => formation.id === id);
            return VYUHA_FORMATIONS[(index + 1) % VYUHA_FORMATIONS.length].id;
          });
        }
        return next;
      });
    }, 4200);
    return () => window.clearInterval(interval);
  }, [playing, autoCycle]);

  const chooseFormation = (id: string) => {
    setFormationId(id);
    setPhase(0);
  };

  return (
    <section className="mx-auto max-w-[1640px] space-y-4 pb-8" aria-label="DISHA 6.6 VYUHA cinematic defense viewer">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold tracking-[0.28em] text-cyan-300/80">DISHA 6.6 / VISUAL INTELLIGENCE</p>
          <h1 className="text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl">
            VYUHA <span className="text-cyan-300">DEFENSE UNIVERSE</span>
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-slate-400">
            Cinematic visualization of the repository&apos;s eight OSINT VYUHA formations. No live incident, scan, activation or verification is implied.
          </p>
        </div>
        <Link href="/login" className="rounded-full border border-white/20 px-4 py-2 text-xs text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200">
          Operator login
        </Link>
      </div>

      <div className="relative min-h-[670px] overflow-hidden rounded-[22px] border border-cyan-300/20 bg-[#030917] shadow-[0_0_95px_rgba(24,84,143,0.15)] sm:min-h-[750px]">
        <VyuhaCanvas formationId={formationId} view={view} paused={!playing} />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(2,7,19,0.96)_0%,rgba(2,7,19,0.50)_32%,transparent_70%),linear-gradient(0deg,rgba(2,7,19,0.98)_0%,transparent_55%,rgba(2,7,19,0.67)_100%)]" />
        <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-start justify-between gap-4 sm:left-8 sm:right-8 sm:top-7">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.24em] text-cyan-300">DISHA // DEFENSE CONTROLLER</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">{selected.name}</p>
            <p className="mt-2 max-w-sm text-xs leading-6 text-slate-300">{selected.purpose}</p>
          </div>
          <div className="hidden rounded-xl border border-cyan-200/20 bg-slate-950/70 px-3 py-2 text-right sm:block">
            <span className="block text-[9px] tracking-[0.2em] text-slate-500">DISPLAY STATUS</span>
            <span className="block text-[10px] tracking-[0.14em] text-cyan-200">SIMULATED · PROPOSAL ONLY</span>
          </div>
        </div>

        <div className="pointer-events-none absolute left-4 right-4 top-36 sm:left-8 sm:top-44">
          <div className="max-w-[250px] border-l border-cyan-400/50 pl-3 sm:max-w-xs">
            <p className="text-[10px] tracking-[0.23em] text-cyan-200">{PHASES[phase].title} // {String(phase + 1).padStart(2, "0")}</p>
            <p key={`${formationId}-${phase}`} className="mt-2 text-xs leading-6 text-slate-300">{PHASES[phase].detail}</p>
            <p className="mt-3 text-[11px] italic leading-5 text-slate-400">{selected.narration}</p>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 space-y-4 sm:bottom-7 sm:left-8 sm:right-8">
          <div className="pointer-events-none grid grid-cols-6 gap-1" aria-label="Cinematic mission phases">
            {PHASES.map((item, index) => (
              <div key={item.title} className="space-y-2">
                <div className={`h-[2px] transition-colors ${index <= phase ? "bg-cyan-300" : "bg-white/15"}`} />
                <span className={`block text-[8px] tracking-[0.08em] sm:text-[9px] ${index === phase ? "text-cyan-100" : "text-slate-500"}`}>{item.title}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/15 bg-[#071222]/90 p-3 backdrop-blur-xl sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[9px] tracking-[0.2em] text-slate-500">FORMATION SELECTOR</p>
                <p className="mt-1 text-xs text-slate-200">{selected.title} <span className="text-slate-500">/ {selected.signal}</span></p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlaying((value) => !value)}
                  aria-pressed={playing}
                  className="rounded-md border border-cyan-300/35 px-3 py-2 text-[10px] font-medium tracking-widest text-cyan-100 hover:bg-cyan-300/10"
                >
                  {playing ? "PAUSE FILM" : "PLAY FILM"}
                </button>
                <button
                  type="button"
                  onClick={() => setAutoCycle((value) => !value)}
                  aria-pressed={autoCycle}
                  className={`rounded-md border px-3 py-2 text-[10px] tracking-widest ${autoCycle ? "border-cyan-300/35 text-cyan-100" : "border-white/15 text-slate-400"}`}
                >
                  AUTO CYCLE {autoCycle ? "ON" : "OFF"}
                </button>
                <label className="text-[10px] text-slate-400">
                  CAMERA
                  <select
                    aria-label="Camera angle"
                    value={view}
                    onChange={(event) => setView(event.target.value as VyuhaCameraView)}
                    className="ml-2 rounded-md border border-white/20 bg-[#0a1c2d] px-2 py-2 text-[10px] text-white"
                  >
                    <option value="orbit">ORBIT</option>
                    <option value="overhead">TOP VIEW</option>
                    <option value="side">SIDE VIEW</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Select defensive formation">
              {VYUHA_FORMATIONS.map((formation) => {
                const selectedNow = formation.id === formationId;
                return (
                  <button
                    key={formation.id}
                    type="button"
                    onClick={() => chooseFormation(formation.id)}
                    aria-pressed={selectedNow}
                    className={`shrink-0 rounded-lg border px-3 py-3 text-left transition-colors ${selectedNow ? "border-cyan-300/65 bg-cyan-300/10 text-white" : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/40 hover:text-white"}`}
                  >
                    <span className="block text-[10px] font-semibold tracking-[0.09em]">{formation.name}</span>
                    <span className="mt-1 block text-[9px] text-slate-500">{formation.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs leading-6 text-slate-500">
        VISUALIZATION ONLY · Drag the scene to rotate the viewpoint. The film depicts proposed defensive patterns and simulated evidence.
        Actual VYUHA recommendations, authorization, audit and evidence review remain governed by the existing DISHA backend.
      </p>
    </section>
  );
}
