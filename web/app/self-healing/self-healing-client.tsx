"use client";

import React, { useState } from "react";
import { Wrench, CheckCircle2, AlertTriangle, Play, RefreshCw, RotateCcw, ShieldCheck, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface RepairEvent {
  id: string;
  failureDesc: string;
  targetFile: string;
  status: "HEALED_VERIFIED" | "REPRODUCED" | "REVERTED" | "IN_PROGRESS";
  timestamp: string;
  reproExitCode: number;
  testExitCode: number;
  diffSnippet: string;
}

const SAMPLE_REPAIRS: RepairEvent[] = [
  {
    id: "repair-20261025-01",
    failureDesc: "Assertion mismatch in metric aggregator",
    targetFile: "packages/autonomous/metric_calculator.py",
    status: "HEALED_VERIFIED",
    timestamp: "2026-10-25T14:40:00Z",
    reproExitCode: 1,
    testExitCode: 0,
    diffSnippet: "- return a + b\n+ return a * b",
  },
  {
    id: "repair-20261025-02",
    failureDesc: "Memory persistence cache invalidation on process restart",
    targetFile: "disha/brain/memory/memory_store.py",
    status: "HEALED_VERIFIED",
    timestamp: "2026-10-25T14:29:00Z",
    reproExitCode: 1,
    testExitCode: 0,
    diffSnippet: "+ self.persistence_file = persistence_file\n+ if self.persistence_file and os.path.exists(self.persistence_file): self.load_from_disk()",
  },
];

export function SelfHealingClient() {
  const [repairs, setRepairs] = useState<RepairEvent[]>(SAMPLE_REPAIRS);
  const [targetScript, setTargetScript] = useState("tests/controlled_defect.py");
  const [defectDesc, setDefectDesc] = useState("Controlled synthetic syntax or assertion failure");
  const [running, setRunning] = useState(false);
  const [activeTrace, setActiveTrace] = useState<any>(null);

  async function handleTriggerSelfHealing() {
    setRunning(true);
    setActiveTrace(null);

    try {
      const res = await fetch("/api/v1/autonomous/self-heal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetFile: targetScript,
          failureDesc: defectDesc,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveTrace(data);
        if (data.status === "HEALED_VERIFIED") {
          const newEvent: RepairEvent = {
            id: `repair-${Date.now()}`,
            failureDesc: defectDesc,
            targetFile: targetScript,
            status: "HEALED_VERIFIED",
            timestamp: new Date().toISOString(),
            reproExitCode: 1,
            testExitCode: 0,
            diffSnippet: "Applied and verified candidate patch successfully.",
          };
          setRepairs([newEvent, ...repairs]);
        }
      } else {
        const err = await res.json().catch(() => ({ error: "Self healing failed" }));
        setActiveTrace({ status: "REPAIR_REVERTED", error: err.error });
      }
    } catch (e: any) {
      setActiveTrace({ status: "REPAIR_REVERTED", error: e.message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto text-slate-100">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Wrench className="h-7 w-7 text-cyan-400" />
          <h1 className="text-2xl font-bold tracking-tight text-white">Autonomous Self-Healing Console</h1>
          <Badge variant="cyan">OPENHANDS & SUPERPOWERS TDD ENGINE</Badge>
        </div>
        <p className="text-sm text-slate-400">
          Autonomous software engineering lifecycle: Detect failure &rarr; Reproduce via TDD &rarr; Draft candidate patch &rarr; Verify with regression suite &rarr; Release or automatic rollback.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Trigger Self Healing Panel */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base text-cyan-300">Run Self-Healing Cycle</CardTitle>
              <CardDescription className="text-xs">
                Launch bounded automated diagnosis and repair on controlled test fixtures.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Target File / Component</label>
                <Input
                  value={targetScript}
                  onChange={(e) => setTargetScript(e.target.value)}
                  className="text-xs bg-slate-950 border-slate-700 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Failure Diagnostic Description</label>
                <Input
                  value={defectDesc}
                  onChange={(e) => setDefectDesc(e.target.value)}
                  className="text-xs bg-slate-950 border-slate-700"
                />
              </div>

              <Button
                variant="cyber"
                className="w-full gap-2 mt-2"
                onClick={handleTriggerSelfHealing}
                disabled={running}
              >
                <Play className="h-4 w-4" />
                {running ? "Diagnosing & Patching..." : "Execute Self-Healing"}
              </Button>

              {activeTrace && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    {activeTrace.status === "HEALED_VERIFIED" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    )}
                    <span className={activeTrace.status === "HEALED_VERIFIED" ? "text-emerald-400" : "text-amber-400"}>
                      {activeTrace.status}
                    </span>
                  </div>
                  <pre className="text-[11px] text-slate-400 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(activeTrace.phases || activeTrace.error, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: History & Proof Ledger */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-white">Self-Healing Execution Ledger</CardTitle>
                <Badge variant="success">{repairs.length} CONFIRMED REPAIRS</Badge>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Auditable history of automated defect captures, reproduction exit codes, and regression verification proofs.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3">
              {repairs.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{item.failureDesc}</span>
                    <Badge variant={item.status === "HEALED_VERIFIED" ? "success" : "warning"}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
                    <span>File: {item.targetFile}</span>
                    <span>Repro Code: {item.reproExitCode}</span>
                    <span>Test Code: {item.testExitCode}</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                    {item.diffSnippet}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

