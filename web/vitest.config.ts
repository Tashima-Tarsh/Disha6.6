import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    testTimeout: 20000,
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "../.disha/**", "../disha/**"],
    env: {
      NODE_ENV: "test",
      DISHA_DEV_PASSWORD: "devpassword1234",
      DISHA_JWT_SECRET: "test-secret-at-least-32-characters-long-disha-jwt-key",
    },
  },
});
