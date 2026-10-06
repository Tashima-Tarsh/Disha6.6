import { fileURLToPath } from "node:url";
import { buildTools } from "./build-tools.mjs";
import { smokeAll } from "./smoke-all.mjs";
import { generateReport } from "./report.mjs";

export async function bootstrap() {
  console.info("=== DISHA 6.6 OSINT UPSTREAM BOOTSTRAP ===");
  console.info("[STEP 1] Building tool registry and generating manifests...");
  await buildTools();

  console.info("[STEP 2] Running initial runtime health and smoke probes...");
  await smokeAll();

  console.info("[STEP 3] Generating runtime report artifacts...");
  await generateReport();

  console.info("=== OSINT UPSTREAM BOOTSTRAP FINISHED SUCCESSFULLY ===");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  bootstrap().catch((err) => {
    console.error("Bootstrap error:", err);
    process.exitCode = 1;
  });
}
