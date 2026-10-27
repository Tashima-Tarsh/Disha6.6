"use client";

import { useState, useEffect, useRef, FormEvent, useCallback } from "react";
import Globe from "./globe";

const INK = "#F7F4EF";
const SURFACE = "#181511";
const RULE = "#2E2921";
const MUTED = "#A8A29A";
const FAINT = "#6E6862";
const ACCENT = "#F97316";
const OK = "#34D399";

type State =
  | "idle"
  | "focus"
  | "typing"
  | "validating"
  | "success"
  | "failure"
  | "locked-out"
  | "mfa-required"
  | "passkey-prompt"
  | "expired-session"
  | "offline";

type Mode = "password" | "passkey";

export function LoginClient({
  returnUrl = "/investigate",
  authError,
}: {
  returnUrl?: string;
  authError?: string;
}) {
  const [state, setState] = useState<State>("idle");
  const [mode, setMode] = useMode<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [entropy, setEntropy] = useState(0);
  const [entropyFeedback, setEntropyFeedback] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(
    authError === "session-expired"
      ? "Session has expired. Re-authenticate to resume intelligence operations."
      : authError
        ? "Authentication error encountered."
        : null
  );
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  // Derive initial state from URL / authError
  useEffect(() => {
    if (!isOnline) setState("offline");
  }, [isOnline]);

  const entropyTimer = useRef<number | null>(null);

  const estimateEntropy = (val: string) => {
    const len = val.length;
    let classes = 0;
    if (/[a-z]/.test(val)) classes++;
    if (/[A-Z]/.test(val)) classes++;
    if (/[0-9]/.test(val)) classes++;
    if (/[^a-zA-Z0-9]/.test(val)) classes++;
    let space = classes === 4 ? 94 : classes === 3 ? 62 : classes === 2 ? 36 : 26;
    let score = Math.log2(Math.max(1, space)) * len;
    let reps = 0;
    for (let i = 0; i < val.length - 1; i++) if (val[i] === val[i + 1]) reps++;
    let seqs = 0;
    const low = val.toLowerCase();
    for (let i = 0; i < low.length - 2; i++) {
      const a = low.charCodeAt(i), b = low.charCodeAt(i + 1), c = low.charCodeAt(i + 2);
      if (b === a + 1 && c === b + 1) seqs++;
      if (b === a - 1 && c === b - 1) seqs++;
    }
    score -= reps * 2 + seqs * 3;
    let normalized = 0;
    if (score >= 40) normalized = 4;
    else if (score >= 28) normalized = 3;
    else if (score >= 16) normalized = 2;
    else if (score >= 8) normalized = 1;
    return { score: normalized, feedback: [] };
  };

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value.trim().toLowerCase());
    setState("typing");
    setError(null);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    setState("typing");
    setError(null);
    if (entropyTimer.current) clearTimeout(entropyTimer.current);
    entropyTimer.current = window.setTimeout(() => {
      const { score, feedback } = estimateEntropy(val);
      setEntropy(score);
      setEntropyFeedback(feedback);
    }, 120);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!email || !password) {
      setError("Credentials invalid.");
      setState("failure");
      return;
    }
    setSubmitting(true);
    setState("validating");
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          rememberMe: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState("failure");
        setError("Credentials invalid.");
        setSubmitting(false);
        return;
      }

      setState("success");
      setSubmitting(false);
      // Small success beat before redirect
      await new Promise((r) => setTimeout(r, 600));
      if (typeof window !== "undefined") {
        const safeTarget = returnUrl.startsWith("http")
          ? returnUrl
          : `${window.location.origin}${returnUrl.startsWith("/") ? returnUrl : `/${returnUrl}`}`;
        window.location.assign(safeTarget);
      }
    } catch {
      setState("failure");
      setError("Credentials invalid.");
      setSubmitting(false);
    }
  };

  const handlePasskey = () => {
    setState("passkey-prompt");
    setError(null);
  };

  const handleMfa = () => {
    setState("mfa-required");
    setError(null);
  };

  const handleMeriPehchaan = () => {
    const params = new URLSearchParams({ provider: "meri-pehchan", returnUrl });
    if (typeof window !== "undefined") window.location.assign(`/api/auth/oidc/start?${params.toString()}`);
  };

  const handleFocus = () => setState("focus");
  const handleBlur = () => setState("idle");

  const disabled = submitting || state === "validating" || state === "locked-out";
  const canSubmit = email.length > 0 && password.length >= 12;

  return (
    <div className="flex min-h-screen flex-col bg-[#100E0B] text-[#F7F4EF] font-inter">
      {/* Globe background, full bleed */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <Globe />
        <div className="absolute inset-0 bg-[#100E0B]/70 pointer-events-none" />
      </div>

      {/* Hairline top bar */}
      <header className="relative z-10 flex h-12 items-center justify-between px-6 border-b border-[#2E2921] bg-[#100E0B]/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#F97316] shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
          <span className="ml-1 text-[10px] font-serif font-bold tracking-tighter text-[#F7F4EF] uppercase">DISHA 6.6</span>
        </div>
        <div className="flex items-center gap-4 text-[9px] text-[#6E6862] uppercase tracking-[0.16em]">
          <span>SECURE CHANNEL</span>
          <span id="live-clock">--:--:--</span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6">
        {/* Login panel — off-centre left, 296px */}
        <section className="w-full max-w-[296px] border border-[#2E2921] bg-[#181511] rounded-[8px] p-6 shadow-2xl">
          <div className="mb-5">
            <p className="text-[9px] font-semibold text-[#A8A29A] uppercase tracking-[0.2em] mb-2">sovereign access</p>
            <h1 className="text-[18px] font-serif font-bold text-[#F7F4EF] tracking-tight leading-tight">DISHA 6.6</h1>
            <p className="mt-2 text-[11px] text-[#6E6862] leading-relaxed">
              Authorised operators only. Every session is evidence-logged.
            </p>
          </div>

          {state === "offline" && (
            <div className="mb-4 rounded border border-[#F97316]/30 bg-[#F97316]/10 p-3 text-[10px] text-[#F97316]">
              Offline — network unavailable. Attempts are queued locally.
            </div>
          )}

          {state === "locked-out" && (
            <div className="mb-4 rounded border border-[#F97316]/30 bg-[#F97316]/10 p-3 text-[10px] text-[#F97316]">
              Account locked. Try again in {lockoutRemaining}s.
            </div>
          )}

          {state === "mfa-required" && (
            <div className="mb-4 rounded border border-[#34D399]/30 bg-[#34D399]/10 p-3 text-[10px] text-[#34D399]">
              Second factor required. Enter your TOTP code.
            </div>
          )}

          {state === "passkey-prompt" && (
            <div className="mb-4 rounded border border-[#F97316]/30 bg-[#F97316]/10 p-3 text-[10px] text-[#F97316]">
              Passkey available. Touch your authenticator to proceed.
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 rounded border border-[#F97316]/30 bg-[#F97316]/10 p-3 text-[10px] text-[#F97316] flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F97316]" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[9px] font-semibold text-[#A8A29A] mb-1 uppercase tracking-[0.14em]">operator id</label>
              <input
                ref={emailRef}
                type="email"
                autoComplete="username"
                value={email}
                onChange={handleEmailChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className="w-full rounded border border-[#2E2921] bg-[#100E0B] px-3 py-2 text-[11px] font-mono text-[#F7F4EF] placeholder-[#6E6862] focus:border-[#F97316] focus:outline-none"
                placeholder="operator@disha.gov.in"
                disabled={disabled}
              />
            </div>

            <div className="relative">
              <label className="block text-[9px] font-semibold text-[#A8A29A] mb-1 uppercase tracking-[0.14em]">passphrase</label>
              <input
                ref={passRef}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={handlePasswordChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className="w-full rounded border border-[#2E2921] bg-[#100E0B] px-3 py-2 text-[11px] font-mono text-[#F7F4EF] placeholder-[#6E6862] focus:border-[#F97316] focus:outline-none pr-10"
                placeholder="••••••••••••"
                disabled={disabled}
                minLength={12}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={disabled}
                className={`absolute inset-y-0 right-2 flex items-center pr-1 text-[9px] ${disabled ? "text-[#4A443E]" : "text-[#A8A29A] hover:text-[#F7F4EF]"}`}
              >
                {showPassword ? "hide password" : "show password"}
              </button>
            </div>

            {/* Entropy meter */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[8px] text-[#6E6862] uppercase tracking-[0.1em]">entropy</span>
                <span className="text-[8px] font-mono text-[#A8A29A]">{Math.round((entropy / 4) * 100)}%</span>
              </div>
              <div className="flex gap-1 h-[4px]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-full w-full rounded-sm transition-colors ${
                      i < entropy
                        ? entropy === 4 ? "bg-[#34D399]" : "bg-[#F97316]"
                        : "bg-[#2E2921]"
                    }`}
                  />
                ))}
              </div>
              {entropyFeedback.length > 0 && (
                <p className="mt-1 text-[8px] text-[#6E6862]">{entropyFeedback[0]}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit || disabled}
              className={`w-full rounded border border-transparent bg-[#F97316] px-4 py-2.5 text-[11px] font-bold text-[#100E0B] uppercase tracking-[0.12em] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 focus:ring-offset-[#100E0B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
            >
              {state === "validating" ? "verifying…" : "authenticate"}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#2E2921]" />
                <span className="px-2 text-[8px] text-[#6E6862] bg-[#181511]">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePasskey}
              disabled={disabled}
              className={`w-full rounded border border-[#2E2921] bg-transparent px-4 py-2 text-[11px] font-semibold text-[#A8A29A] hover:text-[#F7F4EF] hover:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 focus:ring-offset-[#100E0B] disabled:opacity-40 transition-colors`}
            >
              continue with passkey
            </button>

            <button
              type="button"
              onClick={handleMeriPehchaan}
              disabled={disabled}
              className={`w-full rounded border border-[#2E2921] bg-transparent px-4 py-2 text-[11px] font-semibold text-[#A8A29A] hover:text-[#F7F4EF] hover:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 focus:ring-offset-[#100E0B] disabled:opacity-40 transition-colors`}
            >
              sign in with meri pehchaan
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#2E2921] flex items-center justify-between">
            <span className="text-[9px] font-mono text-[#6E6862]">tls 1.3 · argon2id</span>
            <span className="text-[9px] font-mono text-[#6E6862]">v6.6.0</span>
          </div>
        </section>

        {/* Success desk fade-in placeholder */}
        {state === "success" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-[#34D399]">
              <p className="text-[11px] font-mono">session established</p>
              <p className="text-[9px] text-[#6E6862] mt-1">evidence chain written · chain verified</p>
            </div>
          </div>
        )}
      </main>

      {/* Hairline bottom bar */}
      <footer className="relative z-10 flex h-8 items-center justify-between px-6 border-t border-[#2E2921] bg-[#100E0B]/80 backdrop-blur-sm text-[9px] text-[#6E6862] uppercase tracking-[0.16em]">
        <span>event hash: sha256-chained</span>
        <span>capability: governed entry</span>
      </footer>

      <script
        id="live-clock-script"
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var el = document.getElementById('live-clock');
              if(!el) return;
              function tick(){
                var now = new Date();
                el.textContent = now.toISOString().substr(11,8) + ' Z';
              }
              tick();
              setInterval(tick, 1000);
            })();
          `,
        }}
      />
    </div>
  );
}

function useMode<T>(initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(initial);
  return [v, setV];
}
