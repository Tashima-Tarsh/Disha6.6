import fs from "node:fs";
import path from "node:path";

export interface SkillEntry {
  name: string;
  category: string;
  description: string;
  source: "claude-skills" | "rea" | "builtin";
  filePath?: string;
}

export class SkillsKnowledgeBase {
  private static instance: SkillsKnowledgeBase | null = null;
  private skills: SkillEntry[] = [];
  private skillsDir: string;
  private indexJsonPath: string;

  constructor() {
    this.skillsDir = path.resolve(process.cwd(), "../.agents/skills");
    if (!fs.existsSync(this.skillsDir)) {
      this.skillsDir = path.resolve(process.cwd(), ".agents/skills");
    }
    if (!fs.existsSync(this.skillsDir)) {
      this.skillsDir = "D:\\Disha6.6\\.agents\\skills";
    }

    this.indexJsonPath = path.resolve(
      process.cwd(),
      "data/skills/skills-index.json"
    );
    if (!fs.existsSync(this.indexJsonPath)) {
      this.indexJsonPath = path.resolve(
        process.cwd(),
        "../data/skills/skills-index.json"
      );
    }
    if (!fs.existsSync(this.indexJsonPath)) {
      this.indexJsonPath = path.resolve(
        process.cwd(),
        "../integrations/claude-skills/.gemini/skills-index.json"
      );
    }
    if (!fs.existsSync(this.indexJsonPath)) {
      this.indexJsonPath = "D:\\Disha6.6\\integrations\\claude-skills\\.gemini\\skills-index.json";
    }

    this.loadCatalog();
  }

  public static getInstance(): SkillsKnowledgeBase {
    if (!SkillsKnowledgeBase.instance) {
      SkillsKnowledgeBase.instance = new SkillsKnowledgeBase();
    }
    return SkillsKnowledgeBase.instance;
  }

  private loadCatalog(): void {
    // 1. Load from pre-indexed JSON if available
    try {
      if (fs.existsSync(this.indexJsonPath)) {
        const raw = fs.readFileSync(this.indexJsonPath, "utf-8");
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.skills) ? parsed.skills : []);
        if (list.length > 0) {
          this.skills = list.map((s: { name: string; category?: string; description?: string; id?: string }) => ({
            name: s.id || s.name,
            category: s.category || "engineering",
            description: s.description || "",
            source: "claude-skills" as const,
          }));
        }
      }
    } catch {
      // fallback to folder scan
    }

    // 2. Discover skills from filesystem (.agents/skills)
    try {
      if (fs.existsSync(this.skillsDir)) {
        const folders = fs.readdirSync(this.skillsDir);
        for (const folder of folders) {
          const skillMd = path.join(this.skillsDir, folder, "SKILL.md");
          if (fs.existsSync(skillMd)) {
            const exists = this.skills.find((s) => s.name.toLowerCase() === folder.toLowerCase());
            if (!exists) {
              const content = fs.readFileSync(skillMd, "utf-8").slice(0, 1000);
              const descMatch = content.match(/description:\s*["']?([^"'\n]+)/i);
              const isRea = folder.includes("reverse-engineer") || folder.includes("rea-");

              this.skills.push({
                name: folder,
                category: isRea ? "reverse-engineering" : "engineering",
                description: descMatch ? descMatch[1].trim() : "Custom specialized agent workflow",
                source: isRea ? "rea" : "claude-skills",
                filePath: skillMd,
              });
            }
          }
        }
      }
    } catch {
      // fallback
    }

    // 3. Register builtin DISHA core competencies
    const hasVehicleSkill = this.skills.some((s) => s.name === "indian-vehicle-intelligence");
    if (!hasVehicleSkill) {
      this.skills.push({
        name: "indian-vehicle-intelligence",
        category: "transport-intelligence",
        description: "Indian Vehicle Registration Intelligence, VAHAN/RTO verification, Bharat Series resolution, and statutory road compliance auditing under Section 63 BSA.",
        source: "builtin",
      });
    }
  }

  public getAllSkills(): SkillEntry[] {
    return this.skills;
  }

  public getSkillCount(): number {
    return this.skills.length;
  }

  public matchSkills(query: string, maxResults = 3): SkillEntry[] {
    if (!query || this.skills.length === 0) return [];
    const normalized = query.toLowerCase();
    const words = normalized.split(/\s+/).filter((w) => w.length > 2);

    const scored = this.skills.map((skill) => {
      let score = 0;
      const sName = skill.name.toLowerCase();
      const sDesc = skill.description.toLowerCase();
      const sCat = skill.category.toLowerCase();

      // Priority keyword associations
      if (normalized.includes("reverse") || normalized.includes("binary") || normalized.includes("decompile") || normalized.includes("disassemble") || normalized.includes("apk") || normalized.includes("electron")) {
        if (sName.includes("reverse-engineer") || sName.includes("rea") || sName.includes("binary") || sCat.includes("reverse")) {
          score += 100;
        }
      }

      if (normalized.includes("security") || normalized.includes("audit") || normalized.includes("vulnerability") || normalized.includes("cve")) {
        if (sName.includes("security") || sName.includes("adversarial") || sName.includes("threat")) {
          score += 50;
        }
      }

      if (normalized.includes("code") || normalized.includes("script") || normalized.includes("python") || normalized.includes("refactor")) {
        if (sName.includes("engineer") || sName.includes("code") || sName.includes("architect")) {
          score += 20;
        }
      }

      if (normalized.includes("vehicle") || normalized.includes("vahan") || normalized.includes("rto") || normalized.includes("rc") || normalized.includes("number plate") || normalized.includes("registration plate")) {
        if (sName.includes("vehicle") || sCat.includes("transport")) {
          score += 120;
        }
      }

      // Word matching
      for (const word of words) {
        if (sName.includes(word)) score += 15;
        if (sCat.includes(word)) score += 10;
        if (sDesc.includes(word)) score += 5;
      }

      return { skill, score };
    });

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((item) => item.skill);
  }

  public loadSkillContent(skillName: string): string | null {
    const candidates = [
      path.join(this.skillsDir, skillName, "SKILL.md"),
      path.join(process.cwd(), ".agents/skills", skillName, "SKILL.md"),
      path.join(process.cwd(), "../.agents/skills", skillName, "SKILL.md"),
      `D:\\Disha6.6\\.agents\\skills\\${skillName}\\SKILL.md`,
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          return fs.readFileSync(p, "utf-8");
        } catch {
          // ignore
        }
      }
    }
    return null;
  }

  public getPromptAugmentation(userQuery: string): string {
    const matched = this.matchSkills(userQuery, 2);
    if (matched.length === 0) return "";

    const snippets: string[] = [];
    for (const skill of matched) {
      const fullText = this.loadSkillContent(skill.name);
      if (fullText) {
        // Truncate to first 1200 chars of structured instructions
        const cleanInstructions = fullText
          .replace(/---[\s\S]*?---/, "")
          .trim()
          .slice(0, 1200);
        snippets.push(`### [EXPERT SKILL: ${skill.name.toUpperCase()} (${skill.category})]\n${cleanInstructions}\n...`);
      } else {
        snippets.push(`### [EXPERT SKILL: ${skill.name.toUpperCase()}]\n${skill.description}`);
      }
    }

    return `\nACTIVE EXPERT SKILLS ENGAGED FOR THIS TASK:\n${snippets.join("\n\n")}\nFollow the above professional decision frameworks, verification steps, and quality gates.\n`;
  }
}
