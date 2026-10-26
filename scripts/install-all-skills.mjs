import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

console.info("=== DISHA 6.6 AGENT SKILLS & ROLES MASTER INSTALLER ===");

const AGENTS_SKILLS_DIR = path.resolve(".agents/skills");
const AGENTS_ROLES_DIR = path.resolve(".agents/roles");
const PACKAGES_SKILLS_DIR = path.resolve("packages/skills");

fs.mkdirSync(AGENTS_SKILLS_DIR, { recursive: true });
fs.mkdirSync(AGENTS_ROLES_DIR, { recursive: true });
fs.mkdirSync(PACKAGES_SKILLS_DIR, { recursive: true });

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name === ".git" || ent.name === "node_modules") continue;
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function normalizeSkill(skillDir, defaultName, defaultCategory = "general") {
  const skillFile = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(skillFile)) return;

  let content = fs.readFileSync(skillFile, "utf-8");
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!fmMatch) {
    // Generate frontmatter from content
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : defaultName;
    const firstPara = content.replace(/^#\s+.+$/m, "").trim().split("\n\n")[0] || `${title} capability`;
    const cleanDesc = firstPara.replace(/\r?\n/g, " ").replace(/["']/g, "").slice(0, 200).trim();

    const newFrontmatter = `---\nname: "${title}"\ndescription: "${cleanDesc}"\ncategory: "${defaultCategory}"\n---\n\n`;
    fs.writeFileSync(skillFile, newFrontmatter + content, "utf-8");
  } else {
    // Ensure category is in frontmatter if not present
    let fm = fmMatch[1];
    if (!fm.includes("category:")) {
      fm += `\ncategory: "${defaultCategory}"`;
      content = content.replace(fmMatch[0], `---\n${fm.trim()}\n---`);
      fs.writeFileSync(skillFile, content, "utf-8");
    }
  }
}

// -------------------------------------------------------------
// 1. INSTALL 503 SCIENTIFIC & ENGINEERING EXPERT ROLES
// -------------------------------------------------------------
console.info("Installing 503 Scientific & Engineering Expert Profiles...");
const sciSrc = path.resolve(".tmp_scientific_agents/scientific-agents");
if (fs.existsSync(sciSrc)) {
  const roles = fs.readdirSync(sciSrc, { withFileTypes: true });
  let count = 0;
  for (const r of roles) {
    if (!r.isDirectory()) continue;
    const srcDir = path.join(sciSrc, r.name);
    const destDir = path.join(AGENTS_ROLES_DIR, r.name);
    copyDirRecursive(srcDir, destDir);

    // Also install as a callable specialized agent skill in .agents/skills/
    const skillDestDir = path.join(AGENTS_SKILLS_DIR, `agent-${r.name}`);
    fs.mkdirSync(skillDestDir, { recursive: true });
    const agentsMdPath = path.join(srcDir, "AGENTS.md");
    if (fs.existsSync(agentsMdPath)) {
      const rawText = fs.readFileSync(agentsMdPath, "utf-8");
      const title = r.name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      let cat = "scientific-computing";
      if (r.name.includes("security")) cat = "cybersecurity";
      else if (r.name.includes("network")) cat = "computer-networking";
      else if (r.name.includes("ai") || r.name.includes("learning") || r.name.includes("neural") || r.name.includes("nlp") || r.name.includes("vision")) cat = "ai-research";
      else if (r.name.includes("software") || r.name.includes("architect") || r.name.includes("systems") || r.name.includes("engineer")) cat = "software-engineering";

      const frontmatter = `---\nname: "${title} Expert Agent"\ndescription: "Specialized expert agent operating as a ${title} with full theoretical and practical domain reasoning."\ncategory: "${cat}"\n---\n\n`;
      fs.writeFileSync(path.join(skillDestDir, "SKILL.md"), frontmatter + rawText, "utf-8");
    }
    count++;
  }
  console.info(`✓ Installed ${count} expert roles into ${AGENTS_ROLES_DIR} and .agents/skills/agent-*/`);
}

// -------------------------------------------------------------
// 2. INSTALL ADDY OSMANI AGENT SKILLS (Software Engineering)
// -------------------------------------------------------------
console.info("Installing Addy Osmani Software Engineering Agent Skills...");
const addySrc = path.resolve(".tmp_agent_skills/skills");
if (fs.existsSync(addySrc)) {
  const dirs = fs.readdirSync(addySrc, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const dest = path.join(AGENTS_SKILLS_DIR, d.name);
    copyDirRecursive(path.join(addySrc, d.name), dest);
    normalizeSkill(dest, d.name, "software-engineering");
  }
  console.info(`✓ Installed Addy Osmani skills`);
}

// -------------------------------------------------------------
// 3. INSTALL OBRA SUPERPOWERS
// -------------------------------------------------------------
console.info("Installing Obra Superpowers...");
const spSrc = path.resolve(".tmp_clones/superpowers/skills");
if (fs.existsSync(spSrc)) {
  const dirs = fs.readdirSync(spSrc, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const dest = path.join(AGENTS_SKILLS_DIR, `sp-${d.name}`);
    copyDirRecursive(path.join(spSrc, d.name), dest);
    normalizeSkill(dest, `Superpower ${d.name}`, "software-engineering");
  }
  console.info(`✓ Installed Obra Superpowers skills`);
}

// -------------------------------------------------------------
// 4. INSTALL QCMUU AI RESEARCH SKILLS (99 Skills)
// -------------------------------------------------------------
console.info("Installing qcmuu AI Research Skills (99 skills)...");
const qcSrc = path.resolve(".tmp_clones/qcmuu_ai_research");
if (fs.existsSync(qcSrc)) {
  const topDirs = fs.readdirSync(qcSrc, { withFileTypes: true });
  let count = 0;
  for (const td of topDirs) {
    if (!td.isDirectory() || td.name.startsWith(".")) continue;
    const subPath = path.join(qcSrc, td.name);
    // Check if subPath directly has SKILL.md
    if (fs.existsSync(path.join(subPath, "SKILL.md"))) {
      const dest = path.join(AGENTS_SKILLS_DIR, `qc-${td.name}`);
      copyDirRecursive(subPath, dest);
      normalizeSkill(dest, td.name, "ai-research");
      count++;
    } else {
      // Check subdirectories
      try {
        const subDirs = fs.readdirSync(subPath, { withFileTypes: true });
        for (const sd of subDirs) {
          if (!sd.isDirectory()) continue;
          const leafPath = path.join(subPath, sd.name);
          if (fs.existsSync(path.join(leafPath, "SKILL.md"))) {
            const dest = path.join(AGENTS_SKILLS_DIR, `qc-${sd.name}`);
            copyDirRecursive(leafPath, dest);
            normalizeSkill(dest, `${td.name} - ${sd.name}`, "ai-research");
            count++;
          }
        }
      } catch {}
    }
  }
  console.info(`✓ Installed ${count} qcmuu AI research skills`);
}

// -------------------------------------------------------------
// 5. INSTALL K-DENSE SCIENTIFIC SKILLS (177 Skills)
// -------------------------------------------------------------
console.info("Installing K-Dense Scientific Skills (177 skills)...");
const kdSrc = path.resolve(".tmp_clones/k_dense_scientific_skills/skills");
if (fs.existsSync(kdSrc)) {
  const dirs = fs.readdirSync(kdSrc, { withFileTypes: true });
  let count = 0;
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const dest = path.join(AGENTS_SKILLS_DIR, `kd-${d.name}`);
    copyDirRecursive(path.join(kdSrc, d.name), dest);
    normalizeSkill(dest, d.name, "scientific-computing");
    count++;
  }
  console.info(`✓ Installed ${count} K-Dense scientific skills`);
}

// -------------------------------------------------------------
// 6. INSTALL KALARIS RESEARCH SKILLS (281 Skills)
// -------------------------------------------------------------
console.info("Installing Kalaris Research Skills (281 skills)...");
const kalSrc = path.resolve(".tmp_clones/kalaris_research_skills");
if (fs.existsSync(kalSrc)) {
  function findKalarisSkills(dir) {
    let list = [];
    try {
      const ents = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of ents) {
        if (ent.name === ".git" || ent.name === "node_modules") continue;
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          if (fs.existsSync(path.join(p, "SKILL.md"))) {
            list.push(p);
          } else {
            list.push(...findKalarisSkills(p));
          }
        }
      }
    } catch {}
    return list;
  }
  const kList = findKalarisSkills(kalSrc);
  let count = 0;
  for (const kPath of kList) {
    const leaf = path.basename(kPath);
    const dest = path.join(AGENTS_SKILLS_DIR, `kal-${leaf}`);
    copyDirRecursive(kPath, dest);
    normalizeSkill(dest, `Kalaris ${leaf}`, "scientific-computing");
    count++;
  }
  console.info(`✓ Installed ${count} Kalaris research skills`);
}

