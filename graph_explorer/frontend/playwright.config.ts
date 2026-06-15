import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the Graph Explorer frontend.
 *
 * The frontend dev server (Vite, :5173) is started automatically. The backend
 * (:8001) and a populated FalkorDB are assumed to be already running — see
 * graph_explorer/README.md. Override the frontend URL with E2E_BASE_URL.
 */
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    // Locally, reuse a dev server you already have running; in CI always start fresh.
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
