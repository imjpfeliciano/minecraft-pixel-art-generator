import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright output — regenerated on every run, never linted.
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
    // `/fix-issue` agent worktrees — full second checkouts of the repo, linted
    // on their own branch, never from here.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
