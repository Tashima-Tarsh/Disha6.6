import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { withContext } from "@/lib/unified/api";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { evaluatePolicy } from "@/lib/unified/policy-gate";
import type { DishaSignal } from "@/lib/unified/contracts";
import { verifyAuthorizationGrant } from "@/lib/server/authorization-grants";

export const dynamic = "force-dynamic";

const SENSITIVE_PATTERNS = [
  /\.env/i,
  /id_rsa/i,
  /\.pem$/i,
  /\.key$/i,
  /secret/i,
  /credential/i,
  /password/i,
  /\.git([\\/]|$)/i,
  /node_modules([\\/]|$)/i,
];

const ALLOWED_COMMAND_PREFIXES = [
  "npm test",
  "npm run test",
  "pytest",
  "python -m unittest",
  "python3 -m unittest",
  "node --test",
  "vitest run",
  "jest",
];

function isSafeCommand(cmd: string): boolean {
  const trimmed = cmd.trim();
  for (const ch of [";", "&", "|", "`", "$", ">", "<", "\n", "\r"]) {
    if (trimmed.includes(ch)) return false;
  }
  return ALLOWED_COMMAND_PREFIXES.some(
    (prefix) => trimmed === prefix || trimmed.startsWith(`${prefix} `)
  );
}

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    try {
      // 1. Hardened RBAC: Self-healing strictly requires administrator role
      if (!ctx.principal.roles.includes("admin")) {
        return NextResponse.json(
          {
            status: "PERMISSION_DENIED",
            error: "Autonomous code repair requires 'admin' role. Caller is not an authorized administrator.",
          },
          { status: 403 }
        );
      }

      const body = await req.json();
      const {
        targetFile,
        failureDesc,
        reproCmd,
        testCmd,
        badToken,
        fixedToken,
        grantId,
      } = body;

      if (!targetFile || typeof targetFile !== "string") {
        return NextResponse.json({ error: "targetFile is required" }, { status: 400 });
      }

      // 2. Strict authorization grant check: high_risk_execution grant required
      if (!grantId) {
        return NextResponse.json(
          {
            status: "GRANT_REQUIRED",
            error: "Self-healing requires an explicit verified authorization grant (high_risk_execution).",
          },
          { status: 403 }
        );
      }

      const grantVerification = verifyAuthorizationGrant({
        grantId,
        caller: ctx.principal,
        requiredScope: "high_risk_execution",
        target: targetFile,
      });

      if (!grantVerification.authorized) {
        return NextResponse.json(
          {
            status: "GRANT_INVALID",
            error: `Authorization grant verification failed: ${grantVerification.reason}`,
          },
          { status: 403 }
        );
      }

      // 3. Command safety check: forbid shell injection / non-allowlisted commands
      if (!reproCmd || !testCmd || !badToken || !fixedToken) {
        return NextResponse.json(
          {
            status: "INCOMPLETE_PARAMETERS",
            error: "Genuine self-healing requires reproCmd, testCmd, badToken, and fixedToken to execute verification.",
          },
          { status: 400 }
        );
      }

      if (!isSafeCommand(reproCmd)) {
        return NextResponse.json(
          {
            status: "COMMAND_PROHIBITED",
            error: `reproCmd violates command security policy. Allowed commands: ${ALLOWED_COMMAND_PREFIXES.join(", ")}`,
          },
          { status: 400 }
        );
      }

      if (!isSafeCommand(testCmd)) {
        return NextResponse.json(
          {
            status: "COMMAND_PROHIBITED",
            error: `testCmd violates command security policy. Allowed commands: ${ALLOWED_COMMAND_PREFIXES.join(", ")}`,
          },
          { status: 400 }
        );
      }

      // 4. Resolve and canonicalize paths
      const normalizedTarget = path.normalize(targetFile).replace(/\\/g, "/");
      if (normalizedTarget.startsWith("..") || path.isAbsolute(normalizedTarget)) {
        return NextResponse.json({ error: "Access outside authorized workspace is prohibited" }, { status: 403 });
      }

      for (const pat of SENSITIVE_PATTERNS) {
        if (pat.test(normalizedTarget)) {
          return NextResponse.json(
            { error: `Modifying sensitive file '${normalizedTarget}' is forbidden.` },
            { status: 403 }
          );
        }
      }

      // Locate repository root & engine
      const candidates = [
        path.resolve(process.cwd(), "..", "packages", "autonomous", "self_healing_engine.py"),
        path.resolve(process.cwd(), "packages", "autonomous", "self_healing_engine.py"),
      ];
      const engineScript = candidates.find((p) => fs.existsSync(p));
      if (!engineScript) {
        return NextResponse.json(
          { status: "UNAVAILABLE", error: "SelfHealingEngine runtime not available in this container environment" },
          { status: 503 }
        );
      }

      const repoRoot = path.resolve(engineScript, "../../..");
      const targetAbsPath = path.resolve(repoRoot, normalizedTarget);

      if (!fs.existsSync(targetAbsPath)) {
        return NextResponse.json({ error: `Target file not found: ${normalizedTarget}` }, { status: 404 });
      }

      // Canonical symlink escape prevention
      try {
        const canonicalTarget = fs.realpathSync(targetAbsPath);
        const canonicalRepoRoot = fs.realpathSync(repoRoot);
        if (!canonicalTarget.startsWith(canonicalRepoRoot)) {
          return NextResponse.json({ error: "Symlink resolution escapes repository boundary" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Failed canonicalizing file path" }, { status: 403 });
      }

      // 5. Evaluate constitutional policy: ONLY 'ALLOW' is permitted
      const signal: DishaSignal = {
        id: `sig-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: ctx.principal.email || ctx.principal.userId,
        missionId: `heal-${Date.now()}`,
        input: {
          rawText: `self-heal target: ${normalizedTarget}`,
          requestedAction: "autonomous_code_repair",
          files: [],
          locations: [],
          indicators: [],
        },
        context: {
          intent: "code_repair",
          entities: [],
          memoryRefs: [],
          dataSources: [],
          sensitivity: "controlled",
        },
        riskContext: {
          userRole: "admin",
          actionRisk: 0.8,
          dataSensitivityRisk: 0.1,
          deviceTrust: 1.0,
        },
      };

      const policy = evaluatePolicy(signal);
      if (policy.decision !== "ALLOW") {
        return NextResponse.json(
          {
            status: "POLICY_BLOCKED",
            error: `Autonomous code modification denied: Constitutional policy requires ALLOW, received ${policy.decision}.`,
            reasons: policy.reasons,
          },
          { status: 403 }
        );
      }

      // 6. Execute genuine self-healing process without shell
      const pythonExe = process.platform === "win32" ? "python" : "python3";
      const proc = spawnSync(
        pythonExe,
        [
          "-B",
          engineScript,
          "--target",
          targetAbsPath,
          "--failure-desc",
          failureDesc || "Diagnostic fault",
          "--repro-cmd",
          reproCmd,
          "--test-cmd",
          testCmd,
          "--bad-token",
          badToken,
          "--fixed-token",
          fixedToken,
        ],
        {
          cwd: repoRoot,
          encoding: "utf-8",
          timeout: 45000,
        }
      );

      if (proc.error) {
        return NextResponse.json(
          { status: "UNAVAILABLE", error: `Execution failed: ${proc.error.message}` },
          { status: 503 }
        );
      }

      let trace: any;
      try {
        trace = JSON.parse(proc.stdout.trim());
      } catch {
        return NextResponse.json(
          {
            status: "EXECUTION_ERROR",
            error: "Failed to parse self-healing engine output",
            stdout: proc.stdout,
            stderr: proc.stderr,
          },
          { status: 500 }
        );
      }

      // 7. Record durable evidence event (Fail-closed on production)
      let evidenceId: string | undefined;
      let evidenceError: string | undefined;
      try {
        const ev = await appendEvidenceEvent({
          missionId: signal.missionId || `heal-${Date.now()}`,
          actor: ctx.principal.email || "autonomous-engineer@disha.gov",
          action: "autonomous_self_heal",
          input: { targetFile: normalizedTarget, failureDesc, grantId },
          output: trace,
          policyDecision: policy,
        });
        evidenceId = ev?.eventId;
      } catch (err: any) {
        evidenceError = err?.message;
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json(
            { status: "EVIDENCE_WRITE_FAILED", error: `Evidence ledger write failed: ${err.message}` },
            { status: 500 }
          );
        }
      }

      return NextResponse.json(
        {
          ...trace,
          evidenceId,
          evidenceError,
        },
        {
          headers: { "X-Request-ID": ctx.requestId },
        }
      );
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed running self healing" }, { status: 500 });
    }
  });
}

