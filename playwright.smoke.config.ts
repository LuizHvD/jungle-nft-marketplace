import { defineConfig, devices } from '@playwright/test'

const smokeUrl = process.env.SMOKE_URL ?? 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'smoke-deploy.spec.ts',
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: smokeUrl,
    trace: 'retain-on-failure',
  },
})
