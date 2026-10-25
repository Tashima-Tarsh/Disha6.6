import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { appendEvidenceEvent } from "@/lib/unified/evidence-ledger";
import { evaluatePolicy } from "@/lib/unified/policy-gate";
import type { DishaSignal } from "@/lib/unified/contracts";
import type { Principal } from "@/lib/server/types";
import { verifyAuthorizationGrant } from "@/lib/server/authorization-grants";
import skillsData from "@/data/skills/skills-index.json";
import rolesData from "@/data/skills/roles-index.json";

export type ExpertRole = {
  id: string;
  name: string;
  role: string;
  description: string;
  path: string;
  tokenEstimate: number;
};

const allRoles: ExpertRole[] = rolesData as ExpertRole[];

export function listRoles(options?: { search?: string; limit?: number }): ExpertRole[] {
  let filtered = allRoles;
  if (options?.search) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter(
      (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.id.toLowerCase().includes(q),
    );
  }
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }
  return filtered;
}

export function getRoleById(id: string): ExpertRole | null {
  const norm = id.toLowerCase().trim();
  return allRoles.find((r) => r.id.toLowerCase() === norm) ?? null;
}

function resolveAssetPath(assetPath: string): string | null {
  const normPath = assetPath.replace(/\\/g, "/");
  const relPart = normPath.replace(/^\.?\.?[\\/]?\.agents[\\/]/, "");
  const searchRoots = [
    process.env.DISHA_AGENTS_ROOT,
    path.resolve(process.cwd(), ".agents"),
    path.resolve(process.cwd(), "..", ".agents"),
    path.resolve(process.cwd(), "web", ".agents"),
    path.resolve(__dirname, "../../.agents"),
    path.resolve(__dirname, "../../../.agents"),
  ].filter(Boolean) as string[];

  for (const root of searchRoots) {
    try {
      const candidate1 = path.resolve(root, relPart);
      if (fs.existsSync(candidate1)) return candidate1;
      const candidate2 = path.resolve(root, normPath);
      if (fs.existsSync(candidate2)) return candidate2;
    } catch {}
  }
  return null;
}

export function getRoleInstructions(id: string): string | null {
  const role = getRoleById(id);
  if (!role) return null;
  const resolved = resolveAssetPath(role.path);
  if (resolved) {
    try {
      return fs.readFileSync(resolved, "utf-8");
    } catch {}
  }
  return null;
}

export type SkillCategory =
  | "cybersecurity"
  | "design-frontend"
  | "software-engineering"
  | "intelligence-osint"
  | "cognitive-memory"
  | "ai-research"
  | "scientific-computing"
  | "computer-networking"
  | "general";

export type RegisteredSkill = {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  path: string;
  hasPrompt: boolean;
  tokenEstimate: number;
  compatibility: {
    runtime: string;
    requiresApproval: boolean;
    governed: boolean;
  };
};

export type SkillExecutionStatus =
  | "SUCCESS"
  | "NOT_EXECUTED"
  | "UNSUPPORTED"
  | "EXECUTION_FAILED"
  | "FAILED"
  | "POLICY_DENIED"
  | "CONFIRMATION_REQUIRED"
  | "ESCALATION_REQUIRED"
  | "POLICY_VIOLATION"
  | "EVIDENCE_WRITE_FAILED";

export type SkillExecutionResult = {
  skillId: string;
  status: SkillExecutionStatus;
  summary: string;
  output: Record<string, unknown>;
  evidenceId?: string;
  policyDecision?: unknown;
  evidenceError?: string;
  artifactHash?: string;
};

const allSkills: RegisteredSkill[] = skillsData as RegisteredSkill[];

export function listSkills(options?: {
  category?: string;
  search?: string;
  limit?: number;
}): RegisteredSkill[] {
  let filtered = allSkills;
  if (options?.category && options.category !== "all") {
    filtered = filtered.filter((s) => s.category.toLowerCase() === options.category!.toLowerCase());
  }
  if (options?.search) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
    );
  }
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }
  return filtered;
}

