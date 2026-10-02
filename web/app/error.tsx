"use client";
import Link from "next/link";
export default function ErrorBoundary({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main style={{ minHeight: "100dvh", padding: "clamp(24px,8vw,100px)", background: "#101613", color: "#e5ece7" }}>
    <p>disha6.6 / Service recovery</p><h1>This workspace could not load.</h1>
    <p>A required service may be unavailable. Retry, or return to sign-in.</p>
    {error.digest && <p>Reference: {error.digest}</p>}
    <button onClick={retry} style={{ padding: "12px 20px", margin: "20px 20px 20px 0", cursor: "pointer" }}>Try again</button>
    <Link href="/login">Return to sign-in</Link>
  </main>;
}
