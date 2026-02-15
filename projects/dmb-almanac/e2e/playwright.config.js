import { defineConfig, devices } from '@playwright/test';

// Rust E2E is intended to run against an already-running Rust server.
// The cutover scripts control server lifecycle and set BASE_URL.

export default defineConfig({
  testDir: './tests/e2e',
  // Rust E2E mutates origin-scoped storage heavily; full intra-file parallelism
  // causes non-deterministic contention and flaky timeouts.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Keep local runs reasonably fast while avoiding import/IDB contention storms.
  workers: process.env.CI ? 1 : 3,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    process.env.CI ? ['github'] : ['list']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    timezoneId: 'America/New_York',
    serviceWorkers: 'allow'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-features=SpeculationRulesPrefetchProxy',
            '--enable-experimental-web-platform-features'
          ]
        }
      }
    }
  ]
});