export function getSkillById(id: string): RegisteredSkill | null {
  const norm = id.toLowerCase().trim();
  return allSkills.find((s) => s.id.toLowerCase() === norm) ?? null;
}

export function getSkillInstructions(id: string): string | null {
  const skill = getSkillById(id);
  if (!skill) return null;
  const resolved = resolveAssetPath(skill.path);
  if (resolved) {
    try {
      return fs.readFileSync(resolved, "utf-8");
    } catch {}
  }
  return null;
}

// -------------------------------------------------------------
// Genuine Category Domain Executors (Zero Simulation)
// -------------------------------------------------------------

function hashArtifact(data: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

type ExecutorResult = {
  status: SkillExecutionStatus;
  summary: string;
  artifact: Record<string, unknown>;
};

function executeNetworkingSkill(
  skill: RegisteredSkill,
  taskPrompt: string,
  params?: Record<string, unknown>
): ExecutorResult {
  const cidrRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\/(?:[0-9]|[1-2][0-9]|3[0-2])\b/g;
  const promptCidrs = taskPrompt.match(cidrRegex) || [];
  const paramCidrs = Array.isArray(params?.cidrs) ? (params!.cidrs as string[]) : [];
  const allCidrs = [...new Set([...promptCidrs, ...paramCidrs])];

  const routes = (params?.routes as Array<{ prefix: string; nextHop: string; metric?: number }>) || [];
  const hops = (params?.hops as string[]) || [];
  const mtu = typeof params?.mtu === "number" ? params.mtu : undefined;

  // If no network indicators, CIDRs, or routes provided, fail truthfully with NOT_EXECUTED
  if (allCidrs.length === 0 && routes.length === 0 && hops.length === 0 && mtu === undefined) {
    return {
      status: "NOT_EXECUTED",
      summary: "No network topology, route table, or CIDR targets provided for verification.",
      artifact: {
        error: "MISSING_NETWORK_INPUTS",
        required: ["cidrs", "routes", "hops", "mtu"],
      },
    };
  }

  // 1. CIDR Math Verification
  const parsedCidrs: Array<{ cidr: string; valid: boolean; netmask?: string; broadcast?: string }> = [];
  for (const cidr of allCidrs) {
    const [ip, maskStr] = cidr.split("/");
    const mask = parseInt(maskStr, 10);
    const octets = ip.split(".").map(Number);
    const validOctets = octets.length === 4 && octets.every((o) => !isNaN(o) && o >= 0 && o <= 255);
    const validMask = !isNaN(mask) && mask >= 0 && mask <= 32;

    if (!validOctets || !validMask) {
      return {
        status: "EXECUTION_FAILED",
        summary: `Invalid CIDR notation encountered: '${cidr}'`,
        artifact: {
          invalidCidr: cidr,
          convergenceStatus: "invalid_input",
          packetFlowVerified: false,
        },
      };
    }

    const maskInt = (0xffffffff << (32 - mask)) >>> 0;
    const ipInt =
      ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
    const netInt = (ipInt & maskInt) >>> 0;
    const bcastInt = (netInt | (~maskInt >>> 0)) >>> 0;

    parsedCidrs.push({
      cidr,
      valid: true,
      netmask: `${(maskInt >>> 24) & 255}.${(maskInt >>> 16) & 255}.${(maskInt >>> 8) & 255}.${maskInt & 255}`,
      broadcast: `${(bcastInt >>> 24) & 255}.${(bcastInt >>> 16) & 255}.${(bcastInt >>> 8) & 255}.${bcastInt & 255}`,
    });
  }

  // 2. MTU Integrity Check
  let mtuIntegrityChecked = false;
  if (mtu !== undefined) {
    if (mtu < 68 || mtu > 9216) {
      return {
        status: "EXECUTION_FAILED",
        summary: `MTU ${mtu} is outside valid Ethernet/IP boundary [68, 9216].`,
        artifact: {
          mtu,
          mtuIntegrityChecked: false,
          convergenceStatus: "mtu_violation",
          packetFlowVerified: false,
        },
      };
    }
    mtuIntegrityChecked = true;
  }

  // 3. Routing Loop Detection
  if (hops.length > 0) {
    const visited = new Set<string>();
    for (const hop of hops) {
      if (visited.has(hop)) {
        return {
          status: "EXECUTION_FAILED",
          summary: `Network loop detected: Hop '${hop}' visited multiple times in packet trajectory.`,
          artifact: {
            detectedLoopAt: hop,
            convergenceStatus: "loop_detected",
            packetFlowVerified: false,
            hopsEvaluated: hops,
          },
        };
      }
      visited.add(hop);
    }
  }

  return {
    status: "SUCCESS",
    summary: `Offline network-input consistency checks passed for ${parsedCidrs.length} CIDRs and ${hops.length} hop labels; no packets or routing convergence were measured.`,
    artifact: {
      domain: "network_diagnostics_and_protocol_verification",
      convergenceStatus: "not_measured",
      mtuIntegrityChecked,
      packetFlowVerified: false,
      offlineValidationPassed: true,
      assessmentType: "input_consistency_only",
      parsedCidrs,
      hopsVerified: hops.length,
      routesEvaluated: routes.length,
    },
  };
}

function executeScientificComputingSkill(
  skill: RegisteredSkill,
  taskPrompt: string,
  params?: Record<string, unknown>
): ExecutorResult {
  // A prompt containing numerals is not an empirical dataset.
  const suppliedData = params?.data ?? params?.samples;
  const data: number[] = Array.isArray(suppliedData) ? suppliedData : [];

  if (data.length === 0) {
    return {
      status: "NOT_EXECUTED",
      summary: "No explicitly supplied numerical data or sample series provided for scientific computation.",
      artifact: { error: "MISSING_NUMERICAL_DATA", required: ["data", "samples"] },
    };
  }

  // Verify numerical validity
  if (data.some((x) => typeof x !== "number" || !Number.isFinite(x))) {
    return {
      status: "EXECUTION_FAILED",
      summary: "Dataset contains non-finite or NaN values. Scientific calculation rejected.",
      artifact: { validationPassed: false, error: "NAN_OR_INFINITE_VALUES" },
    };
  }

  if (data.length < 2) {
    return {
      status: "EXECUTION_FAILED",
      summary: "Sample size N < 2 is insufficient for statistical variance calculation.",
      artifact: { validationPassed: false, sampleCount: data.length },
    };
  }

  // True statistical computation
  const n = data.length;
  const mean = data.reduce((acc, v) => acc + v, 0) / n;
  const variance = data.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  const standardError = stdDev / Math.sqrt(n);

  const nullHypothesisMean = typeof params?.nullHypothesisMean === "number" ? params.nullHypothesisMean : 0;
  const tStat = standardError > 0 ? (mean - nullHypothesisMean) / standardError : null;

  // Deliberate test threshold: If variance is requested to be within threshold
  const maxAllowedVariance = typeof params?.maxVariance === "number" ? params.maxVariance : undefined;
  if (maxAllowedVariance !== undefined && variance > maxAllowedVariance) {
    return {
      status: "EXECUTION_FAILED",
      summary: `Sample variance ${variance.toFixed(4)} exceeds allowed tolerance ${maxAllowedVariance}.`,
      artifact: {
        validationPassed: false,
        sampleCount: n,
        measuredMean: mean,
        measuredVariance: variance,
        threshold: maxAllowedVariance,
      },
    };
  }

  return {
    status: "SUCCESS",
    summary: `Scientific computation completed: N=${n}, mean=${mean.toFixed(4)}, stdDev=${stdDev.toFixed(4)}, tStat=${tStat === null ? "undefined (zero sample variance)" : tStat.toFixed(4)}.`,
    artifact: {
      domain: "scientific_computation_and_analysis",
      validationPassed: true,
      statisticalMeasurements: {
        sampleCount: n,
        mean: Number(mean.toFixed(6)),
        variance: Number(variance.toFixed(6)),
        standardDeviation: Number(stdDev.toFixed(6)),
        standardError: Number(standardError.toFixed(6)),
        tStatistic: tStat === null ? null : Number(tStat.toFixed(6)),
      },
    },
  };
}

function executeAiResearchSkill(
  skill: RegisteredSkill,
  taskPrompt: string,
  params?: Record<string, unknown>
): ExecutorResult {
  const lr = typeof params?.learningRate === "number" ? params.learningRate : undefined;
  const batchSize = typeof params?.batchSize === "number" ? params.batchSize : undefined;
  const layers = typeof params?.layers === "number" ? params.layers : undefined;
  const hiddenDim = typeof params?.hiddenDim === "number" ? params.hiddenDim : undefined;

  if (lr === undefined && batchSize === undefined && layers === undefined && hiddenDim === undefined) {
    return {
      status: "NOT_EXECUTED",
      summary: "No AI hyperparameter or model architecture configuration provided for research verification.",
      artifact: {
        error: "MISSING_AI_CONFIG",
        expected: ["learningRate", "batchSize", "layers", "hiddenDim"],
      },
    };
  }

  // Hyperparameter validation
  const validationErrors: string[] = [];
  if (lr !== undefined && (lr <= 0 || lr >= 1.0)) {
    validationErrors.push(`Learning rate ${lr} must be in range (0, 1.0)`);
  }
  if (batchSize !== undefined && (batchSize <= 0 || !Number.isInteger(batchSize))) {
    validationErrors.push(`Batch size ${batchSize} must be a positive integer`);
  }
  if (layers !== undefined && (layers <= 0 || !Number.isInteger(layers))) {
    validationErrors.push(`Layer count ${layers} must be a positive integer`);
  }
  if (hiddenDim !== undefined && (hiddenDim <= 0 || !Number.isInteger(hiddenDim))) {
    validationErrors.push(`Hidden dimension ${hiddenDim} must be a positive integer`);
  }

  if (validationErrors.length > 0) {
    return {
      status: "EXECUTION_FAILED",
      summary: `AI research validation failed: ${validationErrors.join("; ")}`,
      artifact: {
        hyperparameterValidation: false,
        errors: validationErrors,
      },
    };
  }

  // Parameter calculation: 12 * layers * hiddenDim^2 (transformer approximation)
  let estimatedParamCount: number | undefined;
  if (layers && hiddenDim) {
    estimatedParamCount = 12 * layers * Math.pow(hiddenDim, 2);
  }

  return {
    status: "SUCCESS",
    summary: `Offline AI configuration validation passed; no model was trained or benchmarked.${
      estimatedParamCount ? ` Estimated parameters: ${estimatedParamCount.toLocaleString()}.` : ""
    }`,
    artifact: {
      domain: "machine_learning_research",
      hyperparameterValidation: true,
      validatedConfig: {
        learningRate: lr,
        batchSize,
        layers,
        hiddenDim,
        estimatedParamCount,
      },
    },
  };
}

function executeCognitiveMemorySkill(
  skill: RegisteredSkill,
  taskPrompt: string,
  params?: Record<string, unknown>
): ExecutorResult {
  const startTime = process.hrtime.bigint();
  const text = (params?.corpus as string) || taskPrompt;

  // Genuine entity and relation extraction from text
  const tokens = text.match(/\b[A-Za-z0-9_-]{3,}\b/g) || [];
  const uniqueEntities = [...new Set(tokens.map((t) => t.toLowerCase()))];

  const nodes = uniqueEntities.slice(0, 50).map((id, index) => ({
    id,
    label: id.toUpperCase(),
    type: index % 2 === 0 ? "concept" : "entity",
    degree: 0,
  }));

  const edges: Array<{ source: string; target: string; relation: string }> = [];
  for (let i = 0; i < nodes.length - 1; i += 2) {
    edges.push({
      source: nodes[i].id,
      target: nodes[i + 1].id,
      relation: "associated_with",
    });
    nodes[i].degree++;
    nodes[i + 1].degree++;
  }

  const endTime = process.hrtime.bigint();
  const measuredLatencyMs = Number(endTime - startTime) / 1_000_000;

  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const density = nodeCount > 1 ? (2 * edgeCount) / (nodeCount * (nodeCount - 1)) : 0;

  return {
    status: "SUCCESS",
    summary: `Constructed an unpersisted keyword association graph: ${nodeCount} nodes, ${edgeCount} edges in ${measuredLatencyMs.toFixed(2)}ms; semantic correctness is unverified.`,
    artifact: {
      domain: "knowledge_graph_and_memory_synthesis",
      graphModel: "entity_relation_attribute",
      retrievalLatencyMs: Number(measuredLatencyMs.toFixed(3)),
      nodeCount,
      edgeCount,
      graphDensity: Number(density.toFixed(4)),
      nodeIndexStatus: "not_persisted",
    },
  };
}

function executeSoftwareEngineeringSkill(
  skill: RegisteredSkill,
  taskPrompt: string,
  params?: Record<string, unknown>
): ExecutorResult {
  const code = params?.code ?? params?.snippet;
  if (typeof code !== "string" || code.trim().length === 0) {
    return {
      status: "NOT_EXECUTED",
      summary: "No source code supplied; heuristic source checks were not run.",
      artifact: { error: "MISSING_CODE", required: ["code", "snippet"] },
    };
  }
  const securityViolations: string[] = [];

  // Heuristic pattern scanner: does not parse an AST or prove code safety.
  if (/\beval\s*\(/.test(code)) securityViolations.push("Prohibited use of eval()");
  if (/\bFunction\s*\(/.test(code)) securityViolations.push("Prohibited use of Function() constructor");
  if (/\bchild_process\s*\.\s*exec\s*\(/.test(code)) securityViolations.push("Prohibited unconstrained child_process.exec");
  if (/(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9+/=]{16,}["']/i.test(code)) {
    securityViolations.push("Potential hardcoded credential or secret detected");
  }

  // Syntax bracket matching
  let balance = 0;
  for (const ch of code) {
    if (ch === "{" || ch === "[" || ch === "(") balance++;
    if (ch === "}" || ch === "]" || ch === ")") balance--;
    if (balance < 0) break;
  }
  const syntaxBalanced = balance === 0;

  if (securityViolations.length > 0) {
    return {
      status: "POLICY_VIOLATION",
      summary: `Software security review failed: ${securityViolations.join("; ")}`,
      artifact: {
        syntaxValid: syntaxBalanced,
        securityViolations,
        verified: false,
      },
    };
  }

  if (!syntaxBalanced) {
    return {
      status: "EXECUTION_FAILED",
      summary: "Syntax analysis failed: Unbalanced brackets or delimiters in code sample.",
      artifact: {
        syntaxValid: false,
        securityViolations: [],
      },
    };
  }

  return {
    status: "SUCCESS",
    summary: `Heuristic text checks completed: brackets balanced, no flagged patterns in ${code.length} characters. This is not AST, lint or security certification.`,
    artifact: {
      domain: "software_engineering_and_static_analysis",
      syntaxValid: true,
      securityViolations: [],
      codeLengthChars: code.length,
      linesOfCode: code.split("\n").length,
    },
  };
}

// -------------------------------------------------------------
// Main Skill Execution Gateway
// -------------------------------------------------------------

export async function executeSkill(
  skillId: string,
  input: {
    missionId: string;
    actor: string;
    taskPrompt: string;
    principal?: Principal;
    params?: Record<string, unknown>;
  },
): Promise<SkillExecutionResult> {
  const skill = getSkillById(skillId);
  if (!skill) {
    return {
      skillId,
      status: "FAILED",
      summary: `Skill '${skillId}' not found in registry`,
      output: {},
    };
  }

  // 1. Evaluate policy gate before skill execution
  const actionName = `execute_skill:${skill.id}`;
  const isCallerAdmin = input.principal?.roles.includes("admin") === true;
  const callerRole = isCallerAdmin ? "administrator" : "analyst";

  const signal: DishaSignal = {
    id: `sig-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: input.principal?.userId || input.actor,
    missionId: input.missionId,
    input: {
      rawText: `${actionName} ${input.taskPrompt}`,
      requestedAction: actionName,
      files: [],
      locations: [],
      indicators: [],
    },
    context: {
      intent: "investigation",
      entities: [],
      memoryRefs: [],
      dataSources: [],
      sensitivity: skill.compatibility.requiresApproval ? "controlled" : "public",
    },
    riskContext: {
      userRole: callerRole,
      actionRisk: skill.compatibility.requiresApproval ? 0.6 : 0.1,
      dataSensitivityRisk: 0.1,
      deviceTrust: 1.0,
    },
  };

  const policy = evaluatePolicy(signal);

  // Record policy evaluation attempt to Evidence Ledger
  try {
    await appendEvidenceEvent({
      missionId: input.missionId,
      actor: input.actor,
      action: `${actionName}:attempt`,
      input: { skillId, taskPrompt: input.taskPrompt, policyDecision: policy.decision },
      policyDecision: policy,
    });
  } catch (err: any) {
    console.warn(`[skill-registry] Attempt logging failed: ${err?.message}`);
  }

  // Exhaustive policy decision handling (H-07)
  if (policy.decision === "DENY") {
    const reasonText = policy.reasons.join("; ");
    return {
      skillId,
      status: "POLICY_DENIED",
      summary: `Execution of skill '${skill.name}' denied by policy: ${reasonText}`,
      output: { policyReason: reasonText },
      policyDecision: policy,
    };
  }

  if (policy.decision === "ESCALATE") {
    return {
      skillId,
      status: "ESCALATION_REQUIRED",
      summary: `Execution of skill '${skill.name}' requires supervisor escalation: ${policy.reasons.join("; ")}`,
      output: { policyReasons: policy.reasons },
      policyDecision: policy,
    };
  }

  // H-02: Require verified cryptographic authorization grant for ASK_CONFIRMATION / high risk
  let hasVerifiedGrant = false;
  if (policy.decision === "ASK_CONFIRMATION" || skill.compatibility.requiresApproval) {
    const grantId = (input.params?.approvalGrantId as string) || (input.params?.grantId as string);
    if (!grantId) {
      return {
        skillId,
        status: "CONFIRMATION_REQUIRED",
        summary: `Skill '${skill.name}' requires an independent, signed operator approval grant (approvalGrantId). Unauthenticated booleans are rejected.`,
        output: { policyReasons: policy.reasons, requiresGrant: true },
        policyDecision: policy,
      };
    }

    const grantCheck = verifyAuthorizationGrant({
      grantId,
      caller: input.principal,
      requiredScope: "high_risk_execution",
      toolId: skill.id,
    });

    if (!grantCheck.authorized) {
      return {
        skillId,
        status: "CONFIRMATION_REQUIRED",
        summary: `Approval grant verification failed for skill '${skill.name}': ${grantCheck.reason}`,
        output: { grantVerificationFailed: true, reason: grantCheck.reason },
        policyDecision: policy,
      };
    }
    hasVerifiedGrant = true;
  }

  if (policy.decision === "READ_ONLY" && !hasVerifiedGrant) {
    const isWriteOrActive =
      skill.category === "software-engineering" ||
      skill.id.includes("fix") ||
      skill.id.includes("write") ||
      skill.id.includes("attack") ||
      skill.id.includes("pen-testing") ||
      skill.compatibility.requiresApproval;
    if (isWriteOrActive) {
      return {
        skillId,
        status: "POLICY_VIOLATION",
        summary: `READ_ONLY policy mode prohibits mutating or active skill '${skill.name}'.`,
        output: { policyDecision: "READ_ONLY", reasons: policy.reasons },
        policyDecision: policy,
      };
    }
  }

  // 2. Load authentic instructions (H-03)
  const instructions = getSkillInstructions(skillId) ?? skill.description;
  if (!instructions) {
    return {
      skillId,
      status: "FAILED",
      summary: `Could not load instruction body for skill '${skill.name}'.`,
      output: { error: "SKILL_BODY_NOT_FOUND" },
      policyDecision: policy,
    };
  }

  // 3. Genuine domain execution (C-01)
  let executionResult: ExecutorResult;
  if (skill.category === "computer-networking") {
    executionResult = executeNetworkingSkill(skill, input.taskPrompt, input.params);
  } else if (skill.category === "scientific-computing") {
    executionResult = executeScientificComputingSkill(skill, input.taskPrompt, input.params);
  } else if (skill.category === "ai-research") {
    executionResult = executeAiResearchSkill(skill, input.taskPrompt, input.params);
  } else if (skill.category === "cognitive-memory") {
    executionResult = executeCognitiveMemorySkill(skill, input.taskPrompt, input.params);
  } else if (skill.category === "software-engineering" || skill.category === "cybersecurity") {
    executionResult = executeSoftwareEngineeringSkill(skill, input.taskPrompt, input.params);
  } else {
    // General / informational skills
    executionResult = {
      status: "NOT_EXECUTED",
      summary: `Skill '${skill.name}' has an indexed instruction document, but no registered domain executor ran this task.`,
      artifact: {
        domain: "instruction_catalogue_only",
        instructionLength: instructions.length,
        executed: false,
        nextAction: "Register and test a capability-specific executor before reporting success.",
      },
    };
  }

  const artifactHash = hashArtifact(executionResult.artifact);

  const outputData: Record<string, unknown> = {
    executedAt: new Date().toISOString(),
    taskPrompt: input.taskPrompt,
    category: skill.category,
    governed: true,
    policyDecision: policy.decision,
    instructionLengthBytes: instructions.length,
    tokenEstimate: skill.tokenEstimate,
    executionArtifact: executionResult.artifact,
    artifactHash,
  };

  // 4. Record completed event into Evidence Ledger (Fail-closed on production, H-01)
  let evidenceEvent;
  let evidenceError: string | undefined;
  try {
    evidenceEvent = await appendEvidenceEvent({
      missionId: input.missionId,
      actor: input.actor,
      action: actionName,
      input: { skillId, taskPrompt: input.taskPrompt, params: input.params },
      output: outputData,
      policyDecision: policy,
    });
  } catch (err: any) {
    evidenceError = err?.message || String(err);
    console.error(`[skill-registry] Evidence event logging failed for ${actionName}: ${evidenceError}`);

    // Missing ledger evidence invalidates the result in every environment.
    return {
      skillId,
      status: "EVIDENCE_WRITE_FAILED",
      summary: "Skill result cannot be certified because the evidence ledger write failed.",
      output: outputData,
      policyDecision: policy,
      evidenceError,
      artifactHash,
    };
  }

  return {
    skillId,
    status: executionResult.status,
    summary: executionResult.summary,
    output: outputData,
    evidenceId: evidenceEvent?.eventId,
    policyDecision: policy,
    evidenceError,
    artifactHash,
  };
}

// -------------------------------------------------------------
// Governed Role Dispatcher (H-04)
// -------------------------------------------------------------

export interface RoleDispatchRequest {
  missionId: string;
  actor: string;
  principal?: Principal;
  objective: string;
  context?: Record<string, unknown>;
  maxSteps?: number;
  tokenBudget?: number;
  deadlineMs?: number;
  approvalGrantId?: string;
}

export interface RoleDispatchResult {
  roleId: string;
  roleName: string;
  status: "SUCCESS" | "NOT_EXECUTED" | "POLICY_DENIED" | "BUDGET_EXCEEDED" | "FAILED";
  summary: string;
  executionTrace: Array<{
    step: number;
    action: string;
    observation: string;
    tokensUsed: number;
  }>;
  findings: string[];
  evidenceId?: string;
  artifactHash: string;
  governance: {
    policyDecision: string;
    maxSteps: number;
    tokensConsumed: number;
    durationMs: number;
  };
}

export async function dispatchRole(
  roleId: string,
  request: RoleDispatchRequest
): Promise<RoleDispatchResult> {
  const startTime = Date.now();
  const role = getRoleById(roleId);

  if (!role) {
    return {
      roleId,
      roleName: "Unknown",
      status: "FAILED",
      summary: `Role '${roleId}' not found in 503-role index.`,
      executionTrace: [],
      findings: [],
      artifactHash: "",
      governance: { policyDecision: "DENY", maxSteps: 0, tokensConsumed: 0, durationMs: 0 },
    };
  }

  const instructions = getRoleInstructions(roleId);
  const actionName = `dispatch_role:${role.id}`;

  const isCallerAdmin = request.principal?.roles.includes("admin") === true;
  const signal: DishaSignal = {
    id: `sig-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: request.principal?.userId || request.actor,
    missionId: request.missionId,
    input: {
      rawText: `${actionName} ${request.objective}`,
      requestedAction: actionName,
      files: [],
      locations: [],
      indicators: [],
    },
    context: {
      intent: "investigation",
      entities: [],
      memoryRefs: [],
      dataSources: [],
      sensitivity: "controlled",
    },
    riskContext: {
      userRole: isCallerAdmin ? "administrator" : "analyst",
      actionRisk: 0.3,
      dataSensitivityRisk: 0.1,
      deviceTrust: 1.0,
    },
  };

  const policy = evaluatePolicy(signal);
  if (policy.decision === "DENY") {
    return {
      roleId,
      roleName: role.name,
      status: "POLICY_DENIED",
      summary: `Role recruitment denied by policy: ${policy.reasons.join("; ")}`,
      executionTrace: [],
      findings: [],
      artifactHash: "",
      governance: { policyDecision: policy.decision, maxSteps: 0, tokensConsumed: 0, durationMs: 0 },
    };
  }

  const maxSteps = Math.max(1, Math.min(request.maxSteps ?? 5, 10));
  // This is a catalogue lookup, not an LLM inference or an autonomous run.
  // The actual token counter must remain zero until a model gateway reports
  // measured usage. Do not invent findings merely because a persona exists.
  const tokensConsumed = 0;
  const executionTrace: Array<{ step: number; action: string; observation: string; tokensUsed: number }> = [{
    step: 0,
    action: "role_instruction_lookup",
    observation: instructions
      ? `Loaded role metadata and ${instructions.length} instruction characters; no domain task or tool executed.`
      : "Role metadata found, but its instruction document was unavailable.",
    tokensUsed: 0,
  }];
  const findings: string[] = [];

  const durationMs = Date.now() - startTime;
  const artifact = {
    roleId,
    roleName: role.name,
    objective: request.objective,
    executionTrace,
    findings,
  };
  const artifactHash = hashArtifact(artifact);

  // Record to evidence ledger
  let evidenceId: string | undefined;
  try {
    const ev = await appendEvidenceEvent({
      missionId: request.missionId,
      actor: request.actor,
      action: actionName,
      input: { roleId, objective: request.objective },
      output: artifact,
      policyDecision: policy,
    });
    evidenceId = ev?.eventId;
  } catch (err) {
    console.warn(`[skill-registry] Evidence event logging for role failed:`, err);
  }

  return {
    roleId,
    roleName: role.name,
    status: "NOT_EXECUTED",
    summary: `Role '${role.name}' loaded as an instruction persona only; no model, external tool, or expert execution was performed.`,
    executionTrace,
    findings,
    evidenceId,
    artifactHash,
    governance: {
      policyDecision: policy.decision,
      maxSteps,
      tokensConsumed,
      durationMs,
    },
  };
}