// -------------------------------------------------------------
// 7. INSTALL CLAUDE NETWORK SKILLS (arsallls)
// -------------------------------------------------------------
console.info("Installing Claude Network Skills (arsallls)...");
const netSrc = path.resolve(".tmp_clones/claude_network_skills/skills");
if (fs.existsSync(netSrc)) {
  const dirs = fs.readdirSync(netSrc, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const dest = path.join(AGENTS_SKILLS_DIR, `net-${d.name}`);
    copyDirRecursive(path.join(netSrc, d.name), dest);
    normalizeSkill(dest, `Network ${d.name}`, "computer-networking");
  }
  console.info(`✓ Installed Claude network skills`);
}

// -------------------------------------------------------------
// 8. UNPACK SECDOC AI SKILLS
// -------------------------------------------------------------
console.info("Unpacking and installing SecDoc AI Agent Skills...");
const secSrc = path.resolve(".tmp_clones/secdoc_ai_skills");
if (fs.existsSync(secSrc)) {
  const pythonUnzipScript = `
import zipfile, os, sys

sec_dir = r"${secSrc.replace(/\\/g, "/")}"
out_dir = r"${AGENTS_SKILLS_DIR.replace(/\\/g, "/")}"

for f in os.listdir(sec_dir):
    if f.endswith(".skill") or f.endswith(".zip"):
        stem = f.replace(".skill", "").replace(".zip", "")
        archive_path = os.path.join(sec_dir, f)
        target_dir = os.path.join(out_dir, "secdoc-" + stem)
        os.makedirs(target_dir, exist_ok=True)
        try:
            with zipfile.ZipFile(archive_path, 'r') as z:
                z.extractall(target_dir)
            # Check if extracted inside subfolder
            items = os.listdir(target_dir)
            if len(items) == 1 and os.path.isdir(os.path.join(target_dir, items[0])):
                sub = os.path.join(target_dir, items[0])
                for subf in os.listdir(sub):
                    os.replace(os.path.join(sub, subf), os.path.join(target_dir, subf))
                os.rmdir(sub)
        except Exception as e:
            print(f"Error extracting {f}: {e}")
`;
  try {
    execSync(`python -c "${pythonUnzipScript.replace(/\n/g, " ")}"`, { stdio: "inherit" });
    // Normalize extracted secdoc skills
    const installed = fs.readdirSync(AGENTS_SKILLS_DIR).filter(d => d.startsWith("secdoc-"));
    for (const d of installed) {
      normalizeSkill(path.join(AGENTS_SKILLS_DIR, d), d.replace("secdoc-", ""), "cybersecurity");
    }
    console.info(`✓ Unpacked ${installed.length} SecDoc skills`);
  } catch (err) {
    console.warn("Failed python unzip for secdoc:", err.message);
  }
}

