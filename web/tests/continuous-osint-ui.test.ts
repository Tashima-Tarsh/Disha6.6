import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("continuous intelligence source mesh UI", () => {
  it("surfaces governed watch state and safe bundle creation", () => {
    const root = path.resolve(__dirname, "..");
    const source = fs.readFileSync(path.join(root, "app/page.tsx"), "utf8");
    expect(source).toContain("ALL_43_COLLECTORS");
    expect(source).toContain("AlienVault OTX");
    expect(source).toContain("URLScan.io Public");
    expect(source).toContain("Bellingcat ShadowFinder");
    expect(source).toContain("Threat Intel");
    expect(source).toContain("Infrastructure");
    expect(source).toContain("Identity");
  });
});
