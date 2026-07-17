import { defineConfig } from "vitest/config";

/**
 * Vitest config — unit tests for the risk/pollen/threshold engines.
 * Excludes the Playwright `e2e/` specs (those run under `@playwright/test`
 * via `npm run e2e`, not vitest).
 */
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
});