// -------------------------------------------------------------
// 9. CONVERT & INSTALL GNS3 PROTOCOL TROUBLESHOOTING SKILLS
// -------------------------------------------------------------
console.info("Installing GNS3 Network Protocol Troubleshooting Skills...");
const gns3InjSrc = path.resolve(".tmp_clones/gns3_skills/injection");
if (fs.existsSync(gns3InjSrc)) {
  const pythonGns3Script = `
import yaml, os, sys

gns3_dir = r"${gns3InjSrc.replace(/\\/g, "/")}"
out_dir = r"${AGENTS_SKILLS_DIR.replace(/\\/g, "/")}"

for f in os.listdir(gns3_dir):
    if not (f.endswith(".yaml") or f.endswith(".yml")):
        continue
    stem = f.replace(".yaml", "").replace(".yml", "")
    full_path = os.path.join(gns3_dir, f)
    try:
        with open(full_path, 'r', encoding='utf-8') as yf:
            data = yaml.safe_load(yf)
        if not data:
            continue
        name = data.get("name", stem.replace("_", " ").title())
        desc = data.get("description", "GNS3 Network protocol fault injection and troubleshooting skill.")
        protocols = data.get("protocols", [])
        issues = data.get("issues", {})

        target_dir = os.path.join(out_dir, f"gns3-{stem.replace('_', '-')}")
        os.makedirs(target_dir, exist_ok=True)

        md_content = f"""---
name: "{name}"
description: "{desc}"
category: "computer-networking"
---

# {name}

{desc}

## Supported Protocols
{chr(10).join([f"- {p}" for p in protocols]) if protocols else "- General IP Routing"}

## Fault Injection Scenarios & Troubleshooting Procedures

"""
        if isinstance(issues, dict):
            for issue_key, issue_info in issues.items():
                if not isinstance(issue_info, dict):
                    continue
                i_name = issue_info.get("name", issue_key)
                i_desc = issue_info.get("description", "")
                i_sev = issue_info.get("severity", "medium")
                i_symptoms = issue_info.get("symptoms", [])
                i_hints = issue_info.get("troubleshooting_hints", [])

                md_content += f"### {i_name} (Severity: {i_sev.upper()})\\n\\n"
                md_content += f"{i_desc}\\n\\n"
                if i_symptoms:
                    md_content += "**Diagnostic Symptoms:**\\n"
                    for s in i_symptoms:
                        md_content += f"- {s}\\n"
                    md_content += "\\n"
                if i_hints:
                    md_content += "**Troubleshooting Commands & Remediation:**\\n"
                    for h in i_hints:
                        md_content += f"- \`{h}\`\\n"
                    md_content += "\\n"

        with open(os.path.join(target_dir, "SKILL.md"), "w", encoding="utf-8") as outf:
            outf.write(md_content)
    except Exception as e:
        print(f"Error converting {f}: {e}")
`;
  try {
    execSync(`python -c "${pythonGns3Script.replace(/\n/g, " ")}"`, { stdio: "inherit" });
    console.info(`✓ Installed GNS3 network protocol skills`);
  } catch (err) {
    console.warn("Failed GNS3 conversion:", err.message);
  }
}

