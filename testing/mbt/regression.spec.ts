import type { Page } from '@playwright/test'
import {
  brokenText,
  consoleErrors,
  describeEvent,
  type ModelPath,
  type Snapshot,
  stateKeys,
  toStateString,
  waitForExpected,
} from '../core/index.ts'
import { readFacts } from '../pages/readFacts.ts'
import { bindShop, type ShopBinding } from './binding/index.ts'
import { regressionPaths } from './configurations.ts'
import { createShopMachine } from './model/shop.machine.ts'
import type { ShopEvent } from './model/shop.types.ts'
import { expect, type GoldberrySession, test } from './session.ts'

const SETTLE_TIMEOUT_MS = 5_000
const machine = createShopMachine()

function collectPageErrors(page: Page) {
  let logged: readonly string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') logged = [...logged, message.text()]
  })
  page.on('pageerror', (error) => {
    logged = [...logged, error.message]
  })
  return {
    sinceLastCheck(): string[] {
      const taken = logged
      logged = []
      return consoleErrors(
        taken.map((text) => ({ level: 'error', args: [text] })),
      )
    },
  }
}

type PageErrors = ReturnType<typeof collectPageErrors>

async function expectHealthyPage(page: Page, errors: PageErrors) {
  expect(errors.sinceLastCheck(), 'no console errors').toEqual([])
  expect(
    brokenText(await page.evaluate(() => document.body.innerText)),
    'page health',
  ).toEqual([])
}

async function expectState(
  page: Page,
  binding: ShopBinding,
  snapshot: Snapshot,
  errors: PageErrors,
) {
  const state = toStateString(snapshot.value)
  const shown = await waitForExpected(
    () => readFacts(page),
    binding.probes,
    snapshot,
    SETTLE_TIMEOUT_MS,
  )
  expect(shown, `the page shows ${state}`).toBe(true)
  for (const key of stateKeys(state)) await binding.states[key]?.(snapshot)
  await expectHealthyPage(page, errors)
}

async function act(binding: ShopBinding, event: ShopEvent, before: Snapshot) {
  const door = binding.events[event.type]
  if (door === undefined)
    throw new Error(`no page object handles ${event.type}`)
  await door(event, before)
}

async function walk(page: Page, goldberry: GoldberrySession, path: ModelPath) {
  const errors = collectPageErrors(page)
  const binding = bindShop(page, machine)
  await goldberry.open()
  await expectState(page, binding, path.initial, errors)
  let before = path.initial
  for (const { event, state } of path.steps) {
    await test.step(`${describeEvent(event)} → ${toStateString(state.value)}`, async () => {
      await act(binding, event as ShopEvent, before)
      await expectState(page, binding, state, errors)
    })
    before = state
  }
}

function titleOf(path: ModelPath, index: number, total: number): string {
  const opening = path.steps
    .slice(0, 3)
    .map((step) => describeEvent(step.event))
    .join(' → ')
  return `path ${index + 1}/${total}: ${opening} … (${path.steps.length} steps)`
}

const paths = regressionPaths(machine)

test.describe('coverage paths', () => {
  paths.forEach((path, index) => {
    test(titleOf(path, index, paths.length), ({ page, goldberry }) =>
      walk(page, goldberry, path),
    )
  })
})
