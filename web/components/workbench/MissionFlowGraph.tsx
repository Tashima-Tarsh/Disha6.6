"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export interface MissionFlowGraphProps {
  missionId: string;
  intent: string;
  lenses: string[];
  policyDecision?: "ALLOW" | "DENY" | "ESCALATE";
  agents: string[];
  evidenceCount: number;
}

export function MissionFlowGraph({
  missionId,
  intent,
  lenses,
  policyDecision = "ALLOW",
  agents,
  evidenceCount,
}: MissionFlowGraphProps) {
  const nodes: Node[] = useMemo(() => {
    const n: Node[] = [
      {
        id: "intake",
        type: "input",
        data: { label: `Intake: ${intent || "Mission Signal"}` },
        position: { x: 50, y: 150 },
        sourcePosition: Position.Right,
        style: {
          background: "#0f172a",
          color: "#38bdf8",
          border: "1px solid #0284c7",
          borderRadius: "8px",
          padding: "10px",
          fontSize: "12px",
          fontWeight: 600,
        },
      },
      {
        id: "policy-gate",
        data: {
          label: `Policy Gate: ${policyDecision}`,
        },
        position: { x: 300, y: 150 },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        style: {
          background: policyDecision === "ALLOW" ? "#064e3b" : policyDecision === "DENY" ? "#7f1d1d" : "#78350f",
          color: "#ffffff",
          border: `1px solid ${policyDecision === "ALLOW" ? "#10b981" : "#ef4444"}`,
          borderRadius: "8px",
          padding: "10px",
          fontSize: "12px",
          fontWeight: 600,
        },
      },
    ];

    // Lens nodes
    lenses.forEach((lens, idx) => {
      n.push({
        id: `lens-${lens}`,
        data: { label: `Lens: ${lens}` },
        position: { x: 550, y: 50 + idx * 80 },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        style: {
          background: "#1e1b4b",
          color: "#c084fc",
          border: "1px solid #a855f7",
          borderRadius: "8px",
          padding: "8px",
          fontSize: "11px",
        },
      });
    });

    // Evidence node
    n.push({
      id: "evidence-vault",
      type: "output",
      data: { label: `Evidence Ledger: ${evidenceCount} events` },
      position: { x: 800, y: 150 },
      targetPosition: Position.Left,
      style: {
        background: "#022c22",
        color: "#34d399",
        border: "1px solid #059669",
        borderRadius: "8px",
        padding: "10px",
        fontSize: "12px",
        fontWeight: 600,
      },
    });

    return n;
  }, [intent, policyDecision, lenses, evidenceCount]);

  const edges: Edge[] = useMemo(() => {
    const e: Edge[] = [
      {
        id: "e-intake-policy",
        source: "intake",
        target: "policy-gate",
        animated: true,
        style: { stroke: "#38bdf8", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#38bdf8" },
      },
    ];

    if (policyDecision !== "DENY") {
      lenses.forEach((lens) => {
        e.push({
          id: `e-policy-${lens}`,
          source: "policy-gate",
          target: `lens-${lens}`,
          animated: true,
          style: { stroke: "#a855f7", strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#a855f7" },
        });
        e.push({
          id: `e-${lens}-evidence`,
          source: `lens-${lens}`,
          target: "evidence-vault",
          animated: true,
          style: { stroke: "#10b981", strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
        });
      });
    }

    return e;
  }, [policyDecision, lenses]);

  return (
    <div className="w-full h-80 rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-2xl relative">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background color="#334155" gap={16} size={1} />
        <Controls className="bg-slate-900 border-slate-700 text-slate-200 fill-slate-200" />
        <MiniMap
          nodeColor={(node) => {
            if (node.id === "policy-gate") return "#10b981";
            if (node.id === "evidence-vault") return "#34d399";
            return "#38bdf8";
          }}
          className="bg-slate-900/90 border border-slate-800 rounded-lg"
        />
      </ReactFlow>
      <div className="absolute top-2 left-2 z-10 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700 text-[10px] font-mono text-cyan-400">
        DAG: {missionId} | {agents.length} AGENTS ACTIVE
      </div>
    </div>
  );
}

