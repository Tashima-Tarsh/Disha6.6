"use client";

import { authFetchHeaders } from "@/lib/utils";

import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Copy,
  FileText,
  HelpCircle,
  Layers,
  Loader2,
  Send,
  Shield,
  Sparkles,
  Trash2,
  RotateCcw,
  Check,
  X,
} from "lucide-react";
import { useState, useRef, useEffect, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import styles from "./astra-analyst.module.css";

export const AVAILABLE_AI_MODELS = [
  {
    id: "qwen2.5:7b",
    name: "Qwen 2.5 7B",
    badge: "Fast local chat",
    provider: "Ollama Local",
  },
  {
    id: "deepseek-r1:8b",
    name: "DeepSeek R1 8B",
    badge: "Reasoning",
    provider: "Ollama Local",
  },
  {
    id: "qwen2.5-coder:7b",
    name: "Qwen 2.5 Coder 7B",
    badge: "Code and tools",
    provider: "Ollama Local",
  },
  {
    id: "gemma2:9b",
    name: "Google Gemma 2 9B",
    badge: "Research draft",
    provider: "Ollama Local",
  },
  {
    id: "gpt-4o",
    name: "OpenAI GPT-4o",
    badge: "Cloud opt-in",
    provider: "OpenAI Cloud",
  },
];

export interface AstraMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  confidence?: number;
  modelUsed?: string;
  citations?: Array<{ source: string; claim: string; verified: boolean }>;
}

export interface AstraAnalystDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeContext?: {
    investigationTarget?: string;
    targetType?: string;
    evidenceCount?: number;
    claimCount?: number;
  };
}

const INTELLIGENCE_PROMPT_TEMPLATES = [
  {
    id: "summarize",
    label: "Summarize Findings",
    icon: FileText,
    prompt: "Summarize the current findings using only source-backed records. Mark any unsupported claim as [VERIFY REQUIRED].",
  },
  {
    id: "corroborate",
    label: "Corroborate Claims",
    icon: Shield,
    prompt: "Cross-corroborate all identified claims against authoritative sources and flag any unverified assertions.",
  },
  {
    id: "threat_assessment",
    label: "Risk Note",
    icon: AlertCircle,
    prompt: "Draft a concise risk note from the available evidence. Do not infer incidents, actors, or vulnerabilities that are not in the records.",
  },
  {
    id: "gaps",
    label: "Identify Gaps",
    icon: HelpCircle,
    prompt: "Analyze the current investigation graph and identify critical intelligence gaps and recommended collection requirements.",
  },
  {
    id: "dossier",
    label: "Draft Case Dossier",
    icon: Layers,
    prompt: "Draft a case dossier from available evidence, preserving source links, timestamps, and SHA-256 custody details where present.",
  },
];

