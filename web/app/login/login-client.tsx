"use client";

import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";


import { DishaDesktopDepth } from "@/components/shell/DishaDesktopDepth";
import styles from "./login.module.css";

type SubmitState = "idle" | "submitting" | "mfa_required" | "verified" | "error";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "session-expired": "Session has expired. Re-authenticate to resume intelligence operations.",
  "unauthorized": "Access denied. Valid operator authorization required.",
  "meri-pehchaan-not-configured":
    "Meri Pehchaan integration requires government partner portal credentials in this environment.",
  "government-signin-cancelled":
    "Government identity sign-in was cancelled before authorization completed.",
  "government-signin-failed":
    "Government identity sign-in could not be completed. Use Operator ID and password.",
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
  const [mfaCode, setMfaCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(
    authError ? AUTH_ERROR_MESSAGES[authError] ?? "Authentication error encountered." : null,
  );


  const normalizedEmail = email.trim().toLowerCase();
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail), [normalizedEmail]);
  const passwordMinLength = 12;
  const formValid = emailValid && password.length >= passwordMinLength;

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting" || state === "verified") return;

    if (state === "mfa_required") {
      if (!/^\d{6}$/.test(mfaCode.trim())) {
        setError("Enter a valid 6-digit MFA verification code.");
        return;
      }
    } else if (!formValid) {
      setError("Enter a valid Operator ID (email) and password (minimum 12 characters).");
      return;
    }

    setState("submitting");
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          rememberMe,
          mfaCode: state === "mfa_required" ? mfaCode.trim() : undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
        if (payload?.code === "MFA_REQUIRED") {
          setState("mfa_required");
          return;
        }
        if (response.status === 401) throw new Error("Operator ID or password is incorrect.");
        if (response.status === 403) throw new Error("Direct password access is not authorized for this security tier.");
        if (response.status === 429) throw new Error("Rate limit exceeded. Too many authentication attempts.");
        throw new Error(payload?.message ?? "Secure access gateway unavailable. Please retry.");
      }

      setState("verified");
      window.setTimeout(() => {
        window.location.assign(returnUrl);
      }, 700);
    } catch (caught) {
      setState(state === "mfa_required" ? "mfa_required" : "error");
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    }
  }

  function startMeriPehchaan() {
    setError(null);
    const params = new URLSearchParams({ provider: "meri-pehchan", returnUrl });
    window.location.assign(new URL(`/api/auth/oidc/start?${params.toString()}`, window.location.origin).toString());
  }

  return (
    <main className={styles.shell}>
      <DishaDesktopDepth />
      <header className={styles.topbar}><span className={styles.wordmark}>disha<span>6.6</span></span><span>Your research. One workspace.</span></header>
      <section className={styles.spatialGatewayContainer} aria-labelledby="auth-heading">
        <div className={styles.spatialGatewayCard}>
          <div className={styles.avatar} aria-hidden="true">d.</div>
          <div className={styles.headingBlock}>
            <span className={styles.kicker}>DISHA 6.6 · SIGN IN</span>
            <h1 id="auth-heading" className={styles.brandTitle}>Welcome to your workspace.</h1>
            <p className={styles.platformSubtitle}>Search public sources. Examine evidence.<br />Keep the whole picture in view.</p>
          </div>
          {/* Session Expiration / Error Banner */}
          {error ? (
            <div className={styles.error} role="alert">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Form */}
          <form className={styles.loginForm} onSubmit={signIn} noValidate>
            {state !== "mfa_required" ? (
              <>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Operator ID / Email</span>
                  <div className={styles.inputWrapper}>
                    <Mail aria-hidden="true" size={16} className={styles.fieldIcon} />
                    <input
                      autoComplete="username"
                      inputMode="email"
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setError(null);
                        if (state === "error") setState("idle");
                      }}
                      placeholder="Your account email"
                      required
                      type="email"
                      value={email}
                    />
                  </div>
                </label>

                <label className={styles.field}>
                  <div className={styles.fieldLabelRow}>
                    <span className={styles.fieldLabel}>Password</span>
                    <button
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className={styles.revealButtonInline}
                      onClick={() => setShowPassword((visible) => !visible)}
                      type="button"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{showPassword ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                  <div className={styles.inputWrapper}>
                    <LockKeyhole aria-hidden="true" size={16} className={styles.fieldIcon} />
                    <input
                      autoComplete="current-password"
                      minLength={passwordMinLength}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError(null);
                        if (state === "error") setState("idle");
                      }}
                      placeholder="••••••••••••••••"
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                    />
                  </div>
                </label>

                <div className={styles.formMeta}>
                  <label className={styles.rememberLabel}>
                    <input
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Keep me signed in</span>
                  </label>
                </div>
              </>
            ) : (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>MFA Challenge Code</span>
                <div className={styles.inputWrapper}>
                  <KeyRound aria-hidden="true" size={16} className={styles.fieldIcon} />
                  <input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    autoFocus
                    maxLength={6}
                    onChange={(event) => {
                      setMfaCode(event.target.value);
                      setError(null);
                    }}
                    placeholder="6-digit authentication token"
                    required
                    type="text"
                    value={mfaCode}
                  />
                </div>
                <span className={styles.fieldHelp}>
                  Enter the code from your authenticator.
                </span>
              </label>
            )}

            {state === "verified" ? (
              <div className={styles.successNotice} role="status">
                <CheckCircle2 size={16} />
                <span>Signed in. Opening your DISHA desktop…</span>
              </div>
            ) : null}

            <button
              className={styles.loginButton}
              disabled={!formValid || state === "submitting" || state === "verified" || (state === "mfa_required" && !/^\d{6}$/.test(mfaCode.trim()))}
              type="submit"
            >
              {state === "submitting" ? (
                <>
                  <Loader2 className={styles.spin} size={16} />
                  <span>Signing in…</span>
                </>
              ) : state === "verified" ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Opening desktop…</span>
                </>
              ) : state === "mfa_required" ? (
                <>
                  <ShieldCheck size={16} />
                  <span>Verify and continue</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Sign in to DISHA</span>
                </>
              )}
            </button>
          </form>

          {/* Government / Meri Pehchaan Federated Identity */}
          <div className={styles.divider}>
            <span>Or use your connected identity</span>
          </div>

          <div className={styles.identityGrid}>
            <button onClick={startMeriPehchaan} type="button" className={styles.fedButton}>
              <Fingerprint size={16} />
              <span>Meri Pehchaan SSO</span>
            </button>
            <a
              href="https://epramaan.meripehchaan.gov.in/"
              rel="noreferrer"
              target="_blank"
              className={styles.fedButton}
            >
              <Building2 size={16} />
              <span>Identity Portal</span>
            </a>
          </div>

          {/* Strict Intelligence Command Footer */}
          <footer className={styles.securityFooter}>
            <p className={styles.securityClaims}>For authorized users. Access is subject to your account permissions.</p>
            <p className={styles.preAuthDisclaimer}>SSO requires a configured identity provider.</p>
          </footer>
        </div>
      </section>
      <footer className={styles.desktopFooter}><span>DISHA 6.6</span><span>Evidence-first research workspace</span><LockKeyhole size={15} aria-hidden="true" /></footer>
    </main>
  );
}

export default LoginClient;
