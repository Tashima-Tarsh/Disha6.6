import skillsData from "@/data/skills/skills-index.json";

export type SkillCategory =
  | "cybersecurity"
  | "design-frontend"
  | "software-engineering"
  | "intelligence-osint"
  | "cognitive-memory"
  | "ai-research"
  | "scientific-computing"
  | "computer-networking"
  | "mobile-android"
  | "api-integration"
  | "reverse-engineering"
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
