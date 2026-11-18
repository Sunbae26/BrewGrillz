import { defineConfig, devices } from "@playwright/test";

// Browser tests run against the built site (`npm run build && npm run preview` in frontend)
// and the local API (`npm run dev` in backend). See qa/README.md.
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "results/e2e.json" }]],
  outputDir: "results/artifacts",
  use: {
    baseURL: process.env.QA_SITE ?? "http://localhost:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    timezoneId: "Asia/Singapore",
    locale: "en-SG",
    launchOptions: { executablePath: process.env.QA_CHROMIUM },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
});
