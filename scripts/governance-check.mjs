import { execFileSync } from "node:child_process";

const runGit = (args) =>
  execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const baseSha = process.env.BASE_SHA?.trim();
const usableBase = baseSha && !/^0+$/.test(baseSha) ? baseSha : null;
const range = usableBase ? usableBase + "...HEAD" : "HEAD^";

let diff;
try {
  diff = runGit([
    "diff",
    "--no-ext-diff",
    "--unified=0",
    "--diff-filter=ACMR",
    range,
    "--",
  ]);
} catch {
  diff = runGit([
    "show",
    "--format=",
    "--unified=0",
    "--diff-filter=ACMR",
    "HEAD",
  ]);
}

const changedFiles = new Set();
const addedLines = [];
let currentFile = null;

for (const line of diff.split("\n")) {
  const fileHeader = line.match(/^diff --git a\/(.+) b\/(.+)$/);
  if (fileHeader) {
    currentFile = fileHeader[2];
    changedFiles.add(currentFile);
    continue;
  }

  if (line.startsWith("+++ b/")) {
    currentFile = line.slice(6);
    changedFiles.add(currentFile);
    continue;
  }

  if (currentFile && line.startsWith("+") && !line.startsWith("+++")) {
    addedLines.push({ file: currentFile, text: line.slice(1) });
  }
}

const violations = [];
const addViolation = (file, message, text) => {
  violations.push(file + ": " + message + (text ? " — " + text.trim() : ""));
};

const codeFile = (file) => /\.(?:c|m)?[jt]sx?$/.test(file);
const workflowFile = (file) => file.startsWith(".github/workflows/");
const auditableLine = (file) => codeFile(file) || workflowFile(file);
const governanceFile = "scripts/governance-check.mjs";

const forbiddenPatterns = [
  ["private-key material", /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----/],
  ["GitHub access token", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/],
  ["GitHub fine-grained token", /\bgithub_pat_[A-Za-z0-9_]{20,}\b/],
  ["provider API key", /\bsk-(?:proj|ant)-[A-Za-z0-9_-]{20,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  [
    "hard-coded credential",
    /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|secret|password)\b\s*[:=]\s*["'](?!<|process\.env|env\.|undefined|null|true|false)[^"']{16,}["']/i,
  ],
  ["TypeScript suppression", /@ts-(?:ignore|nocheck)\b/],
  ["lint suppression", /\b(?:eslint-disable|biome-ignore|noqa)\b/],
  ["debugger statement", /\bdebugger\b/],
  ["console.log", /\bconsole\.log\s*\(/],
  ["workflow failure bypass", /\bcontinue-on-error\s*:\s*true\b/i],
  ["workflow failure bypass", /\ballow_failure\s*:\s*true\b/i],
  [
    "new debt marker",
    /(?:\/\/|\/\*|#|<!--)\s*(?:TODO|FIXME|HACK)\b/i,
  ],
];

for (const { file, text } of addedLines) {
  if (!auditableLine(file) || file === governanceFile) continue;

  for (const [name, pattern] of forbiddenPatterns) {
    if (pattern.test(text)) addViolation(file, name, text);
  }
}

const changed = [...changedFiles];
const regressionTestChanged = changed.some(
  (file) =>
    /(^|\/)(?:test|tests|__tests__)\//.test(file) ||
    /\.(?:test|spec)\.(?:c|m)?[jt]sx?$/.test(file),
);
const governedRuntimeChanged = changed.some((file) =>
  /^web\/(?:app\/api|lib\/(?:server|unified)|services)\//.test(file),
);

if (process.env.EVENT_NAME === "pull_request" && governedRuntimeChanged && !regressionTestChanged) {
  addViolation(
    "governance",
    "governed runtime changes must include a regression test change",
  );
}

try {
  // GitHub pull_request jobs are checked out at a synthetic merge commit.
  // Checking BASE_SHA...HEAD can fail on that detached merge ref even when the
  // underlying PR patch is valid. For PRs, compare the merge commit's first
  // parent (the base) directly to HEAD; for pushes, retain the normal range.
  const whitespaceRange =
    process.env.EVENT_NAME === "pull_request" ? "HEAD^1..HEAD" : range;
  const whitespace = runGit(["diff", "--check", whitespaceRange, "--"]).trim();
  if (whitespace) {
    for (const line of whitespace.split("\n")) {
      addViolation("diff", "whitespace error", line);
    }
  }
} catch (error) {
  const detail =
    error && typeof error === "object" && "stdout" in error && error.stdout
      ? String(error.stdout).trim()
      : error && typeof error === "object" && "stderr" in error && error.stderr
        ? String(error.stderr).trim()
        : error instanceof Error
          ? error.message
          : String(error);
  addViolation("diff", "unable to run whitespace check", detail);
}

if (violations.length > 0) {
  console.error("Governance line check failed:");
  for (const violation of violations) console.error("- " + violation);
  process.exitCode = 1;
} else {
  console.log(
    "Governance line check passed: " +
      addedLines.length +
      " added lines across " +
      changedFiles.size +
      " changed files.",
  );
}
