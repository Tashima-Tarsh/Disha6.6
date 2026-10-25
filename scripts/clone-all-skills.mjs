import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const targetRepos = [
  { name: "qcmuu_ai_research", url: "https://github.com/qcmuu/AI-Research-Skills.git" },
  { name: "k_dense_scientific_skills", url: "https://github.com/K-Dense-AI/scientific-agent-skills.git" },
  { name: "kalaris_research_skills", url: "https://github.com/KalarisLabs/research-agent-skills.git" },
  { name: "claude_network_skills", url: "https://github.com/arsallls/claude-network-skills.git" },
  { name: "secdoc_ai_skills", url: "https://github.com/secdoc/AI-Agent-Skills.git" },
  { name: "orchestra_ai_research", url: "https://github.com/Orchestra-Research/AI-research-SKILLs.git" },
  { name: "graphify", url: "https://github.com/Graphify-Labs/graphify.git" },
  { name: "gns3_skills", url: "https://github.com/GNS3/gns3-skills.git" },
  { name: "borghei_claude_skills", url: "https://github.com/Ck1sap/borghei-Claude-Skills.git" },
];

const cloneBase = path.resolve(".tmp_clones");
if (!fs.existsSync(cloneBase)) {
  fs.mkdirSync(cloneBase, { recursive: true });
}

for (const repo of targetRepos) {
  const dest = path.join(cloneBase, repo.name);
  if (fs.existsSync(dest)) {
    console.log(`[EXISTS] ${repo.name}`);
    continue;
  }
  console.log(`[CLONING] ${repo.name} from ${repo.url}...`);
  try {
    execSync(`git clone --depth 1 ${repo.url} "${dest}"`, { stdio: "inherit", timeout: 60000 });
    console.log(`[DONE] ${repo.name}`);
  } catch (err) {
    console.error(`[ERROR] Failed to clone ${repo.name}:`, err.message);
  }
}

