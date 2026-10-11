import { defineConfig } from '@playwright/test'

// Scaffold only (T02): real journeys are added with T08/T15/T23. Needs API + DB running (see compose.yaml).
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173' },
  webServer: process.env.E2E_NO_SERVER ? undefined : {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
})
