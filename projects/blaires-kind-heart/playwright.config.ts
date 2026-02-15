import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT ?? "4173";
const baseURL = `http://127.0.0.1:${port}`;
const includeWebkit = process.env.E2E_WEBKIT === "1";
const reportRoot = process.env.PLAYWRIGHT_REPORT_DIR ?? "artifacts/playwright";
const reporter = [
  ["list"],
  ["html", { open: "never", outputFolder: `${reportRoot}/html` }],
  ["json", { outputFile: `${reportRoot}/results.json` }],
  ["junit", { outputFile: `${reportRoot}/results.xml` }]
];

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: includeWebkit ? false : true,
  workers: includeWebkit ? 1 : process.env.CI ? 4 : "75%",
  retries: process.env.CI ? 2 : 0,
  reporter,
  use: {
    baseURL,
    serviceWorkers: "block",
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: `DIST_DIR=.e2e-dist SYMBOLIZED_RELEASE=0 bash scripts/build-verify-release.sh && python3 -m http.server ${port} --bind 127.0.0.1 --directory .e2e-dist`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /webkit\.smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] }
    },
    ...(includeWebkit
      ? [
          {
            name: "webkit-smoke",
            testMatch: /webkit\.smoke\.spec\.ts/,
            retries: process.env.CI ? 2 : 1,
            use: { ...devices["Desktop Safari"] }
          }
        ]
      : [])
  ]
});
