import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Database tests need a real Postgres; keep them opt-in via DATABASE_URL_TEST.
    hookTimeout: 60_000,
    testTimeout: 60_000,
    fileParallelism: false,
  },
});
