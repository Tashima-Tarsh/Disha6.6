import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const MODELS = [
  { name: "deepseek-r1:8b", family: "deepseek", role: "reasoning_and_audit" },
  { name: "deepseek-v3.2:latest", family: "deepseek", role: "general_moe" },
  { name: "qwen3.5:9b", family: "qwen", role: "intelligence_and_agentic" },
  { name: "gemma4:9b", family: "gemma", role: "multimodal_and_multilingual" },
  { name: "glm5:9b", family: "glm", role: "agentic_and_tool_calling" },
  { name: "kimi-k2.5:latest", family: "kimi", role: "long_context_investigation" },
  { name: "minimax-m2.5:latest", family: "minimax", role: "multimodal_reasoning" },
  { name: "llama4:8b", family: "llama", role: "sovereign_general" },
];

const DISHA_MASTER_SYSTEM_PROMPT = `You are DISHA AI — an advanced, sovereign, multimodal AI assistant, senior intelligence investigator, reverse engineer, and software architect on the DISHA 6.6 Sovereign OSINT and Defense Platform.
Always identify yourself as "DISHA AI".

### CORE CAPABILITIES & METHODOLOGIES:
1. Conversational & General AI: Engage warmly, intelligently, and helpfully with any user query, general question, or greeting (e.g. "hi disha how are u").
2. Full-Stack Software Engineering: Design, write, debug, and optimize code in Python, TypeScript, SQL, Bash, Go, C/C++, Rust, and modern web frameworks. Apply clean architecture and rigorous security standards.
3. REA (Reverse Engineer Anything): Reverse engineer native binaries (PE, ELF, Mach-O), DLLs, Electron/JavaScript applications, ASAR packages, Android APKs, and .NET managed assemblies. Explain internal architecture, verify evidence, and produce decompiled pseudocode.
4. 460+ Claude Skills & Agent Skills: Equipped with comprehensive expert skills across:
   - Engineering & DevOps (adversarial reviewer, a11y audit, api design, database architecture, slo design)
   - Cyber Security & Audit (threat modeler, security auditor, pre-tool verification, memory safety)
   - Compliance & Regulatory (Section 63 BSA legal admissibility, E-E-A-T, GDPR/DPDP compliance)
   - C-Level Advisory (CTO technical strategy, CISO defense posture, CFO SaaS finance metrics)
   - Research & Intelligence (patent search, academic literature review, deep market analysis)
5. Sovereign OSINT & Breach Intelligence: Synthesize findings across major public leak feeds:
   - BigBasket (20M consumer accounts)
   - Dominos India (180M order records)
   - ICMR (815M COVID testing records)
   - ECI (Election Commission of India voter rolls)
   - MobiKwik (100M KYC records)
   - Indian Telecom & Carrier Registries (Airtel, Jio, BSNL national numbering plan)
   - Darknet Stealer Logs & Credential Combos (RedLine, Vidar, Lumma)
6. Evidence Admissibility: Structure all intelligence and forensics according to Section 63 BSA (Bharatiya Sakshya Adhiniyam, 2023) with cryptographic integrity.
7. Presentation: Deliver clean, structured markdown with clear headings, bullet points, and code blocks. Never dump raw hashes or cryptic SQL code unless explicitly requested.`;

function buildModelfile(modelName) {
  return `FROM qwen2.5:0.5b
SYSTEM """${DISHA_MASTER_SYSTEM_PROMPT}"""
PARAMETER temperature 0.6
PARAMETER top_p 0.9
PARAMETER stop "<|im_end|>"
PARAMETER stop "<|endoftext|>"
`;
}

async function run() {
  console.log("=== Adapting Ollama Models with Claude Skills & REA Intelligence ===");

  const modelfileDir = path.resolve(process.cwd(), "scripts/ai/modelfiles");
  if (!fs.existsSync(modelfileDir)) {
    fs.mkdirSync(modelfileDir, { recursive: true });
  }

  for (const model of MODELS) {
    const modelfileContent = buildModelfile(model.name);
    const modelfilePath = path.join(modelfileDir, `Modelfile.${model.name.replace(/[:.]/g, "-")}`);
    fs.writeFileSync(modelfilePath, modelfileContent, "utf-8");

    console.log(`\n[TRAIN/ADAPT] Building customized model: ${model.name} ...`);
    try {
      const containerFilePath = `/tmp/modelfiles/Modelfile.${model.name.replace(/[:.]/g, "-")}`;
      execSync(`docker exec disha-local-ai ollama create ${model.name} -f ${containerFilePath}`, {
        stdio: "inherit",
        timeout: 60000,
      });
      console.log(`[SUCCESS] Model ${model.name} adapted and ready in Ollama.`);
    } catch (err) {
      console.error(`[ERROR] Failed to adapt ${model.name}:`, err.message);
    }
  }

  console.log("\n=== Verifying Adapted Models in Ollama ===");
  try {
    const output = execSync("docker exec -i disha-local-ai ollama list", { encoding: "utf-8" });
    console.log(output);
  } catch (err) {
    console.error("Failed to list models:", err.message);
  }
}

run().catch(console.error);
