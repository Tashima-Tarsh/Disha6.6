import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(repoRoot, file), "utf8");

describe("production deployment boundaries", () => {
  it("release gate runs the same critical checks as Fast CI", () => {
    const release = read(".github/workflows/release.yml");
    expect(release).toContain("npm run lint");
    expect(release).toContain("npm run type-check:full");
    expect(release).toContain("npm audit --omit=dev --audit-level=high");
    expect(release).toContain("npm run build");
    expect(release).toContain("test -d ../.agents/roles");
    expect(release).toContain("test -d ../.agents/skills");
  });
  it("OSINT backend container copies only its runtime sources", () => {
    const dockerfile = read("Dockerfile");
    expect(dockerfile).toContain("COPY --chown=disha:disha backend/ ./backend/");
    expect(dockerfile).not.toMatch(/^COPY\s+\.\s+\./m);
  });
  it("does not send bundled agents and archived binaries to unrelated root-context images", () => {
    const ignore = read(".dockerignore");
    for (const entry of ["/.agents/", "/disha/legacy-root-src/", "/disha/services/integrations/Pentagi/"]) {
      expect(ignore).toContain(entry);
    }
  });
});
