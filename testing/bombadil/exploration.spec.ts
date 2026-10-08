import type { Page } from '@playwright/test'
import { createModelRunner } from '../core/index.ts'
import { arrivalEvent, observedContext } from '../mbt/arrival.ts'
import { EXPLORATION_EVENTS } from '../mbt/configurations.ts'
import { shopAbstraction } from '../mbt/model/abstraction.ts'
import { createShopMachine } from '../mbt/model/shop.machine.ts'
import type { ShopContext } from '../mbt/model/shop.types.ts'
import type { ShopEvent } from '../mbt/model/shop.types.ts'
import { bindShop } from '../mbt/binding/index.ts'
import { readFacts } from '../pages/readFacts.ts'
import type { ShopFacts } from '../pages/shopFacts.ts'
import { test as base, DEMO, expect } from '../mbt/session.ts'
import { explore } from './explore.ts'
import { writeReport } from './report.ts'

const BASE_CDP_PORT = Number(process.env.EXPLORE_CDP_PORT ?? 9_500)
const TIME_LIMIT = process.env.EXPLORE_TIME_LIMIT ?? '90s'
const MODE = process.env.EXPLORE_MODE === 'plain' ? 'plain' : 'runner'
const MIN_STEPS = 20
const MAX_STALE_EVENTS = 3
const BOMBADIL_CALL_MS = 5_000
const DEMO_PAUSE_MS = 1_000
const DEMO_STEP_BUDGET_MS = BOMBADIL_CALL_MS - DEMO_PAUSE_MS - 1_000

const test = base.extend<object, { cdpPort: number }>({
  cdpPort: [
    async ({}, use, workerInfo) =>
      use(BASE_CDP_PORT + workerInfo.parallelIndex),
    { scope: 'worker' },
  ],
  launchOptions: [
    async ({ launchOptions, cdpPort }, use) =>
      use({
        ...launchOptions,
        args: [
          ...(launchOptions.args ?? []),
          `--remote-debugging-port=${cdpPort}`,
        ],
      }),
    { scope: 'worker' },
  ],
})

function runnerFor(page: Page) {
  return createModelRunner<ShopFacts, ShopEvent, ShopContext>({
    createMachine: (wrapGuard) => createShopMachine({ wrapGuard }),
    events: EXPLORATION_EVENTS,
    pages: bindShop(page, createShopMachine()),
    page,
    readFacts: () => readFacts(page),
    oracle: MODE === 'runner',
    arrive: arrivalEvent,
    observe: observedContext,
    coverage: shopAbstraction,
    ...(DEMO && { stepBudgetMs: DEMO_STEP_BUDGET_MS }),
  })
}

test(`Bombadil explores Goldberry (${MODE})`, async ({
  page,
  baseURL,
  goldberry,
  cdpPort,
}, testInfo) => {
  await goldberry.open()
  const outputPath = testInfo.outputPath('exploration')
  const result = await explore({
    page,
    cdpPort,
    origin: `${baseURL}/`,
    outputPath,
    runner: runnerFor(page),
    timeLimit: TIME_LIMIT,
    ...(DEMO && { pauseMs: DEMO_PAUSE_MS }),
  })
  const report = writeReport(outputPath, result, { mode: MODE })
  await testInfo.attach('exploration.txt', {
    body: report,
    contentType: 'text/plain',
  })
  if (MODE === 'runner') {
    expect(result.health.steps, report).toBeGreaterThanOrEqual(MIN_STEPS)
    expect(result.health.runnerErrors, report).toEqual([])
    expect(result.health.staleEvents, report).toBeLessThanOrEqual(
      MAX_STALE_EVENTS,
    )
  }
  expect(result.violations, report).toEqual([])
  expect(result.exitCode, report).toBe(0)
})
