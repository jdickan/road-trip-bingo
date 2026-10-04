import { defineConfig } from "vitest/config";

// Auth regression tests mock the data router and never connect to a database.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/security-tests/**/*.test.ts"],
  },
});