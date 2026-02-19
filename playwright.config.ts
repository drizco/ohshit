import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Fake Firebase config for emulator mode. In dev mode (NODE_ENV=development),
      // firebase.ts hard-codes emulator URLs, so these values are never sent to
      // real Firebase and the SDK only requires them to be non-empty strings.
      NEXT_PUBLIC_FB_API_KEY: 'fake-api-key-for-e2e-tests',
      NEXT_PUBLIC_AUTH_DOMAIN: 'demo-oopsie-poopsie.firebaseapp.com',
      NEXT_PUBLIC_PROJECT_ID: 'demo-oopsie-poopsie',
      NEXT_PUBLIC_DB_URL: '',
      NEXT_PUBLIC_STORAGE_BUCKET: '',
      NEXT_PUBLIC_MESSAGING_SENDER_ID: '',
      NEXT_PUBLIC_APP_ID: 'fake-app-id',
    },
  },
})
