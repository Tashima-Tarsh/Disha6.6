"use client";

import {
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  HelpCircle,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  UserCheck,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState, useMemo } from "react";
import type { Investigation } from "@/lib/investigation/types";
import { AVAILABLE_AI_MODELS, type AstraMessage } from "@/components/shell/AstraAnalystDrawer";
import styles from "./investigation-copilot.module.css";

interface InvestigationAiCopilotViewProps {
  active?: Investigation | null;
  onTriggerSearch?: (target: string) => void;
  onFocusCoordinates?: (lat: number, lng: number) => void;
}

export function InvestigationAiCopilotView({
  active = null,
  onTriggerSearch,
  onFocusCoordinates,
}: InvestigationAiCopilotViewProps) {
  const [selectedModel, setSelectedModel] = useState<string>("qwen2.5:7b");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThinking, setShowThinking] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate an initial conversational briefing based on active target or general standby
  const initialGreeting: AstraMessage = useMemo(() => {
    if (!active) {
      return {
        id: "standby-greet",
        role: "assistant",
        content: `### DISHA Assistant
Local Ollama is the default route. Use this panel for source-aware summaries, evidence questions, drafting help, and case notes.

The assistant must not invent breach matches, case facts, legal claims, or source status. Any unsupported point should be marked [VERIFY REQUIRED].`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: selectedModel,
      };
    }

    const evidenceCount = active.evidence.length;
    let briefing = `### Case Assistant: ${active.target}\n\n`;
    briefing += `**Target type**: ${active.targetType}\n`;
    briefing += `**Evidence records loaded**: ${evidenceCount}\n\n`;
    briefing += `Ask for a summary, source gaps, contradiction checks, or a draft note based only on the loaded case material.\n\n`;
    briefing += `No breach, identity, telecom, or location claim is confirmed unless it appears in the case evidence or a verified source response. Unsupported claims must be marked [VERIFY REQUIRED].`;

    return {
      id: `init-${active.target}`,
      role: "assistant",
      content: briefing,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      modelUsed: selectedModel,
    };
  }, [active, selectedModel]);

  const [messages, setMessages] = useState<AstraMessage[]>([initialGreeting]);

  // Keep messages in sync when active target changes
  useEffect(() => {
    const timer = window.setTimeout(() => setMessages([initialGreeting]), 0);
    return () => window.clearTimeout(timer);
  }, [initialGreeting]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSubmitting]);

  function handleClearChat() {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: "assistant",
        content: `**CONVERSATION RESET**\nSwitched to **${
          AVAILABLE_AI_MODELS.find((m) => m.id === selectedModel)?.name ?? selectedModel
        }**. Ready for source-backed questions.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: selectedModel,
      },
    ]);
  }

  async function copyToClipboard(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // no-op
    }
  }

  async function handleSend(textToSend?: string) {
    const query = (textToSend ?? input).trim();
    if (!query || isSubmitting) return;

    // Agentic Command Recognition: Check if user is asking to search or investigate a target
    const lowerQuery = query.toLowerCase();
    let detectedTarget: string | null = null;

    if (
      lowerQuery.startsWith("search ") ||
      lowerQuery.startsWith("find ") ||
      lowerQuery.startsWith("investigate ") ||
      lowerQuery.startsWith("check ") ||
      lowerQuery.startsWith("audit ") ||
      lowerQuery.startsWith("trace ") ||
      lowerQuery.startsWith("who is ") ||
      lowerQuery.startsWith("lookup ") ||
      lowerQuery.startsWith("look up ")
    ) {
      detectedTarget = query
        .replace(/^(search|find|investigate|check|audit|trace|who is|look up|lookup)\s+(for\s+)?(details\s+on\s+)?(profile\s+of\s+)?(number\s+)?/i, "")
        .replace(/\?+$/, "")
        .trim();
    } else if (
      /^\+?[0-9\s\-()]{7,16}$/.test(query.trim()) ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.trim()) ||
      /^[a-zA-Z0-9-]+\.(com|org|net|in|gov|io|edu|co)/.test(query.trim()) ||
      (/^[a-zA-Z\s.]{3,45}$/.test(query.trim()) && !/^(hi|hello|hey|help|who are you|how are you|test|status|clear)/i.test(query.trim()))
    ) {
      detectedTarget = query.trim();
    }

    if (detectedTarget) {
      if (onTriggerSearch && (!active || active.target.toLowerCase() !== detectedTarget.toLowerCase())) {
        onTriggerSearch(detectedTarget);
      }
      if (onFocusCoordinates) {
        if (detectedTarget.startsWith("+91") || /^[6-9]\d{9}$/.test(detectedTarget)) {
          onFocusCoordinates(19.0760, 72.8777); // India Telecom Gateway
        }
      }
    }

    const userMsg: AstraMessage = {
      id: `usr-${crypto.randomUUID()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSubmitting(true);

    try {
      const csrfCookie = typeof document !== "undefined"
        ? document.cookie.split("; ").find((r) => r.startsWith("disha_csrf="))?.split("=")[1]
        : undefined;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (csrfCookie) headers["x-csrf-token"] = decodeURIComponent(csrfCookie);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        credentials: "same-origin",
        body: JSON.stringify({
          message: query,
          model: selectedModel,
          conversationHistory: messages
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role, content: m.content })),
          context: {
            investigationTarget: detectedTarget || active?.target || query,
            targetType: active?.targetType ?? "universal",
            evidenceCount: active?.evidence.length ?? 0,
            instruction: "Respond as an evidence-governed DISHA case assistant. Use only supplied case context and verifiable source material. Mark unsupported claims [VERIFY REQUIRED]. Do not invent breach matches, telecom status, private data, legal conclusions, or operational status.",
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat core returned ${response.status}`);
      }

      const data = await response.json();
      const content =
        typeof data === "string"
          ? data
          : data.response ?? data.message ?? data.reply ?? JSON.stringify(data, null, 2);

      const assistantMsg: AstraMessage = {
        id: `ast-${crypto.randomUUID()}`,
        role: "assistant",
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: data.model ?? selectedModel,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const lowerQuery = query.toLowerCase().trim();
      let fallbackText = "";

      if (
        lowerQuery === "hi" ||
        lowerQuery === "hello" ||
        lowerQuery === "hey" ||
        lowerQuery.includes("hi disha") ||
        lowerQuery.includes("hello disha") ||
        lowerQuery.includes("how are you") ||
        lowerQuery.includes("who are you") ||
        lowerQuery.includes("what can you do")
      ) {
        fallbackText = `Hello. I can help summarize loaded evidence, identify source gaps, draft case notes, or prepare careful questions for the next search.

The selected model did not return a verified response just now. I will not fabricate a result. Please retry after checking System > AI Models, or ask for a task that can be answered from the visible case record.`;
      } else if (
        lowerQuery.includes("write code") ||
        lowerQuery.includes("python code") ||
        lowerQuery.includes("write a script") ||
        lowerQuery.includes("write a function") ||
        lowerQuery.includes("generate code")
      ) {
        fallbackText = `The selected model did not return a verified response, so I cannot safely generate code from the chat route right now.

Retry after the local model is healthy, or move the exact coding request into the workspace so it can be implemented and tested against real files.`;
      } else if (
        lowerQuery.includes("draft a letter") ||
        lowerQuery.includes("write a letter") ||
        lowerQuery.includes("complaint letter") ||
        lowerQuery.includes("fir")
      ) {
        fallbackText = `### Draft Note
Date: ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}

Subject: [VERIFY REQUIRED]

This draft needs verified case facts before it can be finalized.

Available verified material:
- Target: ${active?.target ?? "[VERIFY REQUIRED]"}
- Target type: ${active?.targetType ?? "[VERIFY REQUIRED]"}
- Loaded evidence records: ${active?.evidence.length ?? 0}

Required before filing:
- Exact complainant identity and authority
- Incident date and source records
- Jurisdiction and receiving authority
- Applicable legal provisions, verified from current law`;
      } else {
        fallbackText = `The selected model did not return a verified response.

No new source was queried and no evidence claim was generated. Check System > AI Models, then retry with a focused question or run a source-backed search first.`;
      }

      const fallbackMsg: AstraMessage = {
        id: `ast-fallback-${crypto.randomUUID()}`,
        role: "assistant",
        content: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: selectedModel,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSubmitting(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void handleSend();
  }

  const SUGGESTED_PROMPTS = active
    ? [
        `Executive Summary for ${active.target}`,
        `List source gaps`,
        `Find contradictions in loaded evidence`,
        `Draft a cautious case note`,
      ]
    : [
        `Summarize loaded evidence`,
        `Show source gaps`,
        `Draft a careful evidence note`,
        `Prepare search questions`,
      ];

  // Helper to keep local reasoning blocks visually separate when a model returns them.
  function renderMessageContent(content: string) {
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    if (!thinkMatch) {
      return <div className={styles.markdownBody}>{content}</div>;
    }

    const reasoning = thinkMatch[1].trim();
    const finalAnswer = content.replace(/<think>[\s\S]*?<\/think>/, "").trim();

    return (
      <div className={styles.reasoningWrapper}>
        <div className={styles.reasoningAccordion}>
          <button
            type="button"
            className={styles.reasoningToggle}
            onClick={() => setShowThinking(!showThinking)}
          >
            <Brain size={13} color="#6f5f3f" />
            <span>Model reasoning ({reasoning.split(" ").length} tokens)</span>
            {showThinking ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showThinking ? (
            <div className={styles.reasoningContent}>{reasoning}</div>
          ) : null}
        </div>
        <div className={styles.markdownBody}>{finalAnswer}</div>
      </div>
    );
  }

  return (
    <div className={styles.copilotContainer}>
      {/* Top Model Selector & Header Bar */}
      <div className={styles.topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.35)", padding: "4px 10px", borderRadius: 6 }}>
            <Brain size={14} color="#6f5f3f" />
            <span style={{ color: "#42351f", fontWeight: 800, fontSize: 12, letterSpacing: "0.08em" }}>DISHA Assistant</span>
          </div>

          <div className={styles.modelSelectCluster}>
            <label className={styles.modelSelectLabel}>
              <Brain size={14} color="#39c7d7" />
              <span>MODEL:</span>
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className={styles.modelSelect}
              aria-label="Select assistant model"
            >
              {AVAILABLE_AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.badge})
                </option>
              ))}
            </select>
            <span className={styles.providerBadge}>
              {AVAILABLE_AI_MODELS.find((m) => m.id === selectedModel)?.provider ?? "AI Local"}
            </span>
          </div>
        </div>

        <div className={styles.contextPill}>
          <span>CASE:</span>
          <span className={styles.targetName}>{active ? active.target : "READY / UNIVERSAL"}</span>
          {active ? (
            <span className={styles.recordCount}>({active.evidence.length} records)</span>
          ) : null}
        </div>

        <div className={styles.actionButtons}>
          <button
            type="button"
            onClick={handleClearChat}
            className={styles.resetBtn}
            title="Reset conversation"
          >
            <RotateCcw size={12} />
            <span>Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Quick Prompt Action Chips */}
      <div className={styles.promptSuggestions}>
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => void handleSend(prompt)}
            className={styles.promptChip}
            disabled={isSubmitting}
          >
            <HelpCircle size={11} color="#6f5f3f" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className={styles.chatFeed} ref={scrollRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.messageRow} ${
              msg.role === "user" ? styles.userRow : styles.assistantRow
            }`}
          >
            <div className={styles.messageMeta}>
              <span className={styles.authorTag}>
                {msg.role === "user" ? "OPERATOR" : msg.modelUsed?.toUpperCase() ?? "DISHA AI"}
              </span>
              <span>{msg.timestamp}</span>
              {msg.confidence ? (
                <span className={styles.confidenceTag}>
                  source-backed
                </span>
              ) : null}
              {msg.role === "assistant" ? (
                <button
                  type="button"
                  onClick={() => void copyToClipboard(msg.id, msg.content)}
                  className={styles.copyBtn}
                  title="Copy analysis"
                >
                  {copiedId === msg.id ? <Check size={12} color="#39c7d7" /> : <Copy size={12} />}
                </button>
              ) : null}
            </div>

            <div
              className={`${styles.messageBubble} ${
                msg.role === "user" ? styles.userBubble : ""
              }`}
            >
              {renderMessageContent(msg.content)}
            </div>
          </div>
        ))}

        {isSubmitting ? (
          <div className={`${styles.messageRow} ${styles.assistantRow}`}>
            <div className={styles.typingIndicator}>
              <Loader2 size={14} className={styles.spin} />
              <span>Checking the request with {selectedModel}...</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom Chat Input Form */}
      <form className={styles.inputArea} onSubmit={onSubmit}>
        <div className={styles.inputContainer}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              active
                ? `Ask about ${active.target} evidence, gaps, or case notes...`
                : "Ask a source-backed question or request a careful evidence note..."
            }
            disabled={isSubmitting}
            className={styles.inputField}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSubmitting}
            className={styles.sendBtn}
          >
            <span>Ask Assistant</span>
            <Send size={12} />
          </button>
        </div>
      </form>
    </div>
  );
}