export function AstraAnalystDrawer({ isOpen, onClose, activeContext }: AstraAnalystDrawerProps) {
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [models, setModels] = useState([{ id: "auto", name: "Automatic local route", badge: "Server configuration", provider: "Configured runtime" }]);
  const [modelStatus, setModelStatus] = useState("Model list not checked");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AstraMessage[]>([
    {
      id: "init",
      role: "assistant",
      content:
        "Welcome to DISHA AI. Ask a question, draft a research note, or examine a claim. Model availability is checked when you send a request. Unsupported facts must be marked [VERIFY REQUIRED].",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),

    },
  ]);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSubmitting]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    // The catalog fetch reports readiness asynchronously when the response arrives.
    void fetch("/api/v1/runtime/models/catalog", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Model list unavailable");
        const payload: { catalog?: unknown } = await response.json();
        if (!Array.isArray(payload.catalog)) throw new Error("Model list unavailable");
        const installed = payload.catalog.filter((item): item is { tag: string; name: string; isLocal: true; status: string } =>
          item !== null && typeof item === "object" && item.isLocal === true && item.status === "healthy" && typeof item.tag === "string" && typeof item.name === "string");
        if (controller.signal.aborted) return;
        setModels([{ id: "auto", name: "Automatic local route", badge: "Server configuration", provider: "Configured runtime" }, ...installed.map(item => ({ id: item.tag, name: item.name, badge: "Installed · response untested", provider: "Local runtime" }))]);
        setModelStatus(`${installed.length} installed local models reported. A chat response still needs testing.`);
      })
      .catch(() => { if (!controller.signal.aborted) setModelStatus("Model list unavailable. Automatic route uses server configuration."); });
    return () => controller.abort();
  }, [isOpen]);

  function handleClearChat() {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: "assistant",
        content: `Conversation reset. Active model: ${models.find((m) => m.id === selectedModel)?.name ?? selectedModel}.`,
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: authFetchHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({
          message: query,
          model: selectedModel,
          conversationHistory: messages
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role, content: m.content })),
          context: activeContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`DISHA AI returned status ${response.status}`);
      }

      const data = await response.json();
      const content = readAssistantReply(data);

      const assistantMsg: AstraMessage = {
        id: `ast-${crypto.randomUUID()}`,
        role: "assistant",
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        confidence: data && typeof data.confidence === "number" ? data.confidence : undefined,
        modelUsed: data && typeof data.model === "string" ? data.model : selectedModel,
        citations: undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      const fallbackMsg: AstraMessage = {
        id: `ast-fallback-${crypto.randomUUID()}`,
        role: "assistant",
        content: `The selected model did not return a verified response.\n\nModel: ${selectedModel}\nStatus: ${error instanceof Error ? error.message : "request failed"}\n\nTry the fast local model, or open System > AI Models to test which models are actually available.`,
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



  return (
    <Dialog.Root open={isOpen} onOpenChange={open => { if (!open) onClose(); }}><Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={styles.drawer} aria-label="DISHA AI"><Dialog.Description className={styles.srOnly}>Research assistant. Model availability depends on your configured services.</Dialog.Description>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.iconPulse}>
            <Brain size={16} className={styles.icon} />
          </div>
          <div>
            <Dialog.Title className={styles.title}>DISHA AI</Dialog.Title>
            <span className={styles.status}>A little space to think things through</span>
          </div>
        </div>
        <button onClick={onClose} className={styles.closeBtn} aria-label="Close DISHA AI">
          <X size={16} />
        </button>
      </header>

      <p className={styles.modelStatus} role="status">{modelStatus}</p>
      <div className={styles.modelBar}>
        <div className={styles.modelSelectGroup}>
          <Brain size={13} className={styles.icon} />
          <select
            disabled={isSubmitting}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className={styles.modelSelect}
            aria-label="Select AI model"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.badge})
              </option>
            ))}
          </select>
          <span className={styles.modelBadge}>
            {models.find((m) => m.id === selectedModel)?.provider ?? "AI"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleClearChat}
          className={styles.clearBtn}
          disabled={isSubmitting}
          title="Reset conversation"
        >
          <RotateCcw size={11} />
          <span>Reset</span>
        </button>
      </div>

      {activeContext?.investigationTarget ? (
        <div className={styles.contextBar}>
          <span className={styles.contextLabel}>Context</span>
          <span className={styles.contextValue}>{activeContext.investigationTarget}</span>
          <span className={styles.contextCount}>({activeContext.evidenceCount ?? 0} records)</span>
        </div>
      ) : null}

      <div className={styles.templatesSection}>
        <span className={styles.templatesHeader}>
          <Sparkles size={12} />
          <span>Prompts</span>
        </span>
        <div className={styles.templateGrid}>
          {INTELLIGENCE_PROMPT_TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon;
            return (
              <button
                key={tmpl.id}
                onClick={() => void handleSend(tmpl.prompt)}
                className={styles.templateBtn}
                disabled={isSubmitting}
              >
                <Icon size={12} />
                <span>{tmpl.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.messageStream} ref={scrollRef} role="log" aria-live="polite" aria-label="DISHA AI conversation">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.messageWrapper} ${msg.role === "user" ? styles.userWrapper : styles.assistantWrapper}`}
          >
            <div className={styles.messageMeta}>
              <span className={styles.messageAuthor}>
                {msg.role === "user" ? "You" : msg.modelUsed ?? "Assistant"}
              </span>
              <span className={styles.messageTime}>{msg.timestamp}</span>
              {msg.confidence ? (
                <span className={styles.confidenceBadge}>
                  {(msg.confidence * 100).toFixed(0)}%
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

            <div className={styles.messageBubble}>
              <div className={styles.messageText}>{msg.content}</div>

              {msg.citations && msg.citations.length > 0 ? (
                <div className={styles.citationsBlock}>
                  <div className={styles.citationsTitle}>Sources</div>
                  {msg.citations.map((c, idx) => (
                    <div key={idx} className={styles.citationItem}>
                      <CheckCircle2 size={11} className={styles.citationCheck} />
                      <span className={styles.citationSource}>[{c.source}]</span>
                      <span className={styles.citationClaim}>{c.claim}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {isSubmitting ? (
          <div className={`${styles.messageWrapper} ${styles.assistantWrapper}`}>
            <div className={styles.messageBubble}>
              <div className={styles.typingIndicator}>
                <Loader2 size={14} className={styles.spin} />
                <span>Working with the selected model...</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <form className={styles.inputForm} onSubmit={onSubmit}>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for a summary, risk note, dossier, or next research step"
            disabled={isSubmitting}
            aria-label="Message DISHA AI"
            className={styles.inputField}
          />
          <button type="submit" disabled={!input.trim() || isSubmitting} className={styles.sendBtn} aria-label="Send message">
            <Send size={14} />
          </button>
        </div>
      </form>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  );
}


/** Only textual backend replies can enter the conversation stream. */
export function readAssistantReply(payload: unknown): string {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (payload !== null && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["response", "message", "reply"]) {
      if (typeof record[key] === "string" && record[key].trim()) return record[key];
    }
  }
  throw new Error("The service returned no readable reply. No answer has been generated.");
}
