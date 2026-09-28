import { defineConfig, devices } from '@playwright/test';

// E2E runs against the dev server and the hse-dev database. Test data lives in its own
// group/lesson created by tests/e2e/global-setup.ts and removed in global-teardown.ts.
// Env (.env.local) is loaded by tests/e2e/db.ts, NOT here: loading it in the runner leaks the
// already-expanded values into the dev server it spawns, where the bcrypt hash gets mangled.

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'ru-RU',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
