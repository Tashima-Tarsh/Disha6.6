import { fileURLToPath } from "node:url";
import { discoverUpstreams } from "./discover-upstreams.mjs";
import { classifyUpstreams } from "./classify-upstreams.mjs";
import { checkForks } from "./fork-upstreams.mjs";
import { generateManifests } from "./generate-manifests.mjs";

export async function buildTools() {
  console.info("=== DISHA 6.6 OSINT Tool Build Pipeline ===");
  console.info("[1/4] Discovering and merging upstreams...");
  await discoverUpstreams();

  console.info("[2/4] Classifying tool runtimes and capabilities...");
  await classifyUpstreams();

  console.info("[3/4] Verifying forks under organization...");
  await checkForks();

  console.info("[4/4] Generating TypeScript tool manifests...");
  await generateManifests();

  console.info("=== Build pipeline successfully completed! ===");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildTools().catch((err) => {
    console.error("Build pipeline error:", err);
    process.exitCode = 1;
  });
}
