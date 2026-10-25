import fs from "node:fs";
import path from "node:path";

console.info("=== GENERATING CANONICAL AGENT SKILLS REGISTRY ===");

const skillsDir = path.resolve(".agents/skills");
const outDir = path.resolve("data/skills");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
const registeredSkills = [];

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
  if (!fs.existsSync(skillFile)) continue;

  try {
    const content = fs.readFileSync(skillFile, "utf-8");
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) continue;

    const fmText = fmMatch[1];
    const frontmatter = {};
    for (const line of fmText.split("\n")) {
      const kv = line.match(/^([a-zA-Z0-9_\-]+)\s*:\s*(.*)$/);
      if (kv) {
        let val = kv[2].trim().replace(/^["']|["']$/g, "");
        frontmatter[kv[1].trim()] = val;
      }
    }

    const name = frontmatter.name || entry.name;
    const description = frontmatter.description || `${name} agent skill`;
    
    // Categorize by keywords or name
    let category = "general";
    const lower = `${name} ${description}`.toLowerCase();
    if (lower.includes("security") || lower.includes("pentest") || lower.includes("threat") || lower.includes("audit") || lower.includes("vulnerab")) {
      category = "cybersecurity";
    } else if (lower.includes("frontend") || lower.includes("ui") || lower.includes("ux") || lower.includes("design") || lower.includes("css") || lower.includes("react")) {
      category = "design-frontend";
    } else if (lower.includes("osint") || lower.includes("investig") || lower.includes("intel") || lower.includes("search") || lower.includes("recon")) {
      category = "intelligence-osint";
    } else if (lower.includes("code") || lower.includes("debug") || lower.includes("git") || lower.includes("test") || lower.includes("tdd") || lower.includes("refactor")) {
      category = "software-engineering";
    } else if (lower.includes("memory") || lower.includes("graph") || lower.includes("rag") || lower.includes("embed") || lower.includes("reason")) {
      category = "cognitive-memory";
    }

    registeredSkills.push({
      id: entry.name,
      name,
      category,
      description,
      path: `.agents/skills/${entry.name}/SKILL.md`,
      hasPrompt: content.length > fmMatch[0].length,
      tokenEstimate: Math.round(content.length / 4),
      compatibility: {
        runtime: "node/python",
        requiresApproval: category === "cybersecurity",
        governed: true,
      },
    });
  } catch (err) {
    console.warn(`Failed parsing skill ${entry.name}:`, err.message);
  }
}

const outputPath = path.join(outDir, "skills-index.json");
fs.writeFileSync(outputPath, JSON.stringify(registeredSkills, null, 2), "utf-8");

// Also copy to web/data/skills/skills-index.json so Next.js frontend can import it statically
const webOutDir = path.resolve("web/data/skills");
if (!fs.existsSync(webOutDir)) {
  fs.mkdirSync(webOutDir, { recursive: true });
}
fs.writeFileSync(path.join(webOutDir, "skills-index.json"), JSON.stringify(registeredSkills, null, 2), "utf-8");

console.info(`Successfully registered ${registeredSkills.length} skills into ${outputPath}`);
console.info(`Categories breakdown:`);
const cats = {};
for (const s of registeredSkills) {
  cats[s.category] = (cats[s.category] || 0) + 1;
}
console.info(JSON.stringify(cats, null, 2));

