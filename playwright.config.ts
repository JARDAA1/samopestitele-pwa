import { defineConfig, devices } from '@playwright/test';

// Použij produkční URL nebo localhost
const baseURL = process.env.BASE_URL || 'https://samopestitele.cz';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    ...devices['iPhone 13'],
  },
  projects: [
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  // WebServer pouze pro localhost
  ...(baseURL.includes('localhost') && {
    webServer: {
      command: 'npx expo start --web --port 8081',
      url: 'http://localhost:8081',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
  }),
});
