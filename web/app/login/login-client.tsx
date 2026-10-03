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
import { FormEvent, PointerEvent as ReactPointerEvent, useMemo, useRef, useState } from "react";

import { DishaIdentityScene3D } from "@/components/auth/DishaIdentityScene3D";
import styles from "./login.module.css";

type SubmitState = "idle" | "submitting" | "verified" | "error";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "meri-pehchaan-not-configured":
    "Meri Pehchaan is ready in DISHA but still requires the client ID and secret issued to this application by the government partner portal.",
  "government-signin-cancelled":
    "Government identity sign-in was cancelled before authorization completed.",
  "government-signin-failed":
    "Government identity sign-in could not be completed. Please try again or use password access if enabled.",
};

export function LoginClient({
  returnUrl,
  authError,
}: {
  returnUrl: string;
  authError?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(
    authError ? AUTH_ERROR_MESSAGES[authError] ?? "Government identity sign-in was not completed." : null,
  );
  const cardRef = useRef<HTMLDivElement>(null);

  const normalizedEmail = email.trim().toLowerCase();
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail), [normalizedEmail]);
  const passwordMinLength = 12;
  const formValid = emailValid && password.length >= passwordMinLength;

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formValid || state === "submitting" || state === "verified") return;

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
          throw new Error("Password sign-in is not enabled for this account. Use Meri Pehchaan below.");
        }
        if (response.status === 429) throw new Error("Too many sign-in attempts. Please wait before trying again.");
        throw new Error("Secure sign-in is temporarily unavailable. Please try again.");
      }

      setState("verified");
      window.setTimeout(() => {
        window.location.assign(returnUrl);
      }, 750);
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : "Secure sign-in failed.");
    }
  }

  function startMeriPehchaan() {
    setError(null);
    const params = new URLSearchParams({ provider: "meri-pehchan", returnUrl });
    window.location.assign(new URL(`/api/auth/oidc/start?${params.toString()}`, window.location.origin).toString());
  }

  function trackCardParallax(event: ReactPointerEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card || state === "verified") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratioX = (event.clientX - rect.left) / rect.width - 0.5;
    const ratioY = (event.clientY - rect.top) / rect.height - 0.5;

    card.style.setProperty("--tilt-y", `${(ratioX * 6).toFixed(2)}deg`);
    card.style.setProperty("--tilt-x", `${(-ratioY * 6).toFixed(2)}deg`);
    card.style.setProperty("--glow-x", `${((ratioX + 0.5) * 100).toFixed(1)}%`);
    card.style.setProperty("--glow-y", `${((ratioY + 0.5) * 100).toFixed(1)}%`);
  }

  function resetCardParallax() {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
    card.style.setProperty("--glow-x", "50%");
    card.style.setProperty("--glow-y", "0%");
  }

  return (
    <main className={styles.shell}>
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.starField} aria-hidden="true" />

      <section className={styles.visualLayer} aria-label="DISHA 6.6 sovereign intelligence environment">
        <DishaIdentityScene3D transitionState={state} />
      </section>

      <div className={styles.vignette} aria-hidden="true" />

      <section className={styles.spatialGatewayContainer} aria-labelledby="secure-access-title">
        <div
          className={`${styles.spatialGatewayCard} ${state === "verified" ? styles.gatewayDissolving : ""}`}
          onPointerLeave={resetCardParallax}
          onPointerMove={trackCardParallax}
          ref={cardRef}
        >
          <div className={styles.cardSheen} aria-hidden="true" />

          <div className={styles.headingBlock}>
            <p className={styles.kicker}>SECURE ACCESS</p>
            <h1 id="secure-access-title">DISHA 6.6</h1>
            <p className={styles.subtitle}>Evidence-Grade Intelligence</p>
          </div>

          <form className={styles.loginForm} onSubmit={signIn} noValidate>
            <label className={styles.field}>
              <span className={styles.srOnly}>Email address or User ID</span>
              <Mail aria-hidden="true" size={18} />
              <input
                autoComplete="username"
                inputMode="email"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                  if (state === "error") setState("idle");
                }}
                placeholder="Email / Identity"
                required
                type="email"
                value={email}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.srOnly}>Password</span>
              <LockKeyhole aria-hidden="true" size={18} />
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
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </label>

            <div className={styles.formMeta}>
              <label className={styles.rememberLabel}>
                <input checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} type="checkbox" />
                <span>Remember me</span>
              </label>
            </div>

            {error ? <div className={styles.error} role="alert">{error}</div> : null}
            {state === "verified" ? (
              <div className={styles.successNotice} role="status">
                <CheckCircle2 size={16} />
                <span>Identity verified · Entering secure workspace...</span>
              </div>
            ) : null}

            <button className={styles.loginButton} disabled={!formValid || state === "submitting" || state === "verified"} type="submit">
              {state === "submitting" ? (
                <>
                  <Loader2 className={styles.spin} size={18} />
                  <span>VERIFYING IDENTITY...</span>
                </>
              ) : state === "verified" ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>ACCESS GRANTED</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>[ ENTER ]</span>
                  <span className={styles.loginArrow}>→</span>
                </>
              )}
            </button>
          </form>

          <div className={styles.divider}><span>OR USE GOVERNMENT IDENTITY</span></div>

          <div className={styles.identityGrid}>
            <button onClick={startMeriPehchaan} type="button">
              <Fingerprint size={18} />
              <span><small>Continue with</small>Meri Pehchaan</span>
            </button>
            <a
              href="https://epramaan.meripehchaan.gov.in/"
              rel="noreferrer"
              target="_blank"
            >
              <Building2 size={18} />
              <span><small>Create / manage</small>Government ID</span>
            </a>
          </div>

          <footer className={styles.securityFooter}>
            <p className={styles.securityClaims}>SECURE SESSION · CSRF PROTECTED · AUDIT LOGGED</p>
            <p className={styles.preAuthDisclaimer}>PRE-AUTH VISUALIZATION · LIVE INTELLIGENCE AFTER SIGN-IN</p>
          </footer>
        </div>
      </section>
    </main>
  );
}
