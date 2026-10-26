"use client";

import React, { useState, FormEvent, useMemo } from "react";
import { Shield, Lock, Eye, EyeOff, KeyRound, AlertTriangle, CheckCircle2 } from "lucide-react";

export function LoginClient({
  returnUrl = "/investigate",
  authError,
}: {
  returnUrl?: string;
  authError?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    authError === "session-expired"
      ? "Session has expired. Re-authenticate to resume intelligence operations."
      : authError
      ? "Authentication error encountered."
      : null
  );

  const isValid = email.includes("@") && password.length >= 12;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, rememberMe: true }),
      });

      if (!res.ok) {
        throw new Error("Invalid operator credentials.");
      }

      window.location.assign(returnUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
      setSubmitting(false);
    }
  }

  function handleMeriPehchaan() {
    const params = new URLSearchParams({ provider: "meri-pehchan", returnUrl });
    window.location.assign(`/api/auth/oidc/start?${params.toString()}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 font-mono text-slate-100">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">DISHA 6.6 Access Gateway</h1>
            <p className="text-xs text-slate-400">Welcome to your workspace.</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Operator ID (Email)</label>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@disha.gov.in"
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Passphrase (Min 12 Characters)</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-white"
              >
                {showPassword ? "Hide password" : "Show password"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isValid || submitting}
            className="w-full rounded bg-cyan-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-cyan-500 disabled:opacity-40"
          >
            {submitting ? "AUTHENTICATING..." : "SIGN IN TO SOVEREIGN WORKSPACE"}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleMeriPehchaan}
            className="w-full rounded border border-slate-700 bg-slate-950 py-2 text-xs text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
          >
            Sign in with Meri Pehchaan (National SSO)
          </button>
        </div>
      </div>
    </div>
  );
}
