import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './demo',
  timeout: 10000,
  expect: {
    timeout: 3000
  },
  fullyParallel: false,
  reporter: 'list',
  use: {
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
