import Link from "next/link";
export default function NotFound() {
  return <main style={{ minHeight: "100dvh", padding: "clamp(24px,8vw,100px)", background: "#101613", color: "#c4d7cb" }}><p>disha6.6 / 404</p><h1>This page does not exist.</h1><Link href="/dashboard">Return to the workspace →</Link></main>;
}
