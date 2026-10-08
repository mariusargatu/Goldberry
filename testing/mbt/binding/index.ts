// The model bound to the pages: the screens that recognise its states, the
// page actions that do its events and the checks its states must pass. Both
// the regression and the exploration runner take it from here.
import type { Page } from '@playwright/test'
import {
  mergePages,
  type PageModule,
  type PageObject,
  type Snapshot,
  type StateCheck,
} from '../../core/index.ts'
import { shopPages } from '../../pages/index.ts'
import type { ShopFacts } from '../../pages/shopFacts.ts'
import type { ShopMachine } from '../model/shop.machine.ts'
import type { ShopEvent } from '../model/shop.types.ts'
import { shopChecks } from './checks.ts'
import { shopDoors } from './doors.ts'
import { isResting, screenProbes, stateNodes } from './screens.ts'

export type ShopBinding = PageModule<ShopFacts, Snapshot, ShopEvent>

function requireEveryStateChecked(
  machine: ShopMachine,
  checks: Readonly<Record<string, StateCheck>>,
): void {
  const checked = (path: readonly string[]) =>
    path.some((_, index) =>
      Object.hasOwn(checks, path.slice(0, index + 1).join('.')),
    )
  const unchecked = stateNodes(machine.root)
    .filter(isResting)
    .map((node) => node.path)
    .filter((path) => !checked(path))
    .map((path) => path.join('.'))
  if (unchecked.length > 0)
    throw new Error(`no check covers ${unchecked.join(', ')}`)
}

export function bindShop(page: Page, machine: ShopMachine): ShopBinding {
  const pages = shopPages(page)
  const checks = shopChecks(pages)
  requireEveryStateChecked(machine, checks)
  const bound = {
    states: checks,
    events: shopDoors(pages),
  } as PageObject<Snapshot, ShopEvent>
  return mergePages([bound], screenProbes(machine))
}
