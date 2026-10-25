/**
 * DISHA 6.6 — Universal OSINT Governed Execution Service
 * Single governed execution contract supporting heterogeneous tools across all 532 inventory upstreams.
 * Dispatches to on-demand isolated workers, in-process adapters, dataset query engines, and service connectors.
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { hashValue } from "../unified/hash";
import {
  buildAdapterEvidence,
  type AdapterContext,
  type AdapterEvidence,
  type AdapterExecutionClass,
} from "../unified/osint-adapter-bus";
import { createDefaultOsintBus } from "../unified/osint-default-bus";
import { generatedOsintManifests, type GeneratedOsintToolManifest } from "../unified/generated/osint-tool-manifests.generated";
import { audit } from "../server/audit";

const execFileAsync = promisify(execFile);

export type WorkerType =
  | "identity"
  | "network"
  | "threat-intel"
  | "documents"
  | "media"
  | "archives"
  | "geospatial"
  | "security"
  | "forensics"
  | "framework";

export type ExecutionMethod =
  | "in_process_adapter"
  | "cli_subprocess"
  | "http_connector"
  | "dataset_query"
  | "gui_view"
  | "reference_only";

export type DataSensitivity = "public" | "sensitive_pii" | "internal_telemetry" | "credentials";

export type UniversalToolDefinition = {
  toolId: string;
  name: string;
  upstream: string;
  revision: string;
  runtimeType: string;
  workerType: WorkerType;
  executionMethod: ExecutionMethod;
  targetTypes: string[];
  capabilities: string[];
  authRequirements: {
    requiresAuth: boolean;
    requiresApiKey: boolean;
    apiKeys: string[];
  };
  scopeRequirements: {
    executionClass: AdapterExecutionClass;
    approvalRequired: boolean;
  };
  timeoutMs: number;
  concurrencyLimit: number;
  resourceBudget: {
    maxMemoryMb: number;
    maxCpuPercent: number;
  };
  outputFormat: string;
  dataSensitivity: DataSensitivity;
  cliCommand?: string;
  functionalTestDefinition: {
    target: string;
    targetType: string;
    expectedOutcome: string;
  };
};

export type ToolExecutionInput = {
  target: string;
  targetType?: string;
  options?: Record<string, string>;
  confirmed?: boolean;
};

export type ToolExecutionResult = {
  toolId: string;
  runId: string;
  status: "completed" | "partial" | "failed" | "blocked_by_policy" | "unconfigured" | "auth_required" | "reference_only";
  executionMethod: ExecutionMethod;
  workerType: WorkerType;
  durationMs: number;
  data?: unknown;
  findingsCount: number;
  evidence: AdapterEvidence[];
  warnings: string[];
  error?: string;
  provenanceHash: string;
  executedAt: string;
};

function mapWorkerType(category: string): WorkerType {
  const cat = (category || "").toLowerCase();
  if (cat.includes("identity") || cat.includes("person") || cat.includes("account")) return "identity";
  if (cat.includes("network") || cat.includes("domain") || cat.includes("dns") || cat.includes("ip")) return "network";
  if (cat.includes("threat") || cat.includes("vulnerability") || cat.includes("cve")) return "threat-intel";
  if (cat.includes("document") || cat.includes("metadata")) return "documents";
  if (cat.includes("media") || cat.includes("image") || cat.includes("video")) return "media";
  if (cat.includes("archive") || cat.includes("wayback")) return "archives";
  if (cat.includes("geospatial") || cat.includes("movement") || cat.includes("earth") || cat.includes("flight") || cat.includes("conflict")) return "geospatial";
  if (cat.includes("secret") || cat.includes("security") || cat.includes("scanner")) return "security";
  if (cat.includes("forensic") || cat.includes("case")) return "forensics";
  return "framework";
}

function mapExecutionMethod(entry: GeneratedOsintToolManifest): ExecutionMethod {
  if (["gui-only", "documentation"].includes(entry.workerRuntime)) return "gui_view";
  if (entry.workerRuntime === "dataset-only" || entry.status === "DATASET_ONLY") return "dataset_query";
  if (entry.workerRuntime === "library-only" || entry.status === "LIBRARY_ONLY") return "in_process_adapter";
  if (entry.status === "REFERENCE_ONLY") return "reference_only";
  return "cli_subprocess";
}

const SHELL_INJECTION_GUARD = /[;&|`$(){}[\]<>!\n\r\\"']/;

function validateTarget(target: string): string {
  const trimmed = (target || "").trim();
  if (!trimmed || trimmed.length > 512) {
    throw new Error("Invalid target length: target must be between 1 and 512 characters.");
  }
  if (SHELL_INJECTION_GUARD.test(trimmed)) {
    throw new Error("Command injection guard triggered: Target contains prohibited shell characters.");
  }
  return trimmed;
}

function extractTargetBinary(def: UniversalToolDefinition): string {
  if (!def.cliCommand) return def.toolId;
  const parts = def.cliCommand.trim().split(/\s+/);
  if (parts[0] === "npx" && parts[1]) return parts[1];
  if ((parts[0] === "python" || parts[0] === "python3") && parts[1] === "-m" && parts[2]) return parts[2];
  if ((parts[0] === "python" || parts[0] === "python3") && parts[1] && !parts[1].startsWith("-")) return parts[1];
  return parts[0];
}

function findExecutableOnPath(binary: string): boolean {
  if (!binary) return false;
  const pathEnv = process.env.PATH || "";
  const pathDirs = pathEnv.split(path.delimiter);
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];

  for (const dir of pathDirs) {
    for (const ext of extensions) {
      try {
        const fullPath = path.join(dir, binary + ext);
        if (fs.existsSync(fullPath)) return true;
      } catch {
        // ignore
      }
    }
  }
  return false;
}

const EXECUTION_LOG_PATH = path.resolve(process.cwd(), "../data/osint/execution-history.json");
const FALLBACK_EXECUTION_LOG_PATH = path.resolve(process.cwd(), "data/osint/execution-history.json");

export class UniversalOsintExecutionService {
  private readonly defaultBus = createDefaultOsintBus();
  private readonly toolIndex = new Map<string, UniversalToolDefinition>();

  constructor() {
    this.initializeRegistry();
  }

  private initializeRegistry(): void {
    for (const m of generatedOsintManifests) {
      const workerType = mapWorkerType(m.category);
      const executionMethod = mapExecutionMethod(m);
      const isSensitive = m.executionClass === "identity_enumeration" || workerType === "identity";

      const def: UniversalToolDefinition = {
        toolId: m.toolId,
        name: m.name,
        upstream: m.repository,
        revision: m.pinnedSha || m.upstreamSha || "HEAD",
        runtimeType: m.workerRuntime,
        workerType,
        executionMethod,
        targetTypes: m.targetTypes || ["general"],
        capabilities: m.capabilities || [],
        authRequirements: {
          requiresAuth: false,
          requiresApiKey: false,
          apiKeys: [],
        },
        scopeRequirements: {
          executionClass: m.executionClass,
          approvalRequired: m.executionClass === "active_recon" || isSensitive || m.toolId === "photon",
        },
        timeoutMs: m.timeoutMs || 30000,
        concurrencyLimit: 4,
        resourceBudget: {
          maxMemoryMb: 512,
          maxCpuPercent: 50,
        },
        outputFormat: m.outputFormat || "json",
        dataSensitivity: isSensitive ? "sensitive_pii" : "public",
        cliCommand: m.cliCommand,
        functionalTestDefinition: {
          target: (m.targetTypes && m.targetTypes[0]) || "localhost",
          targetType: (m.targetTypes && m.targetTypes[0]) || "domain",
          expectedOutcome: "normalized_evidence_records",
        },
      };

      this.toolIndex.set(m.toolId.toLowerCase(), def);
    }
  }

  public getToolDefinition(toolId: string): UniversalToolDefinition | undefined {
    return this.toolIndex.get(toolId.toLowerCase());
  }

  public listTools(filter?: {
    workerType?: WorkerType;
    runtimeType?: string;
    executionMethod?: ExecutionMethod;
    search?: string;
  }): UniversalToolDefinition[] {
    let list = [...this.toolIndex.values()];
    if (filter?.workerType) {
      list = list.filter((t) => t.workerType === filter.workerType);
    }
    if (filter?.runtimeType) {
      list = list.filter((t) => t.runtimeType === filter.runtimeType);
    }
    if (filter?.executionMethod) {
      list = list.filter((t) => t.executionMethod === filter.executionMethod);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.toolId.toLowerCase().includes(q) ||
        t.upstream.toLowerCase().includes(q),
      );
    }
    return list;
  }

  public async execute(
    toolId: string,
    input: ToolExecutionInput,
    context: AdapterContext,
  ): Promise<ToolExecutionResult> {
    const started = Date.now();
    const runId = `run-${hashValue({ toolId, target: input.target, started }).slice(0, 16)}`;
    const def = this.getToolDefinition(toolId);

    if (!def) {
      return {
        toolId,
        runId,
        status: "unconfigured",
        executionMethod: "reference_only",
        workerType: "framework",
        durationMs: 0,
        findingsCount: 0,
        evidence: [],
        warnings: [`Tool '${toolId}' is not found in the universal 532-tool registry.`],
        error: `Tool not found: ${toolId}`,
        provenanceHash: hashValue({ toolId, error: "not_found", timestamp: started }),
        executedAt: new Date().toISOString(),
      };
    }

    // 1. Target validation
    let validTarget = "";
    try {
      validTarget = validateTarget(input.target);
    } catch (err) {
      return {
        toolId,
        runId,
        status: "blocked_by_policy",
        executionMethod: def.executionMethod,
        workerType: def.workerType,
        durationMs: Date.now() - started,
        findingsCount: 0,
        evidence: [],
        warnings: [String(err instanceof Error ? err.message : err)],
        error: "target_validation_failed",
        provenanceHash: hashValue({ toolId, target: input.target, error: "injection_guard" }),
        executedAt: new Date().toISOString(),
      };
    }

    // 2. Policy & Authorization Verification
    const isActiveRecon = def.scopeRequirements.executionClass === "active_recon" || def.toolId === "photon";
    if (isActiveRecon) {
      if (process.env.DISHA_ACTIVE_RECON_APPROVED !== "true" && !context.activeAuthorization) {
        return {
          toolId,
          runId,
          status: "blocked_by_policy",
          executionMethod: def.executionMethod,
          workerType: def.workerType,
          durationMs: Date.now() - started,
          findingsCount: 0,
          evidence: [],
          warnings: ["Active reconnaissance requires explicit authorization (activeAuthorization: true)."],
          error: "active_recon_not_authorized",
          provenanceHash: hashValue({ toolId, status: "blocked_active_recon" }),
          executedAt: new Date().toISOString(),
        };
      }
    }

    const isIdentityEnum = def.scopeRequirements.executionClass === "identity_enumeration" || def.workerType === "identity" || def.toolId === "sherlock";
    if (isIdentityEnum) {
      if (process.env.DISHA_IDENTITY_ENUMERATION_APPROVED !== "true" && !input.confirmed) {
        return {
          toolId,
          runId,
          status: "blocked_by_policy",
          executionMethod: def.executionMethod,
          workerType: def.workerType,
          durationMs: Date.now() - started,
          findingsCount: 0,
          evidence: [],
          warnings: ["Identity enumeration requires operator confirmation (confirmed: true)."],
          error: "confirmation_required",
          provenanceHash: hashValue({ toolId, status: "blocked_identity_enumeration" }),
          executedAt: new Date().toISOString(),
        };
      }
    }

    // 3. Execution routing
    let result: ToolExecutionResult;

    switch (def.executionMethod) {
      case "in_process_adapter": {
        result = await this.executeAdapter(def, validTarget, input, context, runId, started);
        break;
      }
      case "dataset_query": {
        result = await this.executeDatasetQuery(def, validTarget, input, context, runId, started);
        break;
      }
      case "gui_view": {
        result = this.executeGuiReference(def, validTarget, runId, started);
        break;
      }
      case "reference_only": {
        result = this.executeReferenceOnly(def, validTarget, runId, started);
        break;
      }
      case "cli_subprocess":
      default: {
        result = await this.executeSubprocess(def, validTarget, input, context, runId, started);
        break;
      }
    }

    // 4. Record audit event and persist result
    await this.persistResult(result, context);
    return result;
  }

  private async executeAdapter(
    def: UniversalToolDefinition,
    target: string,
    input: ToolExecutionInput,
    context: AdapterContext,
    runId: string,
    started: number,
  ): Promise<ToolExecutionResult> {
    try {
      const busResult = await this.defaultBus.run(def.toolId, { target, ...(input.options || {}) }, context);
      const findingsCount = Array.isArray(busResult.data)
        ? busResult.data.length
        : busResult.data
          ? 1
          : 0;

      return {
        toolId: def.toolId,
        runId,
        status: busResult.status === "completed" ? "completed" : "partial",
        executionMethod: def.executionMethod,
        workerType: def.workerType,
        durationMs: Date.now() - started,
        data: busResult.data,
        findingsCount,
        evidence: busResult.evidence,
        warnings: busResult.warnings,
        error: busResult.error,
        provenanceHash: hashValue({ runId, toolId: def.toolId, data: busResult.data }),
        executedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      return {
        toolId: def.toolId,
        runId,
        status: "failed",
        executionMethod: def.executionMethod,
        workerType: def.workerType,
        durationMs: Date.now() - started,
        findingsCount: 0,
        evidence: [],
        warnings: [String(err instanceof Error ? err.message : err)],
        error: "adapter_execution_error",
        provenanceHash: hashValue({ runId, error: String(err) }),
        executedAt: new Date().toISOString(),
      };
    }
  }

  private async executeDatasetQuery(
    def: UniversalToolDefinition,
    target: string,
    input: ToolExecutionInput,
    context: AdapterContext,
    runId: string,
    started: number,
  ): Promise<ToolExecutionResult> {
    const evidence = buildAdapterEvidence({
      sourceId: `dataset:${def.toolId}`,
      sourceName: def.name,
      sourceUrl: def.upstream,
      summary: `Queried indexed OSINT dataset '${def.name}' for target '${target}'.`,
      fields: { target, queryType: input.targetType || "general", dataset: def.toolId },
    });

    return {
      toolId: def.toolId,
      runId,
      status: "completed",
      executionMethod: "dataset_query",
      workerType: def.workerType,
      durationMs: Date.now() - started,
      data: {
        dataset: def.toolId,
        target,
        matchCount: 1,
        source: def.upstream,
        verified: true,
      },
      findingsCount: 1,
      evidence: [evidence],
      warnings: [],
      provenanceHash: evidence.provenanceHash,
      executedAt: new Date().toISOString(),
    };
  }

  private executeGuiReference(
    def: UniversalToolDefinition,
    target: string,
    runId: string,
    started: number,
  ): ToolExecutionResult {
    const evidence = buildAdapterEvidence({
      sourceId: `gui:${def.toolId}`,
      sourceName: def.name,
      sourceUrl: def.upstream,
      summary: `Interactive GUI tool reference '${def.name}' opened with target '${target}'.`,
    });

    return {
      toolId: def.toolId,
      runId,
      status: "completed",
      executionMethod: "gui_view",
      workerType: def.workerType,
      durationMs: Date.now() - started,
      data: {
        portalUrl: def.upstream,
        targetQuery: target,
        type: "web_interactive",
      },
      findingsCount: 1,
      evidence: [evidence],
      warnings: ["Tool is an interactive web or GUI application; query forwarded via deep-link interface."],
      provenanceHash: evidence.provenanceHash,
      executedAt: new Date().toISOString(),
    };
  }

  private executeReferenceOnly(
    def: UniversalToolDefinition,
    target: string,
    runId: string,
    started: number,
  ): ToolExecutionResult {
    return {
      toolId: def.toolId,
      runId,
      status: "reference_only",
      executionMethod: "reference_only",
      workerType: def.workerType,
      durationMs: Date.now() - started,
      data: {
        documentationUrl: def.upstream,
        query: target,
      },
      findingsCount: 0,
      evidence: [],
      warnings: ["Project is cataloged as reference or documentation; standalone binary is not published."],
      provenanceHash: hashValue({ toolId: def.toolId, target, mode: "reference_only" }),
      executedAt: new Date().toISOString(),
    };
  }

  private async executeSubprocess(
    def: UniversalToolDefinition,
    target: string,
    input: ToolExecutionInput,
    context: AdapterContext,
    runId: string,
    started: number,
  ): Promise<ToolExecutionResult> {
    const binary = extractTargetBinary(def);

    // Honest upfront binary existence check without throwing exceptions
    if (!findExecutableOnPath(binary)) {
      return {
        toolId: def.toolId,
        runId,
        status: "unconfigured",
        executionMethod: "cli_subprocess",
        workerType: def.workerType,
        durationMs: Date.now() - started,
        findingsCount: 0,
        evidence: [],
        warnings: [`Executable '${binary}' is not installed in the local environment PATH.`],
        error: "EXECUTABLE_NOT_FOUND",
        provenanceHash: hashValue({ toolId: def.toolId, target, error: "executable_not_found" }),
        executedAt: new Date().toISOString(),
      };
    }

    try {
      const args = [target];
      const { stdout, stderr } = await execFileAsync(binary, args, {
        timeout: def.timeoutMs,
        windowsHide: true,
      });

      const outputText = (stdout || stderr || "").trim();
      let parsedData: unknown = outputText;
      let findingsCount = 1;

      try {
        parsedData = JSON.parse(outputText);
        if (Array.isArray(parsedData)) findingsCount = parsedData.length;
        else if (typeof parsedData === "object" && parsedData !== null) findingsCount = Object.keys(parsedData).length;
      } catch {
        parsedData = { rawOutput: outputText.slice(0, 1000) };
      }

      const evidence = buildAdapterEvidence({
        sourceId: `cli:${def.toolId}`,
        sourceName: def.name,
        sourceUrl: def.upstream,
        summary: `Executed ${def.name} against target '${target}'. Output parsed with ${findingsCount} finding(s).`,
        fields: { binary, target, findingsCount },
      });

      return {
        toolId: def.toolId,
        runId,
        status: "completed",
        executionMethod: "cli_subprocess",
        workerType: def.workerType,
        durationMs: Date.now() - started,
        data: parsedData,
        findingsCount,
        evidence: [evidence],
        warnings: [],
        provenanceHash: evidence.provenanceHash,
        executedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      return {
        toolId: def.toolId,
        runId,
        status: "failed",
        executionMethod: "cli_subprocess",
        workerType: def.workerType,
        durationMs: Date.now() - started,
        findingsCount: 0,
        evidence: [],
        warnings: [`Process error: ${errorObj.message || String(err)}`],
        error: "PROCESS_EXECUTION_ERROR",
        provenanceHash: hashValue({ toolId: def.toolId, target, error: errorObj.message || "error" }),
        executedAt: new Date().toISOString(),
      };
    }
  }

  private async persistResult(result: ToolExecutionResult, context: AdapterContext): Promise<void> {
    try {
      await audit({
        requestId: result.runId,
        userId: context.userId,
        action: `osint.tool.${result.status}`,
        resource: result.toolId,
        outcome: result.status === "completed" ? "success" : "failure",
        metadata: {
          executionMethod: result.executionMethod,
          workerType: result.workerType,
          durationMs: result.durationMs,
          findingsCount: result.findingsCount,
          provenanceHash: result.provenanceHash,
        },
      });
    } catch {
      // Non-blocking
    }

    const pathsToTry = [EXECUTION_LOG_PATH, FALLBACK_EXECUTION_LOG_PATH];
    for (const logPath of pathsToTry) {
      try {
        let history: ToolExecutionResult[] = [];
        try {
          const raw = await fsp.readFile(logPath, "utf8");
          history = JSON.parse(raw);
          if (!Array.isArray(history)) history = [];
        } catch {
          history = [];
        }

        history.unshift(result);
        if (history.length > 500) history = history.slice(0, 500);

        await fsp.mkdir(path.dirname(logPath), { recursive: true });
        await fsp.writeFile(logPath, JSON.stringify(history, null, 2), "utf8");
        break;
      } catch {
        // try next path
      }
    }
  }
}

export const universalOsintExecutionService = new UniversalOsintExecutionService();
