import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "DISHA 6.6 — Sovereign Defense & Automated OSINT Command",
  description: "Unified Intelligence Matrix integrating 43 reconnaissance engines, live telemetry, and cryptographic evidence vaults.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
        {children}
      </body>
    </html>
  );
}
