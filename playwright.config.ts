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
      // Fake/local Firebase config for emulator mode. These values point to the
      // local Firebase emulator suite and are never sent to real Firebase.
      NEXT_PUBLIC_FB_API_KEY: 'fake-api-key-for-e2e-tests',
      NEXT_PUBLIC_AUTH_DOMAIN: 'dev-oh-shit.firebaseapp.com',
      NEXT_PUBLIC_PROJECT_ID: 'dev-oh-shit',
      NEXT_PUBLIC_DB_URL: 'http://localhost:9000?ns=dev-oh-shit',
      NEXT_PUBLIC_CLOUD_FUNCTION_URL: 'http://localhost:5001/dev-oh-shit/us-central1/api',
      NEXT_PUBLIC_STORAGE_BUCKET: '',
      NEXT_PUBLIC_MESSAGING_SENDER_ID: '',
      NEXT_PUBLIC_APP_ID: 'fake-app-id',
    },
  },
})
