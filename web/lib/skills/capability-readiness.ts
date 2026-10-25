import { listSkills, type RegisteredSkill, type SkillCategory } from "./skill-registry";

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
    mode: "INSTRUCTIONS_ONLY",
    executor: null,
    limitation: "No WCAG/UX browser runner is connected to executeSkill.",
  },
  "intelligence-osint": {
    mode: "INSTRUCTIONS_ONLY",
    executor: null,
    limitation: "OSINT tools have separate governed routes; no skill-ID adapter runner is wired.",
  },
  general: {
    mode: "INSTRUCTIONS_ONLY",
    executor: null,
    limitation: "Instruction and registry entry only; no generic external executor.",
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
    executableToolCount: 0, // no unqualified "all skills are tools" claim
    offlineValidatorMappings: summary.OFFLINE_LIMITED,
    instructionOnlyMappings: summary.INSTRUCTIONS_ONLY,
    offset,
    limit,
    entries: registered.slice(offset, offset + limit).map(describeCapability),
    note: "Mappings are category-level limited runners, not individually certified specialist executors.",
  };
}
