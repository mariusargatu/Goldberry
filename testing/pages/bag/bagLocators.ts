// The bag page. Pure: Bombadil bundles it.

import { items } from '../common/format.ts'

export const BAG = {
  main: 'main',
  line: '[data-testid="bag-line"]',
  /** A line's link to its piece: its href is piecePath + the piece's id. */
  piece: '[data-testid="bag-line-piece"]',
  piecePath: '/product/',
  quantity: '[data-testid="bag-line-quantity"]',
  remove: '[data-testid="bag-line-remove"]',
  subtotal: '[data-testid="bag-subtotal"]',
  checkOut: '[data-testid="check-out"]',
} as const

/** Only the model opens these; Bombadil's loose clicks keep off them. */
export const BAG_DOORS: readonly string[] = [BAG.checkOut]

export const BAG_COPY = {
  heading: 'Your bag',
  empty: 'Your bag is empty',
  checkOut: 'Check out',
} as const

export const subtotalLabel = (count: number): string =>
  `Subtotal (${items(count)})`
