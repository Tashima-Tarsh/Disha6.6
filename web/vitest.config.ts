import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "../.disha/**", "../disha/**"],
    env: {
      NODE_ENV: "test",
      DISHA_DEV_PASSWORD: "devpassword1234",
    },
  },
});
