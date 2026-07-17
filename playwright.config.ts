import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for DemAI (Prompt 12.4). One spec, demo mode, Chromium.
 * The webServer boots `next dev` on :3000 and is reused if already running
 * (so `npm run dev` + `npm run e2e` work together locally). The spec drives
 * `?demo=1` URLs so it never depends on venue Wi-Fi (DESIGN §7).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    viewport: { width: 430, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
    cwd: __dirname,
  },
});
