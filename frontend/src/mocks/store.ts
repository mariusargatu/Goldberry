import type { FieldError, LineItemInput, Order } from '../api'
import { PRODUCTS, type ProductFixture } from './fixtures/products'

/**
 * In-memory mock database.
 * Stock resets on page reload; placed orders survive reloads (sessionStorage)
 * so the confirmation page can be refreshed.
 */

const ORDERS_STORAGE_KEY = 'goldberry.mock.orders'
const FIRST_ORDER_NUMBER = 100_042

export type ResolvedLine = { product: ProductFixture; quantity: number }

type LineResolution =
  { ok: true; lines: ResolvedLine[] } | { ok: false; errors: FieldError[] }

let stockLevels: ReadonlyMap<string, number> = new Map(
  PRODUCTS.map((product) => [product.id, product.stock]),
)

function loadMap<V>(storageKey: string): ReadonlyMap<string, V> {
  try {
    const raw = sessionStorage.getItem(storageKey)
    return new Map(raw ? (JSON.parse(raw) as [string, V][]) : [])
  } catch {
    return new Map()
  }
}

function persistMap<V>(storageKey: string, map: ReadonlyMap<string, V>): void {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify([...map]))
  } catch {
    // Storage unavailable (private mode, quota): state stays in memory only.
  }
}

let orders = loadMap<Order>(ORDERS_STORAGE_KEY)

function withCurrentStock(product: ProductFixture): ProductFixture {
  return { ...product, stock: stockLevels.get(product.id) ?? product.stock }
}

export function allProducts(): ProductFixture[] {
  return PRODUCTS.map(withCurrentStock)
}

export function findProduct(id: string): ProductFixture | undefined {
  const product = PRODUCTS.find((candidate) => candidate.id === id)
  return product ? withCurrentStock(product) : undefined
}

/** Looks up every line's product; unknown ids become field errors. */
export function resolveLines(items: readonly LineItemInput[]): LineResolution {
  const errors: FieldError[] = []
  const lines: ResolvedLine[] = []
  items.forEach((item, index) => {
    const product = findProduct(item.productId)
    if (product) {
      lines.push({ product, quantity: item.quantity })
    } else {
      errors.push({
        field: `items.${index}.productId`,
        message: 'Unknown product.',
      })
    }
  })
  return errors.length > 0 ? { ok: false, errors } : { ok: true, lines }
}

export function decrementStock(lines: readonly ResolvedLine[]): void {
  const next = new Map(stockLevels)
  lines.forEach(({ product, quantity }) => {
    next.set(product.id, (next.get(product.id) ?? 0) - quantity)
  })
  stockLevels = next
}

export function nextOrderNumber(): string {
  return `GB-${FIRST_ORDER_NUMBER + orders.size}`
}

export function saveOrder(order: Order): void {
  orders = new Map([...orders, [order.id, order]])
  persistMap(ORDERS_STORAGE_KEY, orders)
}

export function findOrder(id: string): Order | undefined {
  return orders.get(id)
}
