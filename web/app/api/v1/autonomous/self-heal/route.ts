import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { withContext } from "@/lib/unified/api";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { evaluatePolicy } from "@/lib/unified/policy-gate";
import type { DishaSignal } from "@/lib/unified/contracts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withContext(req, "agent:run", async (ctx) => {
    try {
      const body = await req.json();
      const {
        targetFile,
        failureDesc,
        reproCmd,
        testCmd,
        badToken,
        fixedToken,
      } = body;

      if (!targetFile || typeof targetFile !== "string") {
        return NextResponse.json({ error: "targetFile is required" }, { status: 400 });
      }

      // Security boundary check: prohibit path traversal
      const normalizedTarget = path.normalize(targetFile).replace(/\\/g, "/");
      if (normalizedTarget.startsWith("..") || path.isAbsolute(normalizedTarget)) {
        return NextResponse.json({ error: "Access outside authorized workspace is prohibited" }, { status: 403 });
      }

      // Evaluate Policy for code mutation
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
          userRole: ctx.principal.roles.includes("admin") ? "admin" : "analyst",
          actionRisk: 0.5,
          dataSensitivityRisk: 0.1,
          deviceTrust: 1.0,
        },
      };

      const policy = evaluatePolicy(signal);
      if (policy.decision === "DENY") {
        return NextResponse.json(
          {
            status: "POLICY_DENIED",
            error: "Autonomous code modification denied by constitutional policy.",
            reasons: policy.reasons,
          },
          { status: 403 }
        );
      }

      // Check if required execution parameters are present
      if (!reproCmd || !testCmd || !badToken || !fixedToken) {
        return NextResponse.json(
          {
            status: "INCOMPLETE_PARAMETERS",
            error: "Genuine self-healing requires reproCmd, testCmd, badToken, and fixedToken to execute verification.",
          },
          { status: 400 }
        );
      }

      // Locate the self-healing engine
      const candidates = [
        path.resolve(process.cwd(), "..", "packages", "autonomous", "self_healing_engine.py"),
        path.resolve(process.cwd(), "packages", "autonomous", "self_healing_engine.py"),
      ];
      const engineScript = candidates.find((p) => fs.existsSync(p));
      if (!engineScript) {
        return NextResponse.json({ error: "SelfHealingEngine script not found on host" }, { status: 500 });
      }

      // Resolve target path relative to repository root
      const repoRoot = path.dirname(path.dirname(engineScript));
      const targetAbsPath = path.resolve(repoRoot, normalizedTarget);

      if (!fs.existsSync(targetAbsPath)) {
        return NextResponse.json({ error: `Target file not found: ${normalizedTarget}` }, { status: 404 });
      }

      // Execute genuine self-healing process
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
        throw new Error(`Self-healing process execution failed: ${proc.error.message}`);
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

      // Record self-healing event in Evidence Ledger (do not swallow errors)
      let evidenceId: string | undefined;
      let evidenceError: string | undefined;
      try {
        const ev = await appendEvidenceEvent({
          missionId: signal.missionId || `heal-${Date.now()}`,
          actor: ctx.principal.email || "autonomous-engineer@disha.gov",
          action: "autonomous_self_heal",
          input: { targetFile: normalizedTarget, failureDesc },
          output: trace,
          policyDecision: policy,
        });
        evidenceId = ev?.eventId;
      } catch (err: any) {
        console.error(`[self-heal] Failed recording evidence event: ${err?.message}`);
        evidenceError = err?.message;
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

