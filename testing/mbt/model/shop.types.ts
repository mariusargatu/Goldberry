import type { BagLine, Prices } from './pricing.ts'

interface PlacedOrder {
  readonly bag: readonly BagLine[]
  readonly prices: Prices
  /** The receipt's real path (/order/<uuid>), once the page has shown it. */
  readonly path: string | null
}

export interface ShopContext {
  readonly bag: readonly BagLine[]
  readonly stock: Readonly<Record<string, number>>
  readonly justAdded: boolean
  readonly orders: readonly PlacedOrder[]
  readonly url: string
  readonly back: readonly string[]
  /** The page's document (performance.timeOrigin); a new one is a fresh page load. */
  readonly document: number | null
}

/** Where a loose action left the browser, as the page shows it. */
export interface Arrival {
  readonly url: string
  readonly back: readonly string[]
  readonly bag: readonly BagLine[]
  /** A new document: the mock server's stock starts over. */
  readonly fresh: boolean
}

export type LinkName = `piece:${string}` | 'view-bag' | 'check-out'

export type ShopEvent =
  | { readonly type: 'FOLLOW_LINK'; readonly data: LinkName }
  | { readonly type: 'ADD_TO_BAG'; readonly data: null }
  | { readonly type: 'SUBMIT_SHIPPING'; readonly data: null }
  | { readonly type: 'PLACE_ORDER'; readonly data: null }
  | { readonly type: 'BROWSER_BACK'; readonly data: null }
  | { readonly type: 'BROWSER_RELOAD'; readonly data: null }
  | { readonly type: 'ARRIVE'; readonly data: Arrival }
