import { listSkills, type RegisteredSkill, type SkillCategory } from "./skill-registry";

export { listSkills };
export type { RegisteredSkill, SkillCategory };

/**
 * A truthful capability descriptor: this is NOT a claim that loading a SKILL.md
 * instantiates an independent autonomous specialist or network-scanning tool.
 */
export type CapabilityMode = "OFFLINE_LIMITED" | "INSTRUCTIONS_ONLY";

export type CapabilityReadiness = {
  id: string;
  name: string;
  category: SkillCategory;
  mode: CapabilityMode;
  executor: string | null;
  canInvokeSkillApi: boolean;
  requiresApproval: boolean;
  limitation: string;
};

const categoryReadiness: Record<
  SkillCategory,
  { mode: CapabilityMode; executor: string | null; limitation: string }
> = {
  "ai-research": {
    mode: "OFFLINE_LIMITED",
    executor: "offline-hyperparameter-check",
    limitation: "Does not train, evaluate or benchmark a model.",
  },
  "scientific-computing": {
    mode: "OFFLINE_LIMITED",
    executor: "offline-descriptive-statistics",
    limitation: "Does not execute arbitrary scientific simulations or hypothesis tests.",
  },
  "computer-networking": {
    mode: "OFFLINE_LIMITED",
    executor: "offline-cidr-mtu-hop-check",
    limitation: "No packet capture, live probing, BGP measurements or convergence proof.",
  },
  "cognitive-memory": {
    mode: "OFFLINE_LIMITED",
    executor: "offline-keyword-graph-builder",
    limitation: "Graph is heuristic and not persisted or semantically certified.",
  },
  cybersecurity: {
    mode: "OFFLINE_LIMITED",
    executor: "offline-source-pattern-check",
    limitation: "Requires approval; no penetration testing or independently verified AST audit.",
  },
  "software-engineering": {
    mode: "OFFLINE_LIMITED",
    executor: "offline-source-pattern-check",
    limitation: "Checks patterns and bracket balance only; not a compiler, AST parser or linter.",
  },
  "design-frontend": {
    mode: "OFFLINE_LIMITED",
    executor: "offline-frontend-design-and-api-review",
    limitation: "Heuristic pattern checks only; not a WCAG auditor, browser runner, or AST analyzer.",
  },
  "intelligence-osint": {
    mode: "OFFLINE_LIMITED",
    executor: "offline-osint-research-structure",
    limitation: "Read-only structure validation; no live web search, scraping, or external intelligence gathering.",
  },
  general: {
    mode: "OFFLINE_LIMITED",
    executor: "offline-general-task-analysis",
    limitation: "Instruction catalogue entry only; no model inference, external tool, or autonomous execution.",
  },
  "mobile-android": {
    mode: "OFFLINE_LIMITED",
    executor: "offline-android-structure-validation",
    limitation: "Read-only structure validation; no APK signing, installation, ADB, emulator, or device interaction.",
  },
  "api-integration": {
    mode: "OFFLINE_LIMITED",
    executor: "offline-api-structure-validation",
    limitation: "Read-only structure validation; no live HTTP requests or external API calls.",
  },
  "reverse-engineering": {
    mode: "OFFLINE_LIMITED",
    executor: "offline-reverse-engineering-structure-validation",
    limitation: "Read-only structure validation; no disassembly, decompilation, or binary analysis tools.",
  },
};

export function describeCapability(skill: RegisteredSkill): CapabilityReadiness {
  const descriptor = categoryReadiness[skill.category];
  return {
    id: skill.id,
    name: skill.name,
    category: skill.category,
    ...descriptor,
    canInvokeSkillApi: descriptor.mode === "OFFLINE_LIMITED",
    requiresApproval: skill.compatibility.requiresApproval,
  };
}

export function getCapabilityReadiness(options: {
  category?: string;
  search?: string;
  offset?: number;
  limit?: number;
} = {}) {
  const registered = listSkills({ category: options.category, search: options.search });
  const total = registered.length;
  const summary = registered.reduce(
    (acc, skill) => {
      const mode = categoryReadiness[skill.category].mode;
      acc[mode]++;
      return acc;
    },
    { OFFLINE_LIMITED: 0, INSTRUCTIONS_ONLY: 0 },
  );
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const limit = Math.max(1, Math.min(200, Math.floor(options.limit ?? 50)));
  return {
    catalogued: total,
    independentlyCertifiedExecutors: 0, // category mappings are not specialist certifications
    offlineValidatorMappings: summary.OFFLINE_LIMITED,
    instructionOnlyMappings: summary.INSTRUCTIONS_ONLY,
    offset,
    limit,
    entries: registered.slice(offset, offset + limit).map(describeCapability),
    note: "Mappings are category-level limited runners, not individually certified specialist executors.",
  };
}
