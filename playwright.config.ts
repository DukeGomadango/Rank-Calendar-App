import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const hasE2EAuthEnv = !!(
  process.env.E2E_TEST_SECRET &&
  process.env.E2E_TEST_USER_EMAIL &&
  process.env.E2E_TEST_USER_PASSWORD
);
const hasStoredAuthState = fs.existsSync("e2e/.auth/user.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "landing",
      testMatch: /(landing|auth)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    ...(hasE2EAuthEnv || hasStoredAuthState
      ? ([
          {
            name: "authenticated",
            testMatch: /(dashboard|schedule)\.spec\.ts/,
            use: {
              ...devices["Desktop Chrome"],
              storageState: "e2e/.auth/user.json",
            },
          },
        ] as const)
      : ([] as const)),
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
