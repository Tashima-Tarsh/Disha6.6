"use client";

import { authFetchHeaders } from "@/lib/utils";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, ArrowUpRight, ChevronRight, FolderLock, LayoutGrid, LockKeyhole, LogOut, Maximize2, MessageSquare, Minimize2, Minus, PanelTop, Search, X } from "lucide-react";
import { useState, useEffect, useRef, type ReactNode, type FormEvent } from "react";
import { AstraAnalystDrawer } from "./AstraAnalystDrawer";
import { DishaStartMenu } from "./DishaStartMenu";
import { DishaToolLookupModal, type ToolDef } from "./DishaToolLookupModal";
import { DESKTOP_APPS } from "./desktop-apps";
import { DishaDesktopDepth } from "./DishaDesktopDepth";
import styles from "./disha-command-shell.module.css";

export interface DishaCommandShellProps {
  children: ReactNode;
  principal?: { email: string; roles?: string[] };
  activeTarget?: string;
  evidenceCount?: number;
}

export function DishaCommandShell({ children, principal, activeTarget, evidenceCount }: DishaCommandShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [startOpen, setStartOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [query, setQuery] = useState("");
  const [clock, setClock] = useState<Date | null>(null);
  const [health, setHealth] = useState("Checking runtime…");
  const [healthOpen, setHealthOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [tool, setTool] = useState<ToolDef | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const activeApp = DESKTOP_APPS.find(app => pathname === app.href) ?? DESKTOP_APPS[0];

  useEffect(() => { setMinimized(false); setStartOpen(false); }, [pathname]);

  useEffect(() => {
    const update = () => setClock(new Date());
    update();
    const timer = window.setInterval(update, 30_000);
    const controller = new AbortController();
    let pending = false;
    const check = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch("/api/v1/health", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Health unavailable");
        const payload = await response.json();
        if (!controller.signal.aborted) setHealth(payload.status === "ok" ? "Runtime available" : "Runtime degraded");
      } catch {
        if (!controller.signal.aborted) setHealth("Health unavailable");
      } finally { pending = false; }
    };
    void check();
    const poll = window.setInterval(() => void check(), 30_000);
    return () => { window.clearInterval(timer); window.clearInterval(poll); controller.abort(); };
  }, []);

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.code === "Space") {
        event.preventDefault(); setStartOpen(open => !open);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); search.current?.focus();
      }
      if (event.key === "Escape") setHealthOpen(false);
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setMinimized(false);
    router.push(`/investigate?q=${encodeURIComponent(query.trim())}`);
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true); setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin", headers: authFetchHeaders() });
      if (!response.ok) throw new Error("Sign-out failed. Please try again.");
      window.location.assign("/login");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Sign-out failed.");
      setSigningOut(false);
    }
  }

  return (
    <div className={styles.desktop}>
      <DishaDesktopDepth />
      <a href="#disha-app" onClick={() => setMinimized(false)} className={styles.skip}>Skip to workspace</a>
      <header className={styles.desktopHeader}>
        <div className={styles.wordmark}>disha<span>6.6</span></div>
        <span className={styles.workspaceLabel}>RESEARCH WORKSPACE</span>
        <div className={styles.headerRight}><LockKeyhole size={13} /><span>{principal?.email ?? "Signed-in workspace"}</span></div>
      </header>
      <nav className={styles.shortcuts} aria-label="Desktop apps">
        {DESKTOP_APPS.slice(0, 4).map(app => <Link key={app.href} href={app.href} onClick={() => setMinimized(false)} className={styles.shortcut}>
          <span className={styles.appIcon} data-color={app.color}><app.icon size={25} strokeWidth={1.5} /></span><span>{app.label}</span>
        </Link>)}
        <button className={styles.shortcut} onClick={() => setAiOpen(true)}><span className={styles.appIcon} data-color="ink"><MessageSquare size={25} strokeWidth={1.5} /></span><span>DISHA AI</span></button>
      </nav>
      <div className={styles.desktopNote} aria-hidden="true"><span>Clarity begins<br />with evidence.</span><small>DISHA / 6.6</small></div>
      <section hidden={minimized} className={`${styles.appWindow} ${maximized ? styles.maximized : ""}`} aria-label={activeApp.label}>
        <header className={styles.windowBar}>
          <div className={styles.windowTitle}><activeApp.icon size={15} /><span>{activeApp.label}</span><span className={styles.windowSubtitle}>— DISHA 6.6</span></div>
          <div className={styles.windowControls}>
            <button onClick={() => setMinimized(true)} aria-label="Minimize workspace" title="Minimize"><Minus size={15} /></button>
            <button onClick={() => setMaximized(value => !value)} aria-label={maximized ? "Restore window size" : "Maximize workspace"} title={maximized ? "Restore" : "Maximize"}>{maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
            <button onClick={() => setMinimized(true)} aria-label="Return to desktop, keep workspace open" title="Return to desktop"><X size={16} /></button>
          </div>
        </header>
        <div className={styles.addressBar}><PanelTop size={14} /><ChevronRight size={12} /><span>DISHA</span><ChevronRight size={12} /><strong>{activeApp.label}</strong><button onClick={() => setAiOpen(true)}><MessageSquare size={14} />Ask DISHA AI</button></div>
        <main id="disha-app" tabIndex={-1} className={styles.mainCanvas}>{children}</main>
      </section>
      {minimized && <section className={styles.desktopWelcome}><p>YOUR DESKTOP</p><h1>Room to think.</h1><span>Your workspace is still open. Pick up where you left off.</span><button onClick={() => setMinimized(false)}><activeApp.icon size={17} />Resume {activeApp.label}<ArrowUpRight size={16} /></button></section>}
      {logoutError && <div role="alert" className={styles.notice}>{logoutError}<button onClick={() => setLogoutError("")} aria-label="Dismiss sign-out error"><X size={14} /></button></div>}
      {healthOpen && <section className={styles.healthPanel} aria-label="Session and runtime"><h2>Workspace status</h2><p role="status"><Activity size={15} />{health}</p><p>Service health does not confirm individual tools or models are available.</p><Link href="/investigate/osint-runtime">Check tool execution evidence <ArrowUpRight size={14} /></Link><Link href="/system/models">Check AI models <ArrowUpRight size={14} /></Link><p>Ctrl + Space: Start · Ctrl + K: Search</p><button onClick={() => setHealthOpen(false)}>Close</button></section>}
      <footer className={styles.taskbar} aria-label="DISHA taskbar">
        <button className={styles.sessionButton} onClick={() => setHealthOpen(value => !value)} aria-expanded={healthOpen} aria-label="Workspace status"><Activity size={18} /><span>Workspace<small>{health}</small></span></button>
        <nav className={styles.taskbarApps} aria-label="Taskbar apps">
          <button ref={startButton} className={`${styles.taskButton} ${startOpen ? styles.selected : ""}`} onClick={() => setStartOpen(value => !value)} aria-label="Start" aria-expanded={startOpen} aria-haspopup="dialog" title="Start (Ctrl + Space)"><LayoutGrid size={23} strokeWidth={1.8} /></button>
          <form className={styles.taskSearch} onSubmit={submit}><Search size={16} /><input ref={search} aria-label="Search public sources" placeholder="Search DISHA" value={query} onChange={event => setQuery(event.target.value)} /><button type="submit" aria-label="Submit search"><ChevronRight size={15} /></button></form>
          <button className={`${styles.taskButton} ${!minimized ? styles.running : ""}`} onClick={() => setMinimized(value => !value)} aria-label={minimized ? "Restore workspace" : "Show desktop"} title={activeApp.label}><activeApp.icon size={22} /></button>
          <Link href="/vault" className={styles.taskButton} aria-label="Open evidence vault" title="Evidence vault"><FolderLock size={22} /></Link>
          <button className={`${styles.aiButton} ${aiOpen ? styles.selected : ""}`} onClick={() => setAiOpen(value => !value)} aria-label="Open DISHA AI" aria-haspopup="dialog"><MessageSquare size={20} /><span>DISHA AI</span></button>
        </nav>
        <div className={styles.tray}><button onClick={() => void signOut()} aria-label="Sign out" title="Sign out" disabled={signingOut}><LogOut size={17} /></button><time dateTime={clock?.toISOString()}>{clock ? <>{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}<small>{clock.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}</small></> : "—"}</time><button className={styles.showDesktop} onClick={() => setMinimized(true)} aria-label="Show desktop" title="Show desktop" /></div>
      </footer>
      <DishaStartMenu isOpen={startOpen} onClose={() => { setStartOpen(false); startButton.current?.focus(); }} onSelectTool={setTool} onOpenAi={() => { setStartOpen(false); setAiOpen(true); }} principal={principal} onSignOut={() => void signOut()} onLaunchApp={() => setMinimized(false)} />
      <AstraAnalystDrawer isOpen={aiOpen} onClose={() => setAiOpen(false)} activeContext={{ investigationTarget: activeTarget, evidenceCount }} />
      <DishaToolLookupModal
        tool={tool}
        onClose={() => setTool(null)}
        onSendToCopilot={(prompt) => {
          setAiOpen(true);
          router.push(`/investigate?q=${encodeURIComponent(prompt)}`);
        }}
      />
    </div>
  );
}
export default DishaCommandShell;
