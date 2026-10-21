import { defineConfig } from '@playwright/test'

// Real journeys against API + seeded DB (see compose.yaml). Start the API with AUTH_RATE_LIMIT_MAX raised: specs log in often.
export default defineConfig({
  testDir: './e2e',
  workers: 1, // every spec shares one seeded dev DB (same lots, same buyers): parallel files race each other's bids
  use: { baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173' },
  webServer: process.env.E2E_NO_SERVER ? undefined : {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
})
