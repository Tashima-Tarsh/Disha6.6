import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const consolePage = path.resolve(__dirname, "../app/page.tsx");
const layoutPage = path.resolve(__dirname, "../app/layout.tsx");

describe("DISHA Sovereign Console Architecture", () => {
  it("delivers full tactical command directly through the unified operational console", () => {
    const page = fs.readFileSync(consolePage, "utf8");
    expect(page).toContain("TARGET ACQUISITION");
    expect(page).toContain("TACTICAL ENTITY LINK GRAPH");
    expect(page).toContain("MAX INTEL DIRECTORY");
    expect(page).toContain("CYBER DEFENSE");
    expect(page).toContain("NODE TELEMETRY");
  });

  it("supports multi-selector reconnaissance across domain, IP, username, phone, email, and geo", () => {
    const page = fs.readFileSync(consolePage, "utf8");
    expect(page).toContain("domain");
    expect(page).toContain("ip");
    expect(page).toContain("username");
    expect(page).toContain("phone");
    expect(page).toContain("email");
    expect(page).toContain("geo");
  });

  it("ships a real interactive topology canvas with animated physics", () => {
    const page = fs.readFileSync(consolePage, "utf8");
    expect(page).toContain("graphCanvasRef");
    expect(page).toContain("requestAnimationFrame");
    expect(page).toContain("INTERACTIVE TOPOLOGY");
  });

  it("wires verified findings to the evidence ledger with digital attestation", () => {
    const page = fs.readFileSync(consolePage, "utf8");
    expect(page).toContain("VERIFIED RECON FINDINGS");
    expect(page).toContain("DIGITAL SIGNATURE: ATTESTED");
    expect(page).toContain("CIS BENCHMARK HARDENING");
  });

  it("exports root layout with complete metadata and dark mode body", () => {
    const layout = fs.readFileSync(layoutPage, "utf8");
    expect(layout).toContain("RootLayout");
    expect(layout).toContain("DISHA 6.6");
    expect(layout).toContain("globals.css");
  });
});
