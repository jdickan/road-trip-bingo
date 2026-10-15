import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

// Basic correctness baseline, not a formatting rewrite or typed rule set.
export default [
  {
    ignores: [
      "**/node_modules/**", "**/dist/**", "**/.cache/**",
      "**/*.generated.*", "artifacts/mockup-sandbox/**",
      "lib/api-client-react/**", "lib/api-zod/**", "lib/api-spec/**",
      "attached_assets/**", ".local/**",
    ],
  },
  {
    files: [
      "artifacts/api-server/src/**/*.ts",
      "artifacts/bingo-db/src/**/*.{ts,tsx}",
      "lib/db/src/**/*.ts",
      "scripts/src/**/*.ts",
    ],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      ...js.configs.recommended.rules,
      // TS checks names; core unused-vars incorrectly flags TS type signatures.
      "no-undef": "off",
      "no-unused-vars": "off",
      // Existing catch blocks intentionally ignore non-critical cleanup errors.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
