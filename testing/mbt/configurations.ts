import { type ModelPath, transitionCoveragePaths } from '../core/index.ts'
import { shopAbstraction } from './model/abstraction.ts'
import type { ShopMachine } from './model/shop.machine.ts'
import type { ShopEvent } from './model/shop.types.ts'

type Door = Exclude<ShopEvent['type'], 'ARRIVE'>

type EventData = {
  readonly [K in Door]: readonly Extract<ShopEvent, { type: K }>['data'][]
}

const PIECE_OVER_FREE_SHIPPING = 'piece:kaiju-01-obsidian'
const PIECE_AT_LOW_STOCK = 'piece:gilded-rabbit'

const REGRESSION_DATA: EventData = {
  FOLLOW_LINK: [
    'piece:neon-oni',
    'piece:ceramic-ghost-no-3',
    'view-bag',
    'check-out',
  ],
  ADD_TO_BAG: [null],
  SUBMIT_SHIPPING: [null],
  PLACE_ORDER: [null],
  BROWSER_BACK: [null],
  BROWSER_RELOAD: [null],
}

const EXPLORATION_DATA: EventData = {
  ...REGRESSION_DATA,
  FOLLOW_LINK: [
    ...REGRESSION_DATA.FOLLOW_LINK,
    PIECE_OVER_FREE_SHIPPING,
    PIECE_AT_LOW_STOCK,
  ],
}

const eventsOf = (data: EventData): ShopEvent[] =>
  Object.entries(data).flatMap(([type, values]) =>
    values.map((value) => ({ type, data: value }) as ShopEvent),
  )

export const REGRESSION_EVENTS = eventsOf(REGRESSION_DATA)

export const EXPLORATION_EVENTS = eventsOf(EXPLORATION_DATA)

export const regressionPaths = (machine: ShopMachine): ModelPath[] =>
  transitionCoveragePaths(machine, REGRESSION_EVENTS, shopAbstraction)
