import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..");

function readWeb(relativePath: string) {
  return fs.readFileSync(path.join(webRoot, relativePath), "utf8");
}

function readRepo(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("production OSINT universe hardening", () => {
  it("never serves synthetic operational intelligence when the workspace database is unavailable", () => {
    const source = readWeb("app/api/v1/intelligence/workspace/route.ts");
    expect(source).toContain('database: "unconfigured"');
    expect(source).not.toContain("MIS-2026-CHAKRA-09");
    expect(source).not.toContain("hash-prov-certin");
    expect(source).not.toContain("fallbackEntities");
    expect(source).not.toContain("Honeypot Decoy Trap Triggered");
  });

  it("durably enqueues ASTRA worker runs instead of returning a cosmetic queued state", () => {
    const source = readWeb("lib/unified/astra6-governed-adapters.ts");
    expect(source).toContain("insert into astra6_connector_runs");
    expect(source).toContain("insert into astra6_tool_manifests");
    expect(source).toContain("context.identityApproved === true");
    expect(source).toContain("astra6_dispatch_database_unavailable");
  });

  it("runs the ASTRA worker with the shared TypeScript manifests and pinned tool releases", () => {
    const worker = readWeb("scripts/astra6-worker.mjs");
    const dockerfile = readRepo("infra/workers/Dockerfile.osint-worker");
    expect(worker).toContain("../lib/unified/astra6-tool-manifest.ts");
    expect(worker).toContain("../lib/unified/astra6-output-parsers.ts");
    expect(dockerfile).toContain("subfinder@v2.6.6");
    expect(dockerfile).toContain("amass/v4/...@v4.2.0");
    expect(dockerfile).toContain("phoneinfoga/v2@v2.11.0");
    expect(dockerfile).toContain("--branch v4.0");
    expect(dockerfile).toContain("tsx");
  });

  it("renders a capability-only login universe and an authenticated live OSINT universe", () => {
    const login = readWeb("app/login/login-client.tsx");
    const page = readWeb("app/login/page.tsx");
    const universe = readWeb("app/universe/universe-client.tsx");
    expect(login).toContain('<OsintUniverse3D mode="gateway" />');
    expect(page).toContain('return "/universe"');
    expect(universe).toContain("/api/v1/osint/catalog");
    expect(universe).toContain("/api/v1/osint/search");
    expect(universe).toContain("/api/v1/osint/astra/dispatch");
    expect(universe).toContain("/api/v1/osint/astra/runs/");
  });

  it("enforces Cloud Storage retention instead of describing ordinary versioning as WORM", () => {
    const storage = readRepo("infra/gcp/terraform/modules/storage/main.tf");
    expect(storage).toContain("retention_policy");
    expect(storage).toContain("retention_period = var.retention_period_seconds");
    expect(storage).toContain("is_locked        = var.lock_retention_policy");
  });

  it("fails closed for evidence-vault persistence errors in production", () => {
    const vault = readWeb("lib/unified/evidence-vault.ts");
    expect(vault).toContain('if (isProduction()) throw new Error("Evidence vault requires DATABASE_URL in production")');
    expect(vault).toContain("if (isProduction()) throw error");
  });
});
