import { execSync } from "node:child_process";

const repos = [
  "https://github.com/VoltAgent/awesome-agent-skills.git",
  "https://github.com/qcmuu/AI-Research-Skills.git",
  "https://github.com/K-Dense-AI/scientific-agent-skills.git",
  "https://github.com/K-Dense-AI/scientific-agents.git",
  "https://github.com/KalarisLabs/research-agent-skills.git",
  "https://github.com/obra/superpowers.git",
  "https://github.com/addyosmani/agent-skills.git",
  "https://github.com/arsallls/claude-network-skills.git",
  "https://github.com/secdoc/AI-Agent-Skills.git",
  "https://github.com/anthropics/skills.git",
  "https://github.com/openai/skills.git",
  "https://github.com/Graphify-Labs/graphify.git",
  "https://github.com/Orchestra-Research/AI-research-SKILLs.git",
  "https://github.com/vercel-labs/agent-skills.git",
  "https://github.com/GNS3/gns3-skills.git",
  "https://github.com/Ck1sap/borghei-Claude-Skills.git",
];

for (const repo of repos) {
  try {
    const res = execSync(`git ls-remote --heads ${repo}`, { encoding: "utf8", timeout: 10000 });
    const firstLine = res.trim().split("\n")[0] || "";
    const branch = firstLine.split("\t")[1] || "ok";
    console.log(`[REACHABLE] ${repo} -> ${branch}`);
  } catch (err) {
    console.log(`[FAILED] ${repo} -> ${err.message.slice(0, 80)}`);
  }
}

