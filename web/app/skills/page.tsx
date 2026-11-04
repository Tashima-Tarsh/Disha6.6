"use client";

import { useState } from "react";
import { Bot, CheckCircle2, ShieldCheck, Terminal, FileText, RefreshCw, Play } from "lucide-react";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch, SwitchLabel } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { describeCapability, getCapabilityReadiness, listSkills, type RegisteredSkill } from "@/lib/skills/capability-readiness";

const CATEGORIES: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ai-research", label: "AI Research" },
  { id: "scientific-computing", label: "Scientific Computing" },
  { id: "computer-networking", label: "Computer Networking" },
  { id: "cognitive-memory", label: "Cognitive Memory" },
  { id: "cybersecurity", label: "Cybersecurity" },
  { id: "software-engineering", label: "Software Engineering" },
  { id: "design-frontend", label: "Design & Frontend" },
  { id: "intelligence-osint", label: "Intelligence / OSINT" },
  { id: "general", label: "General" },
  { id: "mobile-android", label: "Mobile / Android" },
  { id: "api-integration", label: "API Integration" },
  { id: "reverse-engineering", label: "Reverse Engineering" },
];

export default function SkillsPage() {
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [executing, setExecuting] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const readiness = getCapabilityReadiness({ search: category === "all" ? "" : category, limit: 500 });
  const skills = listSkills({
    category: category === "all" ? undefined : category,
    search: search || undefined,
    limit: 200,
  });

  const handleExecute = async (skill: RegisteredSkill) => {
    setExecuting(skill.id);
    try {
      const res = await fetch("/api/skills/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: skill.id,
          taskPrompt: search || skill.name,
          params: {},
        }),
      });
      const result = await res.json();
      setLastResult(result);
    } catch (err) {
      setLastResult({
        skillId: skill.id,
        status: "FAILED",
        summary: err instanceof Error ? err.message : String(err),
        output: {},
      });
    } finally {
      setExecuting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-sm font-bold tracking-tighter text-slate-100 uppercase">Skills &middot; Skill Registry</h1>
          <p className="text-[10px] text-slate-400">Offline skill executors, governed execution, evidence-ledger certified</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search skills…"
            className="w-48"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <aside className="lg:col-span-3 space-y-4">
          <Card className="p-4">
            <CardHeader>
              <CardTitle>Catalogue</CardTitle>
              <CardDescription>{readiness.catalogued} skills indexed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-1">
              {CATEGORIES.map((c) => {
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${active ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"}`}
                  >
                    <Bot className="h-3 w-3 shrink-0 opacity-50" />
                    {c.label}
                  </button>
                );
              })}
            </CardContent>
          </Card>
          <Card className="p-4">
            <CardHeader>
              <CardTitle>Readiness</CardTitle>
              <CardDescription>Capability mode per category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                  <span className="text-slate-300">Offline executors</span>
                  <Badge variant="success">{readiness.offlineValidatorMappings}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                  <span className="text-slate-300">Instruction-only</span>
                  <Badge variant="outline">{readiness.instructionOnlyMappings}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-300">Independently certified</span>
                  <Badge variant="outline">{readiness.independentlyCertifiedExecutors}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="lg:col-span-9 space-y-4">
          <Tabs defaultValue="list">
            <TabsList className="grid grid-cols-3 gap-1">
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="readiness">Readiness</TabsTrigger>
              <TabsTrigger value="governance">Governance</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="pt-2">
              <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-[9px] uppercase">
                      <th className="px-3 py-2 font-mono">Skill</th>
                      <th className="px-3 py-2 font-mono">Category</th>
                      <th className="px-3 py-2 font-mono">Mode</th>
                      <th className="px-3 py-2 font-mono text-right">Execute</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {skills.map((s: RegisteredSkill) => {
                      const cap = describeCapability(s);
                      return (
                        <tr key={s.id} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <Bot className="h-3 w-3 text-slate-500 shrink-0" />
                              <span className="text-xs text-slate-200">{s.name}</span>
                              {s.compatibility.governed && <span className="ml-1 text-[9px] text-cyan-500">GOV</span>}
                            </div>
                            <p className="text-[9px] text-slate-500 mt-0.5">{s.description}</p>
                          </td>
                          <td className="px-3 py-3 font-mono text-[9px] text-slate-400">
                            {s.category}
                          </td>
                          <td className="px-3 py-3">
                            <Badge
                              variant={cap.mode === "OFFLINE_LIMITED" ? "success" : "outline"}
                              className="text-[9px] font-mono"
                            >
                              {cap.mode}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-right">
                            {executing === s.id ? (
                              <Terminal className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                            ) : (
                              <Button
                                size="sm"
                                variant="cyber"
                                onClick={() => handleExecute(s)}
                                disabled={s.compatibility.requiresApproval}
                              >
                                {s.compatibility.requiresApproval ? "Approval" : "Run"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {skills.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-[10px] text-slate-500">
                          No skills found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="readiness">
              <div className="space-y-3">
                {readiness.entries.map((e) => (
                  <Card key={e.id} className="p-3">
                    <CardHeader className="pb-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-[10px]">{e.name}</CardTitle>
                        <Badge variant={e.requiresApproval ? "destructive" : "default"} className="text-[8px]">
                          {e.requiresApproval ? "APPROVAL" : "READ-ONLY"}
                        </Badge>
                      </div>
                      <CardDescription className="text-[9px]">{e.category}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-1">
                      <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1">
                        <span>Mode</span>
                        <span className="font-mono text-slate-200">{e.mode}</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-400">
                        <span>Executor</span>
                        <span className="font-mono text-slate-200">{e.executor ?? "none"}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-2">{e.limitation}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="governance">
              <Card className="p-5">
                <CardHeader>
                  <CardTitle>Governance model</CardTitle>
                  <CardDescription>Every skill execution passes the policy gate and is hash-chained into the evidence ledger.</CardDescription>
                </CardHeader>
                <CardContent className="pt-3 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-slate-100">Policy Gate (deny-by-default)</div>
                        <div className="text-[9px] text-slate-400">Every requested action is evaluated before execution; DENY/ESCALATE block or require approval.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-slate-100">Evidence Ledger</div>
                        <div className="text-[9px] text-slate-400">Append-only, cryptographically hash-chained; fail-closed if the ledger write fails.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Terminal className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-slate-100">Zero simulation</div>
                        <div className="text-[9px] text-slate-400">Executors return real results or honest NOT_EXECUTED; no synthetic findings.</div>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="bg-slate-900/40 rounded-lg border border-slate-800 p-3 text-[9px] text-slate-400">
                    <div className="flex items-start gap-2 mb-1">
                      <Play className="h-3 w-3 text-slate-500 shrink-0 mt-0.5" />
                      <div className="font-mono">Run a skill → policy gate → verified grant (if required) → executor → evidence ledger → result.</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </div>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle>Last Execution Result</CardTitle>
            <CardDescription>{lastResult.skillId}</CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={lastResult.status === "SUCCESS" ? "success" : lastResult.status === "POLICY_DENIED" ? "destructive" : "outline"} className="text-[9px]">
                {lastResult.status}
              </Badge>
              {lastResult.cached && <Badge variant="cyan" className="text-[9px]">cached</Badge>}
              {lastResult.evidenceId && <span className="text-[9px] text-slate-500">evidence: {lastResult.evidenceId}</span>}
            </div>
            <div className="text-[9px] text-slate-200 font-mono">{lastResult.summary}</div>
            <pre className="mt-2 overflow-auto rounded border border-slate-800 bg-slate-950 p-2 text-[9px] text-cyan-300 font-mono">
              {JSON.stringify(lastResult.output, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
