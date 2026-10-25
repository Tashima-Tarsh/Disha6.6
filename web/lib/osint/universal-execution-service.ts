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
import { DatasetsService } from "../unified/datasets-service";

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

export type ToolStandardStatus =
  | "COMPLETED_WITH_FINDINGS"
  | "COMPLETED_NO_FINDINGS"
  | "PARTIAL"
  | "FAILED"
  | "TIMEOUT"
  | "AUTH_REQUIRED"
  | "NOT_INSTALLED"
  | "BLOCKED_BY_POLICY"
  | "UPSTREAM_UNAVAILABLE";

export type ToolExecutionStatus =
  | "completed"
  | "partial"
  | "failed"
  | "blocked_by_policy"
  | "unconfigured"
  | "auth_required"
  | "reference_only"
  | ToolStandardStatus;

export type ToolExecutionResult = {
  toolId: string;
  runId: string;
  status: ToolExecutionStatus;
  standardStatus: ToolStandardStatus;
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

export interface ToolExecutionRecipe {
  executable: string;
  buildArgs: (target: string, options?: Record<string, string>) => string[];
  supportedInputTypes: string[];
  parseOutput: (stdout: string, stderr: string, target: string) => {
    findingsCount: number;
    parsedData: unknown;
    warnings: string[];
  };
}

export const TOOL_RECIPES: Record<string, ToolExecutionRecipe> = {
  subfinder: {
    executable: "subfinder",
    buildArgs: (target) => ["-d", target, "-silent", "-json"],
    supportedInputTypes: ["domain"],
    parseOutput: (stdout) => {
      const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const subdomains = new Set<string>();
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.host) subdomains.add(parsed.host);
        } catch {
          if (line.includes(".")) subdomains.add(line);
        }
      }
      return {
        findingsCount: subdomains.size,
        parsedData: { subdomains: Array.from(subdomains) },
        warnings: [],
      };
    },
  },
  amass: {
    executable: "amass",
    buildArgs: (target) => ["enum", "-passive", "-d", target, "-json", "-"],
    supportedInputTypes: ["domain"],
    parseOutput: (stdout) => {
      const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const names = new Set<string>();
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.name) names.add(parsed.name);
        } catch {
          if (line.includes(".")) names.add(line);
        }
      }
      return {
        findingsCount: names.size,
        parsedData: { discoveredDomains: Array.from(names) },
        warnings: [],
      };
    },
  },
  sherlock: {
    executable: "sherlock",
    buildArgs: (target) => [target, "--print-found", "--timeout", "10", "--json", "-"],
    supportedInputTypes: ["username"],
    parseOutput: (stdout) => {
      try {
        const parsed = JSON.parse(stdout);
        const keys = Object.keys(parsed);
        return {
          findingsCount: keys.length,
          parsedData: parsed,
          warnings: [],
        };
      } catch {
        const found = stdout
          .split(/\r?\n/)
          .filter((l) => l.includes("http://") || l.includes("https://"));
        return {
          findingsCount: found.length,
          parsedData: { profiles: found },
          warnings: [],
        };
      }
    },
  },
  maigret: {
    executable: "maigret",
    buildArgs: (target) => [target, "--json", "simple", "--timeout", "10"],
    supportedInputTypes: ["username"],
    parseOutput: (stdout) => {
      try {
        const parsed = JSON.parse(stdout);
        const count = Array.isArray(parsed)
          ? parsed.length
          : typeof parsed === "object" && parsed !== null
            ? Object.keys(parsed).length
            : 0;
        return {
          findingsCount: count,
          parsedData: parsed,
          warnings: [],
        };
      } catch {
        const found = stdout
          .split(/\r?\n/)
          .filter((l) => l.includes("[+]") || l.includes("http"));
        return {
          findingsCount: found.length,
          parsedData: { matches: found },
          warnings: [],
        };
      }
    },
  },
  holehe: {
    executable: "holehe",
    buildArgs: (target) => [target, "--only-used", "--no-color"],
    supportedInputTypes: ["email"],
    parseOutput: (stdout) => {
      const found = stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.startsWith("[+]"));
      return {
        findingsCount: found.length,
        parsedData: { registeredSites: found.map((l) => l.replace(/^\[\+\]\s*/, "").trim()) },
        warnings: [],
      };
    },
  },
  phoneinfoga: {
    executable: "phoneinfoga",
    buildArgs: (target) => ["scan", "-n", target, "-o", "json"],
    supportedInputTypes: ["phone"],
    parseOutput: (stdout) => {
      try {
        const parsed = JSON.parse(stdout);
        const valid = parsed?.valid === true || (parsed?.numverify && parsed.numverify.valid);
        return {
          findingsCount: valid ? 1 : 0,
          parsedData: parsed,
          warnings: [],
        };
      } catch {
        return {
          findingsCount: stdout.toLowerCase().includes("valid: true") ? 1 : 0,
          parsedData: { raw: stdout },
          warnings: [],
        };
      }
    },
  },
  theharvester: {
    executable: "theHarvester",
    buildArgs: (target) => ["-d", target, "-b", "all"],
    supportedInputTypes: ["domain"],
    parseOutput: (stdout) => {
      const emails = stdout.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const hosts = stdout.match(/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/g) || [];
      const unique = Array.from(new Set([...emails, ...hosts]));
      return {
        findingsCount: unique.length,
        parsedData: { harvestedItems: unique },
        warnings: [],
      };
    },
  },
  spiderfoot: {
    executable: "sf",
    buildArgs: (target) => ["-s", target, "-u", "public", "-q"],
    supportedInputTypes: ["domain", "ip", "email", "username"],
    parseOutput: (stdout) => {
      const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
      return {
        findingsCount: lines.length,
        parsedData: { alerts: lines.slice(0, 100) },
        warnings: [],
      };
    },
  },
  photon: {
    executable: "photon",
    buildArgs: (target) => ["-u", target.startsWith("http") ? target : `https://${target}`, "--dns", "--wayback"],
    supportedInputTypes: ["url", "domain"],
    parseOutput: (stdout) => {
      const endpoints = stdout.match(/https?:\/\/[^\s"'<>]+/g) || [];
      const unique = Array.from(new Set(endpoints));
      return {
        findingsCount: unique.length,
        parsedData: { discoveredEndpoints: unique },
        warnings: [],
      };
    },
  },
  nuclei: {
    executable: "nuclei",
    buildArgs: (target) => ["-u", target, "-silent", "-jsonl"],
    supportedInputTypes: ["domain", "url", "ip"],
    parseOutput: (stdout) => {
      const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const findings: unknown[] = [];
      for (const line of lines) {
        try {
          findings.push(JSON.parse(line));
        } catch {
          // ignore
        }
      }
      return {
        findingsCount: findings.length,
        parsedData: { vulnerabilities: findings },
        warnings: [],
      };
    },
  },
};

function parseGenericOutput(
  stdout: string,
  stderr: string
): { findingsCount: number; parsedData: unknown; warnings: string[] } {
  const text = (stdout || stderr || "").trim();
  if (!text) {
    return { findingsCount: 0, parsedData: { rawOutput: "" }, warnings: [] };
  }

  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) {
      return { findingsCount: json.length, parsedData: json, warnings: [] };
    }
    if (typeof json === "object" && json !== null) {
      const count = Object.keys(json).length;
      return { findingsCount: count, parsedData: json, warnings: [] };
    }
    return { findingsCount: 1, parsedData: json, warnings: [] };
  } catch {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(
        (l) =>
          l.length > 0 &&
          !l.startsWith("---") &&
          !l.startsWith("===") &&
          !l.toLowerCase().includes("copyright")
      );

    return {
      findingsCount: lines.length,
      parsedData: { rawOutput: text.slice(0, 2000), lineCount: lines.length },
      warnings: [],
    };
  }
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
        standardStatus: "NOT_INSTALLED",
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
        standardStatus: "BLOCKED_BY_POLICY",
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
          standardStatus: "BLOCKED_BY_POLICY",
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
          standardStatus: "BLOCKED_BY_POLICY",
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

      const standardStatus: ToolStandardStatus =
        busResult.status === "completed"
          ? findingsCount > 0
            ? "COMPLETED_WITH_FINDINGS"
            : "COMPLETED_NO_FINDINGS"
          : "PARTIAL";

      return {
        toolId: def.toolId,
        runId,
        status: busResult.status === "completed" ? "completed" : "partial",
        standardStatus,
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
        standardStatus: "FAILED",
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
    const candidateDirs = [
      path.resolve(process.cwd(), "data/datasets", def.toolId),
      path.resolve(process.cwd(), "../data/datasets", def.toolId),
      path.resolve(process.cwd(), "web/data/datasets", def.toolId),
      path.resolve(process.cwd(), "data/datasets", def.name.replace(/[^a-zA-Z0-9_-]/g, "_")),
      path.resolve(process.cwd(), "web/data/datasets", def.name.replace(/[^a-zA-Z0-9_-]/g, "_")),
    ];

    const matchedDir = candidateDirs.find((d) => fs.existsSync(d) && fs.statSync(d).isDirectory());

    const ds = DatasetsService.getInstance();
    const manifest = ds.listDatasets();
    const hasCategoryMatch = manifest.some((m) =>
      m.category.toLowerCase().includes(def.toolId.toLowerCase()) ||
      def.toolId.toLowerCase().includes(m.category.toLowerCase())
    );

    if (!matchedDir && !hasCategoryMatch) {
      return {
        toolId: def.toolId,
        runId,
        status: "unconfigured",
        standardStatus: "NOT_INSTALLED",
        executionMethod: "dataset_query",
        workerType: def.workerType,
        durationMs: Date.now() - started,
        data: {
          dataset: def.toolId,
          target,
          matchCount: 0,
          matches: [],
          provisioned: false,
          upstreamUrl: def.upstream,
        },
        findingsCount: 0,
        evidence: [],
        warnings: [
          `Dataset '${def.name}' (${def.toolId}) is not provisioned locally. Download or clone data into data/datasets/${def.toolId}/ from ${def.upstream}.`,
        ],
        error: "DATASET_NOT_PROVISIONED",
        provenanceHash: hashValue({ toolId: def.toolId, target, status: "unconfigured" }),
        executedAt: new Date().toISOString(),
      };
    }

    const matches: Array<Record<string, unknown>> = [];
    const query = target.toLowerCase().trim();

    if (matchedDir) {
      const files = fs.readdirSync(matchedDir, { withFileTypes: true });
      for (const file of files) {
        if (!file.isFile()) continue;
        const filePath = path.join(matchedDir, file.name);
        try {
          if (file.name.endsWith(".json")) {
            const raw = fs.readFileSync(filePath, "utf-8");
            const parsed = JSON.parse(raw);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of items) {
              const str = JSON.stringify(item).toLowerCase();
              if (str.includes(query)) {
                matches.push({ file: file.name, ...item });
              }
            }
          } else if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
            const raw = fs.readFileSync(filePath, "utf-8");
            const lines = raw.split(/\r?\n/).filter(Boolean);
            if (lines.length > 0) {
              const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
              for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (line.toLowerCase().includes(query)) {
                  const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
                  const row: Record<string, string> = { file: file.name };
                  headers.forEach((h, idx) => {
                    row[h] = cols[idx] || "";
                  });
                  matches.push(row);
                }
              }
            }
          }
        } catch {
          // ignore corrupted individual file
        }
      }
    }

    if (hasCategoryMatch || matches.length === 0) {
      const searchHits = ds.searchDatasets(target, 20);
      const relevantHits = searchHits.filter((h) =>
        hasCategoryMatch
          ? h.category.toLowerCase().includes(def.toolId.toLowerCase()) ||
            def.toolId.toLowerCase().includes(h.category.toLowerCase())
          : true
      );
      for (const hit of relevantHits) {
        matches.push({
          sourceCategory: hit.category,
          sourceFile: hit.sourceFile,
          relevance: hit.relevanceScore,
          ...hit.data,
        });
      }
    }

    const evidenceList: AdapterEvidence[] = [];
    for (const match of matches.slice(0, 10)) {
      const summary = `Found record in ${def.name}: ${JSON.stringify(match).slice(0, 200)}`;
      evidenceList.push(
        buildAdapterEvidence({
          sourceId: `dataset:${def.toolId}`,
          sourceName: def.name,
          sourceUrl: def.upstream,
          summary,
          fields: match as Record<string, unknown>,
        })
      );
    }

    const provenance = evidenceList.length > 0
      ? evidenceList[0].provenanceHash
      : hashValue({ toolId: def.toolId, target, matchCount: matches.length });

    const standardStatus: ToolStandardStatus =
      matches.length > 0 ? "COMPLETED_WITH_FINDINGS" : "COMPLETED_NO_FINDINGS";

    return {
      toolId: def.toolId,
      runId,
      status: "completed",
      standardStatus,
      executionMethod: "dataset_query",
      workerType: def.workerType,
      durationMs: Date.now() - started,
      data: {
        dataset: def.toolId,
        target,
        matchCount: matches.length,
        matches: matches.slice(0, 50),
        source: def.upstream,
        verified: matches.length > 0,
      },
      findingsCount: matches.length,
      evidence: evidenceList,
      warnings: matches.length === 0
        ? [`Query against dataset '${def.name}' returned 0 matching records for '${target}'.`]
        : [],
      provenanceHash: provenance,
      executedAt: new Date().toISOString(),
    };
  }

  private executeGuiReference(
    def: UniversalToolDefinition,
    target: string,
    runId: string,
    started: number,
  ): ToolExecutionResult {
    return {
      toolId: def.toolId,
      runId,
      status: "reference_only",
      standardStatus: "COMPLETED_NO_FINDINGS",
      executionMethod: "gui_view",
      workerType: def.workerType,
      durationMs: Date.now() - started,
      data: {
        mode: "interactive_gui_reference",
        portalUrl: def.upstream,
        targetQuery: target,
        type: "web_interactive",
        instructions: `Interactive GUI tool '${def.name}' cannot be executed headlessly in background mode. Open ${def.upstream} manually to interact with the application.`,
      },
      findingsCount: 0,
      evidence: [],
      warnings: [
        `Tool '${def.name}' is an interactive desktop/web GUI application. Background automated execution was not attempted.`,
      ],
      provenanceHash: hashValue({ toolId: def.toolId, target, mode: "gui_reference" }),
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
      standardStatus: "COMPLETED_NO_FINDINGS",
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
    const recipe = TOOL_RECIPES[def.toolId.toLowerCase()];
    const binary = recipe ? recipe.executable : extractTargetBinary(def);

    // Honest upfront binary existence check without throwing exceptions
    if (!findExecutableOnPath(binary)) {
      return {
        toolId: def.toolId,
        runId,
        status: "unconfigured",
        standardStatus: "NOT_INSTALLED",
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
      const args = recipe ? recipe.buildArgs(target, input.options) : [target];
      const { stdout, stderr } = await execFileAsync(binary, args, {
        timeout: def.timeoutMs,
        windowsHide: true,
      });

      const parsed = recipe
        ? recipe.parseOutput(stdout, stderr, target)
        : parseGenericOutput(stdout, stderr);

      const findingsCount = parsed.findingsCount;
      const evidenceList: AdapterEvidence[] = [];

      if (findingsCount > 0) {
        evidenceList.push(
          buildAdapterEvidence({
            sourceId: `cli:${def.toolId}`,
            sourceName: def.name,
            sourceUrl: def.upstream,
            summary: `Executed ${def.name} against target '${target}'. Output parsed with ${findingsCount} finding(s).`,
            fields: { binary, target, findingsCount },
          })
        );
      }

      const standardStatus: ToolStandardStatus =
        findingsCount > 0 ? "COMPLETED_WITH_FINDINGS" : "COMPLETED_NO_FINDINGS";

      return {
        toolId: def.toolId,
        runId,
        status: "completed",
        standardStatus,
        executionMethod: "cli_subprocess",
        workerType: def.workerType,
        durationMs: Date.now() - started,
        data: parsed.parsedData,
        findingsCount,
        evidence: evidenceList,
        warnings: parsed.warnings,
        provenanceHash: evidenceList.length > 0
          ? evidenceList[0].provenanceHash
          : hashValue({ toolId: def.toolId, target, findingsCount: 0 }),
        executedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string; killed?: boolean };
      const isTimeout = errorObj.killed === true || errorObj.code === "ETIMEDOUT";

      return {
        toolId: def.toolId,
        runId,
        status: "failed",
        standardStatus: isTimeout ? "TIMEOUT" : "FAILED",
        executionMethod: "cli_subprocess",
        workerType: def.workerType,
        durationMs: Date.now() - started,
        findingsCount: 0,
        evidence: [],
        warnings: [`Process error: ${errorObj.message || String(err)}`],
        error: isTimeout ? "TIMEOUT" : "PROCESS_EXECUTION_ERROR",
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
