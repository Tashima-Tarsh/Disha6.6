"use client";

import React, { useState } from "react";
import { Eye, Search, Network, Link, ShieldAlert, Clock } from "lucide-react";

export interface EntityObservation {
  source: string;
  sourceUrl?: string;
  summary: string;
  retrievedAt: string;
  confidence: number;
  state: "observed" | "inferred" | "correlated" | "predicted" | "verify_required";
}

export interface RightAnalysisPanelProps {
  entity?: { type: string; value: string; layer?: string; state?: string } | null;
  observations?: EntityObservation[];
  onClose?: () => void;
  className?: string;
}

const STATE_COLOR: Record<string, string> = {
  observed: "text-emerald-300 border-emerald-900/40",
  inferred: "text-cyan-300 border-cyan-900/40",
  correlated: "text-blue-300 border-blue-900/40",
  predicted: "text-amber-300 border-amber-900/40",
  verify_required: "text-rose-300 border-rose-900/40",
};

const STATE_LABEL: Record<string, string> = {
  observed: "OBSERVED",
  inferred: "INFERRED",
  correlated: "CORRELATED",
  predicted: "PREDICTED",
  verify_required: "VERIFY REQUIRED",
};

const chipClass = (state: string) =>
  "px-1.5 py-0.5 rounded text-[9px] font-bold border " +
  STATE_COLOR[state ?? "observed"];

