import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const patchedVitals = nextVitals.map((cfg) => {
  if (cfg.rules) {
    const rules = { ...cfg.rules };
    for (const key of Object.keys(rules)) {
      if (key.includes("set-state-in-effect") || key.includes("no-unescaped-entities") || key.includes("purity")) {
        rules[key] = "warn";
      }
    }
    return { ...cfg, rules };
  }
  return cfg;
});

export default defineConfig([
  ...patchedVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
