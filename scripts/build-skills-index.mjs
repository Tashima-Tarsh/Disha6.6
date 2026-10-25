import fs from "node:fs";
import path from "node:path";

console.info("=== REBUILDING CANONICAL DISHA 6.6 SKILLS & ROLES REGISTRY ===");

const skillsDir = path.resolve(".agents/skills");
const rolesDir = path.resolve(".agents/roles");
const outDir = path.resolve("data/skills");
const webOutDir = path.resolve("web/data/skills");

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(webOutDir, { recursive: true });

// 1. BUILD SKILLS INDEX
const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
const registeredSkills = [];

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
  if (!fs.existsSync(skillFile)) continue;

  try {
    const content = fs.readFileSync(skillFile, "utf-8");
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

    let frontmatter = {};
    if (fmMatch) {
      const fmText = fmMatch[1];
      for (const line of fmText.split("\n")) {
        const kv = line.match(/^([a-zA-Z0-9_\-]+)\s*:\s*(.*)$/);
        if (kv) {
          let val = kv[2].trim().replace(/^["']|["']$/g, "");
          frontmatter[kv[1].trim()] = val;
        }
      }
    }

    const name = frontmatter.name || entry.name.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    let description = frontmatter.description || `${name} agent capability`;
    if (description.length > 250) {
      description = description.slice(0, 247) + "...";
    }

    // Determine category
    let category = frontmatter.category || "general";
    if (category === "Engineering / Code Quality" || category.includes("engineering")) {
      category = "software-engineering";
    }
    const lower = `${entry.name} ${name} ${description}`.toLowerCase();

    if (category === "general" || !category) {
      if (
        lower.includes("security") ||
        lower.includes("pentest") ||
        lower.includes("threat") ||
        lower.includes("audit") ||
        lower.includes("vulnerab") ||
        lower.includes("exploit") ||
        lower.includes("secdoc") ||
        lower.includes("wazuh") ||
        lower.includes("firewall") ||
        lower.includes("soar")
      ) {
        category = "cybersecurity";
      } else if (
        lower.includes("bgp") ||
        lower.includes("ospf") ||
        lower.includes("mpls") ||
        lower.includes("cisco") ||
        lower.includes("network") ||
        lower.includes("vlan") ||
        lower.includes("gns3") ||
        lower.includes("routing") ||
        lower.includes("wireguard") ||
        lower.includes("switch")
      ) {
        category = "computer-networking";
      } else if (
        lower.includes("ai-research") ||
        lower.includes("model-arch") ||
        lower.includes("tokeniz") ||
        lower.includes("fine-tun") ||
        lower.includes("alignment") ||
        lower.includes("llm") ||
        lower.includes("prompt-eng") ||
        lower.includes("rag") ||
        lower.includes("dspy") ||
        lower.includes("multimodal") ||
        lower.includes("diffusion")
      ) {
        category = "ai-research";
      } else if (
        lower.includes("biopython") ||
        lower.includes("genom") ||
        lower.includes("astropy") ||
        lower.includes("rnaseq") ||
        lower.includes("physic") ||
        lower.includes("chem") ||
        lower.includes("calcul") ||
        lower.includes("simulation") ||
        lower.includes("sci-") ||
        lower.includes("kd-") ||
        lower.includes("kal-") ||
        lower.includes("kalaris") ||
        lower.includes("scientist")
      ) {
        category = "scientific-computing";
      } else if (
        lower.includes("frontend") ||
        lower.includes("ui") ||
        lower.includes("ux") ||
        lower.includes("design") ||
        lower.includes("css") ||
        lower.includes("react") ||
        lower.includes("threejs") ||
        lower.includes("3d") ||
        lower.includes("a11y") ||
        lower.includes("tailwind")
      ) {
        category = "design-frontend";
      } else if (
        lower.includes("osint") ||
        lower.includes("investig") ||
        lower.includes("intel") ||
        lower.includes("recon") ||
        lower.includes("whois") ||
        lower.includes("dns-recon")
      ) {
        category = "intelligence-osint";
      } else if (
        lower.includes("memory") ||
        lower.includes("graphify") ||
        lower.includes("knowledge") ||
        lower.includes("graph") ||
        lower.includes("embed")
      ) {
        category = "cognitive-memory";
      } else if (
        lower.includes("code") ||
        lower.includes("debug") ||
        lower.includes("git") ||
        lower.includes("test") ||
        lower.includes("tdd") ||
        lower.includes("refactor") ||
        lower.includes("deploy") ||
        lower.includes("superpower") ||
        lower.includes("sp-") ||
        lower.includes("architect")
      ) {
        category = "software-engineering";
      }
    }

    const requiresApproval =
      category === "cybersecurity" ||
      lower.includes("inject") ||
      lower.includes("exploit") ||
      lower.includes("attack");

    registeredSkills.push({
      id: entry.name,
      name,
      category,
      description,
      path: `.agents/skills/${entry.name}/SKILL.md`,
      hasPrompt: content.length > (fmMatch ? fmMatch[0].length : 0),
      tokenEstimate: Math.max(50, Math.round(content.length / 4)),
      compatibility: {
        runtime: "node/python",
        requiresApproval,
        governed: true,
      },
    });
  } catch (err) {
    console.warn(`Failed parsing skill ${entry.name}:`, err.message);
  }
}

// 2. BUILD ROLES INDEX (503 Expert Personas)
const registeredRoles = [];
if (fs.existsSync(rolesDir)) {
  const roleEntries = fs.readdirSync(rolesDir, { withFileTypes: true });
  for (const rent of roleEntries) {
    if (!rent.isDirectory()) continue;
    const roleFile = path.join(rolesDir, rent.name, "AGENTS.md");
    if (!fs.existsSync(roleFile)) continue;

    try {
      const content = fs.readFileSync(roleFile, "utf-8");
      const titleMatch = content.match(/^#\s+(?:AGENTS(?:\.md)?\s*[-—–:]\s*)?(.+?)(?:\s+Agent)?\s*$/mi);
      let title = titleMatch ? titleMatch[1].trim() : rent.name.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      title = title.replace(/^AGENTS(?:\.md)?\s*[-—–:]\s*/i, "").replace(/\s+Agent$/i, "").trim();
      if (!title || title.length > 50) {
        title = rent.name.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      }
      const firstPara = content.replace(/^#\s+.+$/m, "").trim().split("\n\n")[0] || `${title} expert role`;
      const cleanDesc = firstPara.replace(/\r?\n/g, " ").replace(/["']/g, "").slice(0, 240).trim();

      registeredRoles.push({
        id: rent.name,
        name: title,
        role: title,
        description: cleanDesc,
        path: `.agents/roles/${rent.name}/AGENTS.md`,
        tokenEstimate: Math.round(content.length / 4),
      });
    } catch {}
  }
}

// Write skills index
const skillsOut = path.join(outDir, "skills-index.json");
const webSkillsOut = path.join(webOutDir, "skills-index.json");
fs.writeFileSync(skillsOut, JSON.stringify(registeredSkills, null, 2), "utf-8");
fs.writeFileSync(webSkillsOut, JSON.stringify(registeredSkills, null, 2), "utf-8");

// Write roles index
const rolesOut = path.join(outDir, "roles-index.json");
const webRolesOut = path.join(webOutDir, "roles-index.json");
fs.writeFileSync(rolesOut, JSON.stringify(registeredRoles, null, 2), "utf-8");
fs.writeFileSync(webRolesOut, JSON.stringify(registeredRoles, null, 2), "utf-8");

console.info(`✓ Successfully indexed ${registeredSkills.length} skills into ${webSkillsOut}`);
console.info(`✓ Successfully indexed ${registeredRoles.length} expert roles into ${webRolesOut}`);

const cats = {};
for (const s of registeredSkills) {
  cats[s.category] = (cats[s.category] || 0) + 1;
}
console.info("Category breakdown:");
console.info(JSON.stringify(cats, null, 2));
