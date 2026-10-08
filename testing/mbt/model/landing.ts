import { CATALOG } from './fixtures.ts'
import type { ShopContext } from './shop.types.ts'

export const LEAVES = [
  'home.ready',
  'product.inBag',
  'product.soldOut',
  'product.available',
  'bag.empty',
  'bag.filled',
  'checkout',
  'receipt.ready',
] as const

export type Leaf = (typeof LEAVES)[number]

type Location = Pick<ShopContext, 'url' | 'back'>

export const push = (location: Location, url: string): Location => ({
  url,
  back: [...location.back, location.url],
})

export function goBack(location: Location): Location {
  const previous = location.back.at(-1)
  if (previous === undefined) throw new Error('no history entry to go back to')
  return { url: previous, back: location.back.slice(0, -1) }
}

export const ORDER_UUID =
  /^\/order\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const pathOf = (url: string): string => url.split(/[?#]/)[0] ?? url

export const pieceOfLink = (link: `piece:${string}`): string =>
  link.slice('piece:'.length)

export const pieceOf = (url: string): string | null =>
  /^\/product\/([^/?#]+)$/.exec(pathOf(url))?.[1] ?? null

export function orderOf(url: string): number | null {
  const match = /^\/order\/(\d+)$/.exec(pathOf(url))
  return match === null ? null : Number(match[1])
}

/**
 * Whether the browser's path is the model's: the model numbers its receipts
 * (/order/0), the shop names them with a UUID.
 */
export const samePath = (expected: string, actual: string): boolean =>
  orderOf(expected) !== null ? ORDER_UUID.test(actual) : expected === actual

/** The page a URL shows, before the bag and stock decide its state. */
export type Family = 'home' | 'product' | 'bag' | 'checkout' | 'receipt'

/** The page a URL shows, or null for a URL the model has no page for. */
export function familyOf(raw: string): Family | null {
  const url = pathOf(raw)
  if (url === '/') return 'home'
  if (url === '/cart') return 'bag'
  if (url === '/checkout') return 'checkout'
  const piece = pieceOf(url)
  if (piece !== null)
    return CATALOG.some((known) => known.id === piece) ? 'product' : null
  if (orderOf(url) !== null || ORDER_UUID.test(url)) return 'receipt'
  return null
}

export function landing(
  context: Pick<ShopContext, 'bag' | 'stock'>,
  raw: string,
): { readonly leaf: Leaf; readonly url: string } | null {
  const url = pathOf(raw)
  const empty = context.bag.length === 0
  switch (familyOf(raw)) {
    case 'home':
      return { leaf: 'home.ready', url }
    case 'bag':
      return { leaf: empty ? 'bag.empty' : 'bag.filled', url }
    case 'checkout':
      return empty
        ? { leaf: 'bag.empty', url: '/cart' }
        : { leaf: 'checkout', url }
    case 'product': {
      const piece = pieceOf(url) ?? ''
      if (context.bag.some((line) => line.pieceId === piece))
        return { leaf: 'product.inBag', url }
      const soldOut = (context.stock[piece] ?? 0) === 0
      return { leaf: soldOut ? 'product.soldOut' : 'product.available', url }
    }
    case 'receipt':
      return { leaf: 'receipt.ready', url }
    case null:
      return null
  }
}
