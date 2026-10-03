"use client";

import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import dynamic from "next/dynamic";
import { authenticatedFetch } from "@/lib/client-fetch";
const SovereignCyberMatrix3D = dynamic(() => import("@/components/visual/SovereignCyberMatrix3D").then((module) => module.SovereignCyberMatrix3D), { ssr: false });
import styles from "./login.module.css";


type SubmitState = "idle" | "submitting" | "error";
type OidcProvider = "meri-pehchan" | "intra-id";

export function LoginClient({ returnUrl, passwordEnabled, providers }: { returnUrl: string; passwordEnabled: boolean; providers: Record<OidcProvider, boolean> }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void authenticatedFetch("/api/auth/me", { signal: controller.signal }).then(response => {
      if (response.ok) { router.replace(returnUrl); router.refresh(); }
    }).catch(() => undefined);
    return () => controller.abort();
  }, [returnUrl, router]);

  const normalizedEmail = email.trim().toLowerCase();
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail), [normalizedEmail]);
  const passwordMinLength = 12;
  const formValid = emailValid && password.length >= passwordMinLength;

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formValid || state === "submitting") return;

    setState("submitting");
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password, rememberMe }),
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("Email/User ID or password is incorrect.");
        if (response.status === 403) {
          throw new Error("Password sign-in is not enabled for this account. Use an approved identity provider below.");
        }
        if (response.status === 429) throw new Error("Too many sign-in attempts. Please wait before trying again.");
        throw new Error("Secure sign-in is temporarily unavailable. Please try again.");
      }

      window.location.assign(returnUrl);
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : "Secure sign-in failed.");
    }
  }

  function startOidc(provider: OidcProvider) {
    const params = new URLSearchParams({ provider, returnUrl });
    window.location.assign(new URL(`/api/auth/oidc/start?${params.toString()}`, window.location.origin).toString());
  }

  return (
    <main className={styles.shell}>
      <section className={styles.visualLayer} aria-label="disha6.6 secure access artwork">
        <SovereignCyberMatrix3D />
      </section>

      <section className={styles.loginPanel} aria-labelledby="secure-access-title">
        <div className={styles.panelInner}>
          <div className={styles.headingBlock}>
            <p className={styles.kicker}>ASTRA 6 · SOVEREIGN IDENTITY GATEWAY</p>
            <h1 id="secure-access-title">DISHA 6.6 Secure Access</h1>
            <p>Evidence-grade intelligence. Governed access.</p>
          </div>

          {passwordEnabled && <form className={styles.loginForm} onSubmit={signIn} noValidate>
            <label className={styles.field}>
              <span className={styles.srOnly}>Email address or User ID</span>
              <Mail aria-hidden="true" size={20} />
              <input
                autoComplete="username"
                inputMode="email"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                  if (state === "error") setState("idle");
                }}
                placeholder="Email Address / User ID"
                required
                type="email"
                value={email}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.srOnly}>Password</span>
              <LockKeyhole aria-hidden="true" size={20} />
              <input
                autoComplete="current-password"
                minLength={passwordMinLength}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                  if (state === "error") setState("idle");
                }}
                placeholder="Password"
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className={styles.revealButton}
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </label>

            <div className={styles.formMeta}>
              <label className={styles.rememberLabel}>
                <input checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} type="checkbox" />
                <span>Remember me</span>
              </label>
            </div>

            {error ? <div className={styles.error} role="alert">{error}</div> : null}

            <button className={styles.loginButton} disabled={!formValid || state === "submitting"} type="submit">
              {state === "submitting" ? <Loader2 className={styles.spin} size={20} /> : <ShieldCheck size={20} />}
              <span>{state === "submitting" ? "VERIFYING IDENTITY" : "LOGIN SECURELY"}</span>
              {state !== "submitting" ? <span className={styles.loginArrow}>→</span> : null}
            </button>
          </form>}

          {passwordEnabled && <p className={styles.help}>Use the email and password provisioned for your account. If you need a reset, contact your workspace administrator.</p>}
          {(providers["meri-pehchan"] || providers["intra-id"]) && <div className={styles.divider}><span>APPROVED IDENTITY</span></div>}
          {!passwordEnabled && !providers["meri-pehchan"] && !providers["intra-id"] && <p role="status">Sign-in has not been configured. Contact the workspace administrator.</p>}

          <div className={styles.identityGrid}>
            {providers["meri-pehchan"] && <button onClick={() => startOidc("meri-pehchan")} type="button">
              <Fingerprint size={21} />
              <span><small>Continue with</small>Meri Pehchan</span>
            </button>}
            {providers["intra-id"] && <button onClick={() => startOidc("intra-id")} type="button">
              <Building2 size={21} />
              <span><small>Continue with</small>Microsoft / Intra ID</span>
            </button>}
          </div>

          <footer className={styles.securityFooter}>
            <div><ShieldCheck size={20} /><span>Signed<br />session</span></div>
            <div><Fingerprint size={20} /><span>CSRF<br />protected</span></div>
            <div><CheckCircle2 size={20} /><span>Audit<br />logged</span></div>
          </footer>
        </div>
      </section>
    </main>
  );
}
