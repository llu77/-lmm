import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60000,
  use: { headless: true, baseURL: process.env.BASE_URL || 'http://localhost:5173', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { channel: 'chrome' } }],
});
