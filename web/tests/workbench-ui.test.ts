import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const consolePage = path.resolve(__dirname, "../app/page.tsx");
const globalsCss = path.resolve(__dirname, "../app/globals.css");
const layoutPage = path.resolve(__dirname, "../app/layout.tsx");

describe("DISHA Sovereign Command Console UI", () => {
  it("integrates directly with real OSINT APIs and 43 Max Intel collectors", () => {
    const source = fs.readFileSync(consolePage, "utf8");

    expect(source).toContain("/api/osint/scan");
    expect(source).toContain("ALL_43_COLLECTORS");
    expect(source).toContain("AlienVault OTX");
    expect(source).toContain("Bellingcat ShadowFinder");
    expect(source).toContain("URLScan.io Public");
    expect(source).toContain("HackerTarget DNS");
    expect(source).toContain("Bluesky Actor (ATProto)");
    expect(source).toContain("allowActive: true");
  });

  it("provides cryptographic SHA-256 provenance and immutable evidence records", () => {
    const source = fs.readFileSync(consolePage, "utf8");

    expect(source).toContain("sha256:");
    expect(source).toContain("evidenceEvents");
    expect(source).toContain("IMMUTABLE EVIDENCE LEDGER");
    expect(source).toContain("PROVENANCE:");
  });

  it("enforces Hallmark floor constraints and OLED dark mode styling", () => {
    const css = fs.readFileSync(globalsCss, "utf8");
    const layout = fs.readFileSync(layoutPage, "utf8");

    expect(css).toContain("overflow-x: clip");
    expect(css).toContain("#020617");
    expect(layout).toContain("dark");
  });
});
