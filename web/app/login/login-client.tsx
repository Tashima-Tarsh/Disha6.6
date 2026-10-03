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
import { FormEvent, PointerEvent as ReactPointerEvent, useMemo, useRef, useState } from "react";

import { SovereignCyberMatrix3D } from "@/components/visual/SovereignCyberMatrix3D";
import styles from "./login.module.css";

type SubmitState = "idle" | "submitting" | "verified" | "error";
type OidcProvider = "meri-pehchan" | "intra-id";

export function LoginClient({ returnUrl }: { returnUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
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
          throw new Error("Password sign-in is not enabled for this account. Use an approved identity provider below.");
        }
        if (response.status === 429) throw new Error("Too many sign-in attempts. Please wait before trying again.");
        throw new Error("Secure sign-in is temporarily unavailable. Please try again.");
      }

      // Smooth transition into command center (Tasks 44 & 45)
      setState("verified");
      window.setTimeout(() => {
        window.location.assign(returnUrl);
      }, 750);
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : "Secure sign-in failed.");
    }
  }

  function startOidc(provider: OidcProvider) {
    const params = new URLSearchParams({ provider, returnUrl });
    window.location.assign(new URL(`/api/auth/oidc/start?${params.toString()}`, window.location.origin).toString());
  }

  // Premium spatial parallax: the gateway card floats and tilts toward the pointer,
  // with a radial sheen that tracks the cursor position across the glass surface.
  function trackCardParallax(event: ReactPointerEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card || state === "verified") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratioX = (event.clientX - rect.left) / rect.width - 0.5;
    const ratioY = (event.clientY - rect.top) / rect.height - 0.5;

    card.style.setProperty("--tilt-y", `${(ratioX * 10).toFixed(2)}deg`);
    card.style.setProperty("--tilt-x", `${(-ratioY * 10).toFixed(2)}deg`);
    card.style.setProperty("--glow-x", `${(((ratioX + 0.5) * 100)).toFixed(1)}%`);
    card.style.setProperty("--glow-y", `${(((ratioY + 0.5) * 100)).toFixed(1)}%`);
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
      {/* Aurora + particle depth atmosphere layered behind the WebGL scene */}
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.starField} aria-hidden="true" />

      {/* Immersive 3D Spatial Environment (Tasks 39-42) */}
      <section className={styles.visualLayer} aria-label="disha6.6 sovereign intelligence environment">
        <SovereignCyberMatrix3D />
      </section>

      {/* Cinematic vignette to focus the eye on the gateway */}
      <div className={styles.vignette} aria-hidden="true" />

      {/* Floating Spatial Gateway Overlay (Tasks 43-45) */}
      <section className={styles.spatialGatewayContainer} aria-labelledby="secure-access-title">
        <div
          className={`${styles.spatialGatewayCard} ${state === "verified" ? styles.gatewayDissolving : ""}`}
          onPointerLeave={resetCardParallax}
          onPointerMove={trackCardParallax}
          ref={cardRef}
        >
          <div className={styles.cardSheen} aria-hidden="true" />
          <div className={styles.capabilityPreviewBadge} role="note" aria-label="Capability preview notice">
            <span className={styles.previewIndicator} />
            <span className={styles.previewTitle}>CAPABILITY PREVIEW</span>
            <span className={styles.previewText}>Non-operational · Live intelligence admitted post-login</span>
          </div>
          <div className={styles.headingBlock}>
            <p className={styles.kicker}>SECURE IDENTITY</p>
            <h1 id="secure-access-title">DISHA 6.6</h1>
            <p className={styles.subtitle}>Evidence-Grade Intelligence</p>
            <div className={styles.runtimeTag}>Runtime: Astra 6</div>
          </div>

          <form className={styles.loginForm} onSubmit={signIn} noValidate>
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
                placeholder="Email / Identity"
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
            {state === "verified" ? (
              <div className={styles.successNotice} role="status">
                <CheckCircle2 size={18} />
                <span>Identity verified · Entering Mission Command...</span>
              </div>
            ) : null}

            <button className={styles.loginButton} disabled={!formValid || state === "submitting" || state === "verified"} type="submit">
              {state === "submitting" ? (
                <>
                  <Loader2 className={styles.spin} size={20} />
                  <span>VERIFYING IDENTITY...</span>
                </>
              ) : state === "verified" ? (
                <>
                  <CheckCircle2 size={20} />
                  <span>ACCESS GRANTED</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  <span>[ ENTER ]</span>
                  <span className={styles.loginArrow}>→</span>
                </>
              )}
            </button>
          </form>

          <div className={styles.divider}><span>OR USE APPROVED IDENTITY</span></div>

          <div className={styles.identityGrid}>
            <button onClick={() => startOidc("meri-pehchan")} type="button">
              <Fingerprint size={21} />
              <span><small>Continue with</small>Meri Pehchan</span>
            </button>
            <button onClick={() => startOidc("intra-id")} type="button">
              <Building2 size={21} />
              <span><small>Continue with</small>Intra ID</span>
            </button>
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
