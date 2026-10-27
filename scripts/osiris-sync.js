#!/usr/bin/env node
/**
 * OSIRIS Upstream Sync Workflow.
 *
 * Checks the OSIRIS upstream repository for new commits, evaluates update
 * availability, and provides rollback instructions. No automatic updates
 * are performed — all changes require human approval.
 *
 * Usage:
 *   node scripts/osiris-sync.js check        # Check for updates
 *   node scripts/osiris-sync.js rollback    # Show rollback instructions
 */

const { execSync } = await import("child_process");

const SUBMODULE_PATH = "disha/services/integrations/osint-upstreams/osiris";
const UPSTREAM_URL = "https://github.com/simplifaisoul/osiris";

function git(args) {
  return execSync(`git ${args.join(" ")}`, { cwd: SUBMODULE_PATH, encoding: "utf8" }).trim();
}

function getPinnedSha() {
  return git(["rev-parse", "HEAD"]);
}

function getUpstreamSha() {
  execSync(`git fetch origin master`, { cwd: SUBMODULE_PATH, encoding: "utf8", stdio: "pipe" });
  return git(["rev-parse", "origin/master"]);
}

function getCommitInfo(sha) {
  const out = git(["show", "-s", "--format=%H%x09%s%x09%ci", sha]);
  const parts = out.split("\t");
  return { sha: parts[0], message: parts[1], date: parts[2] };
}

function getCommitAheadBehind(pinned, upstream) {
  try {
    const out = execSync(`git rev-list --count ${pinned}..${upstream}`, { cwd: SUBMODULE_PATH, encoding: "utf8" }).trim();
    return out + " commit(s)";
  } catch (e) {
    return "unknown";
  }
}

function checkUpdates() {
  const pinned = getPinnedSha();
  const pinnedInfo = getCommitInfo(pinned);
  console.log("\n=== OSIRIS Upstream Sync Check ===");
  console.log("Pinned commit: " + pinnedInfo.sha);
  console.log("Pinned message: " + pinnedInfo.message);
  console.log("Pinned date: " + pinnedInfo.date);

  try {
    const upstream = getUpstreamSha();
    const upstreamInfo = getCommitInfo(upstream);
    console.log("\nLatest upstream commit: " + upstreamInfo.sha);
    console.log("Latest upstream message: " + upstreamInfo.message);
    console.log("Latest upstream date: " + upstreamInfo.date);

    if (pinned === upstream) {
      console.log("\nStatus: UP TO DATE — pinned commit matches upstream master");
    } else {
      try {
        execSync(`git merge-base --is-ancestor ${pinned} ${upstream}`, { cwd: SUBMODULE_PATH, encoding: "utf8", stdio: "pipe" });
        console.log("\nStatus: UPDATE AVAILABLE — upstream is " + getCommitAheadBehind(pinned, upstream) + " ahead");
        console.log("\nTo review: git -C " + SUBMODULE_PATH + " log " + pinned + ".." + upstream + " --oneline");
        console.log("To update: git -C " + SUBMODULE_PATH + " checkout " + upstream);
        console.log("Then update data/osint/upstream-registry.json pinnedSha to " + upstream);
        console.log("\nWARNING: Review changes before deploying. No auto-updates.");
      } catch (e) {
        console.log("\nStatus: DIVERGED — pinned commit is not an ancestor of upstream");
        console.log("Manual review required before any update.");
      }
    }
  } catch (err) {
    console.log("\nWarning: Could not fetch upstream — " + (err instanceof Error ? err.message : String(err)));
    console.log("\nTo manually fetch: git -C " + SUBMODULE_PATH + " fetch origin");
  }
}

function showRollback() {
  const pinned = getPinnedSha();
  const pinnedInfo = getCommitInfo(pinned);
  console.log("\n=== OSIRIS Rollback Instructions ===");
  console.log("Current pinned commit: " + pinnedInfo.sha);
  console.log("Current message: " + pinnedInfo.message);
  console.log("\nTo rollback to the last verified commit:");
  console.log("  1. git -C " + SUBMODULE_PATH + " checkout <verified-commit-sha>");
  console.log("  2. git add disha/services/integrations/osint-upstreams/osiris");
  console.log("  3. git commit -m \"chore(osiris): rollback to <verified-commit-sha>\"");
  console.log("  4. docker compose -f docker-compose.osiris.yml up -d --build osiris");
  console.log("  5. Verify: curl http://127.0.0.1:3005/api/health");
  console.log("\nRollback does NOT modify upstream code — it only changes which commit DISHA pins.");
}

const cmd = process.argv[2];
if (cmd === "check") {
  checkUpdates();
} else if (cmd === "rollback") {
  showRollback();
} else {
  console.log("Usage: node scripts/osiris-sync.js <check|rollback>");
  console.log("  check    - Check for upstream updates");
  console.log("  rollback - Show rollback instructions");
  process.exit(1);
}
