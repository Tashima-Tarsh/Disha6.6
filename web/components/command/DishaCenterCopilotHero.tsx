"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  Terminal,
  Cpu,
  Brain,
  Code2,
  Eye,
  Check,
  Copy,
  ArrowRight,
  ShieldCheck,
  Plane,
  Camera,
  Car,
  Globe,
  Radio,
  PlusCircle,
  Database,
} from "lucide-react";
import type { ToolDef } from "../shell/DishaToolLookupModal";
import styles from "./disha-center-copilot.module.css";

interface CopilotMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  modelUsed?: string;
  backendUsed?: string;
  timestamp: string;
}

interface DishaCenterCopilotHeroProps {
  onOpenTool?: (toolId: string) => void;
  onSelectSpecificTool?: (tool: ToolDef) => void;
}

export function DishaCenterCopilotHero({
  onOpenTool,
  onSelectSpecificTool,
}: DishaCenterCopilotHeroProps) {
  const [selectedModel, setSelectedModel] = useState<string>("qwen2.5-coder:1.5b");
  const [inputPrompt, setInputPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Default messages is EMPTY - No unwanted hardcoded welcome banner
  const [messages, setMessages] = useState<CopilotMessage[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSubmitting]);

  async function handleSend(promptText?: string) {
    const text = (promptText ?? inputPrompt).trim();
    if (!text || isSubmitting) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsSubmitting(true);

    try {
      const match = typeof document !== "undefined" ? document.cookie.match(/(?:^|;\s*)disha_csrf=([^;]*)/) : null;
      const csrf = match ? decodeURIComponent(match[1]) : "default-csrf-token";

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrf,
        },
        body: JSON.stringify({
          message: text,
          model: selectedModel === "auto" ? undefined : selectedModel,
          messages: messages.slice(-4).map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.content,
          })),
        }),
        credentials: "same-origin",
      });

      const rawText = await res.text();
      let data: any = {};
      if (rawText && rawText.trim().length > 0) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = { message: rawText };
        }
      }

      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Gateway returned HTTP ${res.status}`);
      }

      const assistantText = data.message || data.response || "No response received.";
      const modelHeader = res.headers.get("x-disha-model") || data.model || selectedModel;
      const backendHeader = res.headers.get("x-disha-backend") || data.provider || "ollama.local";

      const assistantMsg: CopilotMessage = {
        id: `asst-${Date.now()}`,
        sender: "assistant",
        content: assistantText,
        modelUsed: modelHeader,
        backendUsed: backendHeader,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: CopilotMessage = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        content: `**Execution Error**: ${err instanceof Error ? err.message : "Failed to contact model gateway."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleNewChat() {
    setMessages([]);
    setInputPrompt("");
    inputRef.current?.focus();
  }

  function renderInlineBold(text: string) {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const elements = [];
    let lastIdx = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        elements.push(text.slice(lastIdx, match.index));
      }
      elements.push(<strong key={match.index} className={styles.boldText}>{match[1]}</strong>);
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) {
      elements.push(text.slice(lastIdx));
    }
    return elements.length > 0 ? elements : text;
  }

  function renderMarkdown(content: string) {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: "code", lang: match[1] || "text", value: match[2] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      parts.push({ type: "text", value: content.slice(lastIndex) });
    }

    return (
      <div className={styles.markdownBody}>
        {parts.map((part, idx) => {
          if (part.type === "code") {
            return (
              <div key={idx} className={styles.codeBlockWrapper}>
                <div className={styles.codeHeader}>
                  <span className={styles.codeLang}>{part.lang}</span>
                  <button
                    type="button"
                    className={styles.codeCopyBtn}
                    onClick={() => navigator.clipboard.writeText(part.value)}
                  >
                    <Copy size={11} />
                    <span>Copy</span>
                  </button>
                </div>
                <pre className={styles.codePre}>
                  <code>{part.value}</code>
                </pre>
              </div>
            );
          }

          const lines = part.value.split("\n");
          return (
            <div key={idx} className={styles.textBlock}>
              {lines.map((line, lineIdx) => {
                if (line.startsWith("### ")) {
                  return <h3 key={lineIdx} className={styles.mdH3}>{line.slice(4)}</h3>;
                }
                if (line.startsWith("## ")) {
                  return <h2 key={lineIdx} className={styles.mdH2}>{line.slice(3)}</h2>;
                }
                if (line.startsWith("# ")) {
                  return <h1 key={lineIdx} className={styles.mdH1}>{line.slice(2)}</h1>;
                }
                if (line.startsWith("- ") || line.startsWith("* ")) {
                  return (
                    <div key={lineIdx} className={styles.mdBullet}>
                      <span className={styles.bulletDot}>•</span>
                      <span>{renderInlineBold(line.slice(2))}</span>
                    </div>
                  );
                }
                if (!line.trim()) {
                  return <div key={lineIdx} className={styles.mdSpacer} />;
                }
                return <p key={lineIdx} className={styles.mdP}>{renderInlineBold(line)}</p>;
              })}
            </div>
          );
        })}
      </div>
    );
  }

  const modelPills = (
    <div className={styles.modelSwitcher}>
      <button
        type="button"
        className={`${styles.modelPill} ${selectedModel === "auto" ? styles.modelPillActive : ""}`}
        onClick={() => setSelectedModel("auto")}
      >
        <Sparkles size={12} />
        <span>⚡ Auto-Route</span>
      </button>

      <button
        type="button"
        className={`${styles.modelPill} ${selectedModel === "qwen2.5-coder:1.5b" ? styles.modelPillActive : ""}`}
        onClick={() => setSelectedModel("qwen2.5-coder:1.5b")}
      >
        <Code2 size={12} />
        <span>💻 Qwen 2.5-Coder (Code & Self-Repair)</span>
      </button>

      <button
        type="button"
        className={`${styles.modelPill} ${selectedModel === "qwen2.5:3b" ? styles.modelPillActive : ""}`}
        onClick={() => setSelectedModel("qwen2.5:3b")}
      >
        <Brain size={12} />
        <span>🧠 Qwen 2.5 (3B OSINT & Reasoning)</span>
      </button>

      <button
        type="button"
        className={`${styles.modelPill} ${selectedModel === "vision" ? styles.modelPillActive : ""}`}
        onClick={() => setSelectedModel("vision")}
      >
        <Eye size={12} />
        <span>👁️ Vision & Multimodal</span>
      </button>
    </div>
  );

  const suggestionChips = (
    <div className={styles.promptChipsRow}>
      <span className={styles.chipsLabel}>Mission Launchers:</span>
      <button
        type="button"
        className={`${styles.promptChip} ${styles.chipAviation}`}
        onClick={() => handleSend("Track flight radar OpenSky flights near coordinates and show verified vectors")}
      >
        <Plane size={12} />
        <span>✈️ OpenSky Radar</span>
      </button>

      <button
        type="button"
        className={`${styles.promptChip} ${styles.chipOptics}`}
        onClick={() => handleSend("Scan open surveillance cameras in Delhi using Project Eyes On")}
      >
        <Camera size={12} />
        <span>📷 Eyes On CCTV</span>
      </button>

      <button
        type="button"
        className={`${styles.promptChip} ${styles.chipVehicle}`}
        onClick={() => handleSend("Audit leak database for Sony and Yahoo data breaches")}
      >
        <Database size={12} />
        <span>🛡️ Sovereign Breach Audit</span>
      </button>

      <button
        type="button"
        className={`${styles.promptChip} ${styles.chipCode}`}
        onClick={() => handleSend("Write and repair an optimized Python function to reverse strings, validate palindromes and handle type checks")}
      >
        <Code2 size={12} />
        <span>💻 Code Repair (Qwen Coder)</span>
      </button>

      <button
        type="button"
        className={`${styles.promptChip} ${styles.chipNetwork}`}
        onClick={() => handleSend("Audit attack surface and open ports for domain isro.gov.in using DNS and Shodan")}
      >
        <Globe size={12} />
        <span>🌐 Attack Surface</span>
      </button>

      <button
        type="button"
        className={`${styles.promptChip} ${styles.chipConflict}`}
        onClick={() => handleSend("Retrieve latest geopolitical conflict and battlefield updates from Liveuamap and ACLED")}
      >
        <Radio size={12} />
        <span>⚔️ War Frontlines</span>
      </button>
    </div>
  );

  return (
    <div className={styles.copilotHeroContainer}>
      {/* If conversation has started, show compact top header like ChatGPT */}
      {messages.length > 0 ? (
        <div className={styles.compactTopBar}>
          <div className={styles.compactBrand}>
            <span>DISHA COPILOT</span>
            <span className={styles.compactVersion}>6.6</span>
          </div>

          {modelPills}

          <button
            type="button"
            className={styles.newChatBtn}
            onClick={handleNewChat}
            title="Start new conversation"
          >
            <PlusCircle size={14} />
            <span>New Chat</span>
          </button>
        </div>
      ) : null}

      {/* If no messages yet, show ChatGPT-style landing state */}
      {messages.length === 0 ? (
        <div className={styles.emptyStateHero}>
          <div className={styles.heroBadgeRow}>
            <span className={styles.pulseDot} />
            <span className={styles.heroStatusText}>COPILOT DEFENCE AI ONLINE · ZERO-HALLUCINATION</span>
          </div>

          <h1 className={styles.heroTitle}>
            DISHA <span className={styles.versionGradient}>6.6</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Autonomous Cyber Defense Intelligence · Code Self-Repair · Omniscient OSINT
          </p>

          {modelPills}
        </div>
      ) : (
        /* Central Conversation Stream - scrolls upwards like ChatGPT as chat continues */
        <div className={styles.chatStreamArea}>
          {messages.map((m) => (
            <div
              key={m.id}
              className={`${styles.chatRow} ${m.sender === "user" ? styles.chatRowUser : styles.chatRowAssistant}`}
            >
              <div className={styles.chatBubble}>
                <div className={styles.bubbleHeader}>
                  <span className={styles.senderLabel}>
                    {m.sender === "user" ? "OPERATOR" : "DISHA COPILOT"}
                  </span>
                  {m.modelUsed && (
                    <span className={styles.modelTag}>{m.modelUsed}</span>
                  )}
                  <span className={styles.timeTag}>{m.timestamp}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(m.id, m.content)}
                    className={styles.copyChatBtn}
                    title="Copy message"
                  >
                    {copiedId === m.id ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                  </button>
                </div>

                <div className={styles.bubbleContent}>
                  {m.sender === "user" ? (
                    <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.content}</p>
                  ) : (
                    renderMarkdown(m.content)
                  )}
                </div>
              </div>
            </div>
          ))}

          {isSubmitting && (
            <div className={`${styles.chatRow} ${styles.chatRowAssistant}`}>
              <div className={styles.chatBubble}>
                <div className={styles.thinkingState}>
                  <Loader2 size={16} className={styles.spinner} />
                  <span>DISHA Copilot is orchestrating OSINT lookups and generating response...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Suggestion Chips */}
      {suggestionChips}

      {/* Bottom Pinned Input Bar */}
      <div className={styles.inputContainer}>
        <div className={styles.inputWrapper}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className={styles.inputForm}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask DISHA Copilot to write/repair code, audit leaks, track flights, scan cameras..."
              className={styles.mainInput}
              disabled={isSubmitting}
              autoFocus
            />
            <button
              type="submit"
              disabled={isSubmitting || !inputPrompt.trim()}
              className={styles.sendButton}
              title="Send prompt"
            >
              {isSubmitting ? (
                <Loader2 size={16} className={styles.spinner} />
              ) : (
                <Send size={15} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
export default DishaCenterCopilotHero;