// -------------------------------------------------------------
// 10. INSTALL GRAPHIFY (Code Knowledge-Graph Engine)
// -------------------------------------------------------------
console.info("Installing Graphify Code Knowledge-Graph Engine...");
const graphifySrc = path.resolve(".tmp_clones/graphify");
if (fs.existsSync(graphifySrc)) {
  const graphifySkillDest = path.join(AGENTS_SKILLS_DIR, "graphify");
  fs.mkdirSync(graphifySkillDest, { recursive: true });
  copyDirRecursive(path.join(graphifySrc, "graphify"), path.join(PACKAGES_SKILLS_DIR, "graphify"));

  const graphifySkillMd = path.join(graphifySrc, "graphify/skill.md");
  if (fs.existsSync(graphifySkillMd)) {
    fs.copyFileSync(graphifySkillMd, path.join(graphifySkillDest, "SKILL.md"));
    normalizeSkill(graphifySkillDest, "Graphify Code Knowledge Graph", "cognitive-memory");
  } else {
    const defaultGraphifyMd = `---
name: "Graphify Codebase Knowledge Graph"
description: "Turn any codebase into a queryable knowledge graph with symbols, call graphs, AST dependencies, and semantic community clusters."
category: "cognitive-memory"
---

# Graphify Code Knowledge Graph

Graphify converts source code into a multidimensional knowledge graph linking symbols, functions, classes, dependencies, and execution flows.
`;
    fs.writeFileSync(path.join(graphifySkillDest, "SKILL.md"), defaultGraphifyMd, "utf-8");
  }
  console.info(`✓ Installed Graphify into .agents/skills/graphify and packages/skills/graphify`);
}

// -------------------------------------------------------------
// 11. INSTALL ANTHROPIC, OPENAI, VERCEL & ORCHESTRA SKILLS
// -------------------------------------------------------------
console.info("Installing Anthropic, OpenAI, Vercel, and Orchestra skills...");

function installStandardRepoSkills(repoName, prefix, defaultCat) {
  const repoDir = path.resolve(`.tmp_clones/${repoName}`);
  if (!fs.existsSync(repoDir)) return;
  function walk(d) {
    try {
      const ents = fs.readdirSync(d, { withFileTypes: true });
      for (const ent of ents) {
        if (ent.name === ".git" || ent.name === "node_modules") continue;
        const p = path.join(d, ent.name);
        if (ent.isDirectory()) {
          if (fs.existsSync(path.join(p, "SKILL.md"))) {
            const dest = path.join(AGENTS_SKILLS_DIR, `${prefix}-${ent.name}`);
            copyDirRecursive(p, dest);
            normalizeSkill(dest, `${prefix} ${ent.name}`, defaultCat);
          } else {
            walk(p);
          }
        }
      }
    } catch {}
  }
  walk(repoDir);
}

installStandardRepoSkills("anthropics_skills", "anthropic", "software-engineering");
installStandardRepoSkills("openai_skills", "openai", "software-engineering");
installStandardRepoSkills("vercel_skills", "vercel", "design-frontend");
installStandardRepoSkills("orchestra_ai_research", "orch", "ai-research");

console.info("✓ All skill sources successfully copied and normalized.");
