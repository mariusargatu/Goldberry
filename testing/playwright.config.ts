import { defineConfig } from '@playwright/test'

const GOLDBERRY_PORT = Number(process.env.GOLDBERRY_PORT ?? 4173)
const GOLDBERRY_ORIGIN = `http://localhost:${GOLDBERRY_PORT}`

const demo = process.env.GOLDBERRY_INSPECTOR === 'on'

const record = demo && process.env.DEMO_VIDEO === 'on'
const DEMO_SIZE = { width: 1440, height: 900 }

export default defineConfig({
  testDir: '.',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: GOLDBERRY_ORIGIN,
    headless: !demo || record,
    viewport: demo ? DEMO_SIZE : { width: 1280, height: 800 },
    video: record ? { mode: 'on', size: DEMO_SIZE } : 'off',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'regression',
      testMatch: 'mbt/regression.spec.ts',
      timeout: 180_000,
    },
    {
      name: 'exploration',
      testMatch: 'bombadil/exploration.spec.ts',
      timeout: 10 * 60_000,
      expect: { timeout: 1_000 },
      use: { trace: 'off', actionTimeout: 2_000, navigationTimeout: 2_000 },
    },
  ],
  webServer: {
    command: `pnpm --dir ../frontend build && pnpm --dir ../frontend preview --port ${GOLDBERRY_PORT} --strictPort`,
    url: `${GOLDBERRY_ORIGIN}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
