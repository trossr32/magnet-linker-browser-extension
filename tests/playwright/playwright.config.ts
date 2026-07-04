import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './extension.tests',
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
  // Serve the deterministic fixture page; no third-party sites are involved.
  webServer: {
    command: 'npx --yes http-server ../../Test -p 8123 -c-1 --silent',
    url: 'http://127.0.0.1:8123/magnet-test.html',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
