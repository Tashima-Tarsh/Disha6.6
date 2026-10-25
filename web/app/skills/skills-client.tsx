"use client";

import React, { useState, useMemo } from "react";
import { Search, Sparkles, Shield, Cpu, Code2, Brain, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import skillsData from "@/data/skills/skills-index.json";

interface SkillItem {
  id: string;
  name: string;
  category: string;
  description: string;
  path: string;
  tokenEstimate: number;
  compatibility: {
    runtime: string;
    requiresApproval: boolean;
    governed: boolean;
  };
}

const allSkills = skillsData as SkillItem[];

export function SkillsExplorerClient() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeSkill, setActiveSkill] = useState<SkillItem | null>(null);
  const [taskPrompt, setTaskPrompt] = useState("");
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  const categories = useMemo(() => {
    const counts: Record<string, number> = { all: allSkills.length };
    for (const s of allSkills) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    return counts;
  }, []);

  const filteredSkills = useMemo(() => {
    return allSkills.filter((s) => {
      const matchCat = selectedCategory === "all" || s.category === selectedCategory;
      const matchSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, selectedCategory]);

  async function handleExecuteSkill() {
    if (!activeSkill) return;
    setExecuting(true);
    setExecutionResult(null);

    try {
      const res = await fetch("/api/v1/skills/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: activeSkill.id,
          taskPrompt: taskPrompt || `Execute standard ${activeSkill.name} verification task`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExecutionResult(data);
      } else {
        const err = await res.json().catch(() => ({ error: "Failed executing skill" }));
        setExecutionResult({ status: "FAILED", error: err.error || "Execution failed" });
      }
    } catch (e: any) {
      setExecutionResult({ status: "FAILED", error: e.message });
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto text-slate-100">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-7 w-7 text-cyan-400" />
          <h1 className="text-2xl font-bold tracking-tight text-white">Agent Skills Explorer</h1>
          <Badge variant="cyan">{allSkills.length} SKILLS REGISTERED</Badge>
        </div>
        <p className="text-sm text-slate-400">
          Canonical index of Anthropic Agent Skills, Superpowers, UI UX Pro Max, and DISHA native skills.
          Every skill is policy-gated and logged to the Evidence Ledger.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search 460 skills by keyword, tool, or capability..."
            className="pl-9 bg-slate-900/90 border-slate-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {Object.entries(categories).map(([cat, count]) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="text-xs capitalize whitespace-nowrap"
            >
              {cat} ({count})
            </Button>
          ))}
        </div>
      </div>

      {/* Main Grid: Skills List & Execution Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[750px] overflow-y-auto pr-2">
          {filteredSkills.slice(0, 100).map((skill) => {
            const isSelected = activeSkill?.id === skill.id;
            return (
              <Card
                key={skill.id}
                className={`cursor-pointer transition-all hover:border-cyan-500/50 ${
                  isSelected ? "border-cyan-400 bg-slate-900/95 ring-1 ring-cyan-400" : "bg-slate-900/60"
                }`}
                onClick={() => {
                  setActiveSkill(skill);
                  setExecutionResult(null);
                }}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold truncate text-white">{skill.name}</CardTitle>
                    <Badge variant={skill.category === "cybersecurity" ? "destructive" : "secondary"}>
                      {skill.category}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {skill.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>~{skill.tokenEstimate} tokens</span>
                  <span>{skill.compatibility.runtime}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detail & Execution Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 bg-slate-900/90 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base text-cyan-300">
                {activeSkill ? activeSkill.name : "Select a Skill"}
              </CardTitle>
              <CardDescription className="text-xs">
                {activeSkill ? `ID: ${activeSkill.id} | ${activeSkill.path}` : "Click any skill to inspect details and launch task"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {activeSkill ? (
                <>
                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    {activeSkill.description}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-400">Task Instruction Prompt</label>
                    <Input
                      placeholder="e.g. Audit login form accessibility compliance"
                      value={taskPrompt}
                      onChange={(e) => setTaskPrompt(e.target.value)}
                      className="text-xs bg-slate-950 border-slate-700"
                    />
                  </div>

                  <Button
                    variant="cyber"
                    className="w-full gap-2"
                    onClick={handleExecuteSkill}
                    disabled={executing}
                  >
                    <Play className="h-4 w-4" />
                    {executing ? "Governed Execution..." : "Execute Skill Task"}
                  </Button>

                  {executionResult && (
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-2 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        {executionResult.status === "SUCCESS" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-400" />
                        )}
                        <span className={executionResult.status === "SUCCESS" ? "text-emerald-400" : "text-red-400"}>
                          {executionResult.status}
                        </span>
                      </div>
                      <p className="text-slate-300">{executionResult.summary || executionResult.error}</p>
                      {executionResult.evidenceId && (
                        <span className="text-[10px] text-cyan-400">Ledger Event: {executionResult.evidenceId}</span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  Select any skill from the index to test execution against policy gate.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

