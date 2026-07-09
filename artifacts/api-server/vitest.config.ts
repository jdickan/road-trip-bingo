import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    // Tests share one database; run files sequentially to avoid TRUNCATE races.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