export default function RightAnalysisPanel({
  entity,
  observations = [],
  onClose,
  className = "",
}: RightAnalysisPanelProps) {
  const [mode, setMode] = useState<"summary" | "actions">("summary");

  const panelClass =
    "fixed inset-y-0 right-0 z-40 w-80 border-l border-slate-800 bg-slate-950/95 backdrop-blur flex flex-col " +
    className;

  return React.createElement("div", { className: panelClass },
    React.createElement("div", { className: "flex items-center justify-between px-5 py-4 border-b border-slate-800" },
      React.createElement("div", { className: "flex items-center gap-2" },
        React.createElement(Eye, { className: "h-4 w-4 text-cyan-400 shrink-0" }),
        React.createElement("span", { className: "font-mono font-bold text-slate-100 text-xs" }, "ANALYSIS PANEL")
      ),
      React.createElement("button", {
        type: "button",
        onClick: onClose,
        className: "p-1 rounded hover:bg-slate-800 transition-colors text-slate-500 hover:text-white",
        "aria-label": "Close analysis panel",
      }, React.createElement("span", { className: "text-[10px]" }, "x"))
    ),

    !entity ? React.createElement("div", {
      className: "flex-1 flex flex-col items-center justify-center text-slate-500 text-[10px] font-mono text-center p-6",
    },
      React.createElement(Clock, { className: "h-5 w-5 mb-1 text-slate-700" }),
      React.createElement("p", null, "No entity selected"),
      React.createElement("p", { className: "mt-1 text-slate-600" }, "Click a map marker or run a command to inspect an entity.")
    ) : React.createElement("div", { className: "flex-1 overflow-y-auto p-4 space-y-4" },

      React.createElement("div", { className: "rounded-lg border border-slate-800 bg-slate-900/60 p-3" },
        React.createElement("div", { className: "flex items-center gap-2 mb-2" },
          React.createElement("span", {
            className: chipClass(entity.state ?? "observed"),
          }, STATE_LABEL[entity.state ?? "observed"]),
          entity.layer ? React.createElement("span", {
            className: "px-1.5 py-0.5 rounded text-[9px] text-slate-400 border border-slate-800 bg-slate-950",
          }, entity.layer) : null
        ),
        React.createElement("div", { className: "flex items-center gap-2" },
          React.createElement("span", {
            className: "font-mono font-bold text-slate-100 text-sm truncate max-w-[140px]",
          }, entity.value),
          React.createElement("span", { className: "ml-auto text-[9px] text-slate-500 font-mono" }, entity.type)
        )
      ),

      React.createElement("div", { className: "flex gap-1 border-b border-slate-800/40 pb-1" },
        React.createElement("button", {
          onClick: () => setMode("summary"),
          className: mode === "summary"
            ? "px-2 py-1 rounded text-[9px] font-mono transition-colors bg-cyan-500/10 text-cyan-300 border border-cyan-500/40"
            : "px-2 py-1 rounded text-[9px] font-mono transition-colors text-slate-500 hover:text-slate-200",
        },
          React.createElement(Search, { className: "h-3 w-3 mr-1 shrink-0" }),
          " Summary"
        ),
        React.createElement("button", {
          onClick: () => setMode("actions"),
          className: mode === "actions"
            ? "px-2 py-1 rounded text-[9px] font-mono transition-colors bg-amber-500/10 text-amber-300 border border-amber-500/40"
            : "px-2 py-1 rounded text-[9px] font-mono transition-colors text-slate-500 hover:text-slate-200",
        },
          React.createElement(ShieldAlert, { className: "h-3 w-3 mr-1 shrink-0" }),
          " Actions"
        )
      ),

      mode === "summary" ? React.createElement("div", { className: "space-y-3" },
        React.createElement("div", null,
          React.createElement("span", {
            className: "text-[9px] text-slate-500 font-mono uppercase block mb-1",
          }, "Source observations"),
          observations.length === 0 ? React.createElement("p", {
            className: "text-slate-500 text-[10px]",
          }, "No correlated observations for this entity.") : React.createElement("div", {
            className: "space-y-2",
          }, observations.map((o, i) => React.createElement("div", {
            key: i,
            className: "rounded border border-slate-800 bg-slate-900/50 p-2",
          },
            React.createElement("div", { className: "flex items-center justify-between mb-1" },
              React.createElement("span", {
                className: "text-[9px] font-mono text-slate-300",
              }, o.source),
              React.createElement("span", { className: chipClass(o.state) }, o.state.toUpperCase())
            ),
            React.createElement("p", {
              className: "text-slate-200 text-xs leading-relaxed",
            }, o.summary),
            o.sourceUrl ? React.createElement("a", {
              href: o.sourceUrl,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "mt-1 inline-block text-[9px] text-cyan-300 underline underline-offset-2 hover:text-cyan-200",
            },
              React.createElement("span", null, "Open source "),
              React.createElement(Link, { className: "ml-1 h-3 w-3" })
            ) : null,
            React.createElement("span", {
              className: "text-[9px] text-slate-600 mt-1 block font-mono",
            },
              o.confidence != null
                ? "confidence " + (o.confidence * 100).toFixed(0) + "% · "
                : "",
              "retrieved " + o.retrievedAt
            )
          )))
        ),
        React.createElement("div", {
          className: "rounded border border-slate-800 bg-slate-900/40 p-2",
        },
          React.createElement("span", {
            className: "text-[9px] text-slate-500 font-mono uppercase block mb-1",
          }, "Source freshness"),
          React.createElement("p", { className: "text-slate-400 text-[10px]" },
            "All observations retrieved via DISHA governed adapter bus with source URL, timestamp, and provenance hash. See Evidence Ledger for full chain."
          )
        )
      ) : React.createElement("div", { className: "space-y-3" },
        React.createElement("div", null,
          React.createElement("span", {
            className: "text-[9px] text-slate-500 font-mono uppercase block mb-1",
          }, "Permitted investigation actions"),
          React.createElement("p", {
            className: "text-slate-500 text-[10px] mb-2",
          }, "Active scans require owned or explicitly authorized targets through the DISHA policy gateway. Map clicks never launch uncontrolled scans."),
          React.createElement("div", { className: "space-y-1.5" },
            [
              { label: "WHOIS / RDAP lookup", hint: "Registration data" },
              { label: "DNS record interrogation", hint: "A, MX, TXT, NS" },
              { label: "IP geolocation & ASN", hint: "Carrier, prefix, country" },
              { label: "Certificate transparency", hint: "crt.sh subdomains" },
            ].map((a) => React.createElement("button", {
              key: a.label,
              onClick: () => {},
              disabled: true,
              className: "flex w-full items-center justify-between px-3 py-2 rounded border border-slate-800 bg-slate-900/40 text-left text-[10px] font-mono text-slate-400 hover:bg-slate-800/60 transition-colors cursor-not-allowed",
            },
              React.createElement("span", { className: "flex items-center gap-2" },
                React.createElement(Network, { className: "h-3 w-3 shrink-0 opacity-50" }),
                React.createElement("span", null, a.label)
              ),
              React.createElement("span", { className: "text-[8px] text-slate-600" }, a.hint)
            ))
          )
        ),
        React.createElement("div", {
          className: "rounded border border-slate-800 bg-slate-900/40 p-2",
        },
          React.createElement("span", {
            className: "text-[9px] text-slate-500 font-mono uppercase block mb-1",
          }, "Confidence indicators"),
          React.createElement("p", { className: "text-slate-400 text-[10px]" },
            "Model-generated conclusions are predictions or drafts. Only DISHA's human-review process designates a finding VERIFIED."
          )
        )
      )
    ),

    React.createElement("div", { className: "border-t border-slate-800 p-3" },
      React.createElement("button", {
        onClick: () => {},
        disabled: true,
        className: "w-full py-2 rounded border border-slate-700 bg-slate-900 text-slate-400 text-[10px] font-mono uppercase tracking-wider hover:bg-slate-800/40 transition-colors cursor-not-allowed",
      }, "Export evidence packet")
    )
  );
}
