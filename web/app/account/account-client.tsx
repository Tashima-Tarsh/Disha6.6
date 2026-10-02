"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authenticatedFetch } from "@/lib/client-fetch";
import styles from "./account.module.css";

export function AccountClient({ email, passwordEnabled }: { email: string; passwordEnabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  async function change(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword"));
    if (newPassword !== form.get("confirmPassword")) { setError("New passwords do not match."); return; }
    setBusy(true); setError(null);
    try {
      const response = await authenticatedFetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword }) });
      if (!response.ok) throw new Error(response.status === 401 ? "Your current password or session is no longer valid. Sign in and try again." : response.status === 400 ? "Choose a different password with at least 15 characters." : "Password change could not be completed. Please try again.");
      setChanged(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Password change failed."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError(null);
    try {
      const response = await authenticatedFetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign-out failed. Please retry.");
      router.replace("/login"); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Sign-out failed."); setBusy(false); }
  }
  return <main className={styles.shell}>
    <Link href="/dashboard">← Analyst workspace</Link>
    <p className={styles.eyebrow}>Account security</p><h1>Your access.</h1><p>{email}</p>
    {changed ? <section className={styles.panel} role="status"><h2>Password updated</h2><p>All sessions have been signed out. Use your new password to continue.</p><Link href="/login">Sign in again →</Link></section> : <>
      {passwordEnabled ? <form className={styles.panel} onSubmit={change}>
        <h2>Change password</h2><p>Use a unique passphrase of at least 15 characters. Changing it signs out all of your sessions.</p>
        <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" maxLength={256} required disabled={busy} /></label>
        <label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={15} maxLength={256} required disabled={busy} /></label>
        <label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={15} maxLength={256} required disabled={busy} /></label>
        <button disabled={busy}>{busy ? "Saving…" : "Update password"}</button>
      </form> : <section className={styles.panel}><h2>Managed identity</h2><p>Your identity provider manages your password and recovery options.</p></section>}
      <button className={styles.secondary} onClick={logout} disabled={busy}>Sign out</button>
    </>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </main>;
}
